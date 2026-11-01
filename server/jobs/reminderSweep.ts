/**
 * Idle-session reminders - landing-page spec's delivery/follow-up rule:
 * nudge once at 2h, once at 24h, once at 72h, then stop. Runs as a periodic
 * sweep inside this same always-on process (see server/index.ts) rather than
 * a separate cron host - there's no serverless runtime for this backend, so
 * "always running" already means there's somewhere to put a scheduled check.
 *
 * "Idle" is measured from lastActivityAt, the same field deriveExposedStatus
 * already uses for TIMED_OUT - a session actively being answered keeps
 * bumping it, so it never reaches any threshold. A completed session is
 * excluded outright; there's nothing to remind it of.
 */

import { prisma } from "@/lib/db";
import { sendExamReminderMessage } from "@/lib/whatsapp/messages";
import {
  sendCounsellorOfferMessage,
  sendCounsellorReminderMessage,
  sendDeepDiveReminderMessage,
  sendReportOfferMessage,
  sendUpgradeOfferMessage,
} from "@/lib/whatsapp/journeyMessages";
import { paidTierLevel } from "@/lib/checkout/paidTierLevel";
import { upgradeCost } from "@/lib/pricing";

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

async function sweep2Hour(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      status: { not: "COMPLETED" },
      lastActivityAt: { lte: new Date(Date.now() - 2 * HOUR_MS) },
      reminder2hSentAt: null,
    },
    include: { parent: true, child: true },
  });
  for (const session of sessions) {
    await sendExamReminderMessage({
      parentMobile: session.parent.mobile,
      parentName: session.parent.name,
      childName: session.child.name,
      sessionToken: session.token,
    });
    await prisma.assessmentSession.update({
      where: { id: session.id },
      data: { reminder2hSentAt: new Date() },
    });
  }
}

async function sweep24Hour(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      status: { not: "COMPLETED" },
      lastActivityAt: { lte: new Date(Date.now() - 24 * HOUR_MS) },
      reminder24hSentAt: null,
    },
    include: { parent: true, child: true },
  });
  for (const session of sessions) {
    await sendExamReminderMessage({
      parentMobile: session.parent.mobile,
      parentName: session.parent.name,
      childName: session.child.name,
      sessionToken: session.token,
    });
    await prisma.assessmentSession.update({
      where: { id: session.id },
      data: { reminder24hSentAt: new Date() },
    });
  }
}

async function sweep72Hour(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      status: { not: "COMPLETED" },
      lastActivityAt: { lte: new Date(Date.now() - 72 * HOUR_MS) },
      reminder72hSentAt: null,
    },
    include: { parent: true, child: true },
  });
  for (const session of sessions) {
    await sendExamReminderMessage({
      parentMobile: session.parent.mobile,
      parentName: session.parent.name,
      childName: session.child.name,
      sessionToken: session.token,
    });
    await prisma.assessmentSession.update({
      where: { id: session.id },
      data: { reminder72hSentAt: new Date() },
    });
  }
}

/** 9am-8pm IST - new journey sends (report/upgrade/Deep-Dive/counsellor
 *  nudges) only ever go out in this window; anything due outside it waits for
 *  the next sweep run inside it. The older exam_link/exam_reminder sends
 *  above are untouched by this - they predate the rule and stay as they are. */
function isWithinIstBusinessHours(date: Date = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(date),
  ) % 24;
  return hour >= 9 && hour < 20;
}

/** 1h after a free test completes, if the Career Match Report still isn't owned. */
async function sweepReportOffer(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      completedAt: { not: null, lte: new Date(Date.now() - HOUR_MS) },
      OR: [{ purchasedTierLevel: null }, { purchasedTierLevel: { lt: 1 } }],
      whatsappMessages: { none: { template: "report_offer" } },
    },
    include: { parent: true, child: true },
  });
  for (const session of sessions) {
    void sendReportOfferMessage({
      sessionId: session.id,
      parentMobile: session.parent.mobile,
      parentName: session.parent.name,
      childName: session.child.name,
      sessionToken: session.token,
    });
  }
}

/** 1 day after a tier 1 unlock (paid or referral), if tier 3 still isn't owned. */
async function sweepUpgradeOffer(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      unlockedAt: { not: null, lte: new Date(Date.now() - 24 * HOUR_MS) },
      OR: [{ purchasedTierLevel: null }, { purchasedTierLevel: { lt: 3 } }],
      whatsappMessages: { none: { template: "upgrade_offer" } },
    },
    include: { parent: true, child: true },
  });
  for (const session of sessions) {
    const paidLevel = await paidTierLevel(session.id);
    void sendUpgradeOfferMessage({
      sessionId: session.id,
      parentMobile: session.parent.mobile,
      parentName: session.parent.name,
      childName: session.child.name,
      sessionToken: session.token,
      upgradePrice: upgradeCost(3, paidLevel),
    });
  }
}

/** Tier 3+, Deep-Dive not finished, idle 24h then 72h - same idle signal
 *  (lastActivityAt) as the exam reminders above. */
async function sweepDeepDiveReminder(): Promise<void> {
  for (const [key, idleMs] of [["24h", 24 * HOUR_MS], ["72h", 72 * HOUR_MS]] as const) {
    const sessions = await prisma.assessmentSession.findMany({
      where: {
        purchasedTierLevel: { gte: 3 },
        deepDiveCompletedAt: null,
        lastActivityAt: { lte: new Date(Date.now() - idleMs) },
        whatsappMessages: { none: { template: "deepdive_reminder", key } },
      },
      include: { parent: true, child: true },
    });
    for (const session of sessions) {
      void sendDeepDiveReminderMessage({
        sessionId: session.id,
        parentMobile: session.parent.mobile,
        parentName: session.parent.name,
        childName: session.child.name,
        sessionToken: session.token,
        key,
      });
    }
  }
}

/** 1 day after the Deep-Dive finishes, if tier 4 (Report + Counsellor) still isn't owned. */
async function sweepCounsellorOffer(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      deepDiveCompletedAt: { not: null, lte: new Date(Date.now() - 24 * HOUR_MS) },
      purchasedTierLevel: { not: 4 },
      whatsappMessages: { none: { template: "counsellor_offer" } },
    },
    include: { parent: true, child: true },
  });
  for (const session of sessions) {
    void sendCounsellorOfferMessage({
      sessionId: session.id,
      parentMobile: session.parent.mobile,
      parentName: session.parent.name,
      childName: session.child.name,
      sessionToken: session.token,
    });
  }
}

/** 2h before a booked counsellor call - this sweep's 15-minute cadence means
 *  a call's 2h mark falls inside exactly one run's lookahead window. */
async function sweepCounsellorReminder(): Promise<void> {
  const windowStart = new Date(Date.now() + 2 * HOUR_MS - 15 * MINUTE_MS);
  const windowEnd = new Date(Date.now() + 2 * HOUR_MS);
  const calls = await prisma.counsellorCall.findMany({
    where: { status: "SCHEDULED", scheduledAt: { gt: windowStart, lte: windowEnd } },
    include: { session: { include: { parent: true } } },
  });
  for (const call of calls) {
    void sendCounsellorReminderMessage({
      sessionId: call.sessionId,
      parentMobile: call.session.parent.mobile,
      parentName: call.session.parent.name,
      scheduledAt: call.scheduledAt,
    });
  }
}

/** Never throws - a failed sweep just tries again at the next interval. */
export async function runReminderSweep(): Promise<void> {
  try {
    await sweep2Hour();
    await sweep24Hour();
    await sweep72Hour();

    if (isWithinIstBusinessHours()) {
      await sweepReportOffer();
      await sweepUpgradeOffer();
      await sweepDeepDiveReminder();
      await sweepCounsellorOffer();
      await sweepCounsellorReminder();
    }
  } catch (error) {
    console.error("[reminders] sweep failed", error);
  }
}
