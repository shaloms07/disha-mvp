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
  sendCounsellorConfirmedMessage,
  sendCounsellorOfferMessage,
  sendCounsellorReminderMessage,
  sendDeepDiveReminderMessage,
  sendReportOfferMessage,
  sendUpgradeOfferMessage,
} from "@/lib/whatsapp/journeyMessages";
import { paidAmount } from "@/lib/checkout/paidAmount";
import { priceAfterCredit } from "@/lib/pricing";
import { DEEP_DIVE_MODULES } from "@/lib/testModules";

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * HOUR_MS;

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

/** 1h after a free test completes, if the Career Match Report still isn't
 *  owned - capped at 7 days so switching the template on doesn't suddenly
 *  message everyone who finished long ago. */
async function sweepReportOffer(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      completedAt: { not: null, lte: new Date(Date.now() - HOUR_MS), gte: new Date(Date.now() - SEVEN_DAYS_MS) },
      OR: [{ purchasedTierLevel: null }, { purchasedTierLevel: { lt: 1 } }],
      whatsappMessages: { none: { template: "report_offer" } },
    },
    include: { parent: true, child: true },
  });
  for (const session of sessions) {
    const paid = await paidAmount(session.id);
    void sendReportOfferMessage({
      sessionId: session.id,
      parentMobile: session.parent.mobile,
      parentName: session.parent.name,
      childName: session.child.name,
      sessionToken: session.token,
      reportPrice: priceAfterCredit(1, paid),
    });
  }
}

/** 1 day after a tier 1 unlock (paid or referral), if tier 3 still isn't
 *  owned - capped at 7 days, same reason as sweepReportOffer above. */
async function sweepUpgradeOffer(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      unlockedAt: { not: null, lte: new Date(Date.now() - 24 * HOUR_MS), gte: new Date(Date.now() - SEVEN_DAYS_MS) },
      OR: [{ purchasedTierLevel: null }, { purchasedTierLevel: { lt: 3 } }],
      whatsappMessages: { none: { template: "upgrade_offer" } },
    },
    include: { parent: true, child: true },
  });
  for (const session of sessions) {
    const paid = await paidAmount(session.id);
    void sendUpgradeOfferMessage({
      sessionId: session.id,
      parentMobile: session.parent.mobile,
      parentName: session.parent.name,
      childName: session.child.name,
      sessionToken: session.token,
      completeReportPrice: priceAfterCredit(3, paid),
      counsellorPrice: priceAfterCredit(4, paid),
    });
  }
}

/** Tier 3+, Deep-Dive not finished. Idle time is measured from the LATER of
 *  lastActivityAt and the most recent tier-3/4 PAID order's updatedAt - a
 *  parent who bought the upgrade days after the free test shouldn't have
 *  their idle clock already reading 72h+ from a free test they finished long
 *  ago. The 72h nudge additionally waits until the 24h one actually went out
 *  at least 48h earlier, instead of firing both in the same sweep. */
async function sweepDeepDiveReminder(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      purchasedTierLevel: { gte: 3 },
      deepDiveCompletedAt: null,
    },
    include: {
      parent: true,
      child: true,
      orders: { where: { tierLevel: { gte: 3 }, status: "PAID" }, orderBy: { updatedAt: "desc" }, take: 1 },
      whatsappMessages: { where: { template: "deepdive_reminder" } },
    },
  });

  const now = Date.now();
  for (const session of sessions) {
    const baseTime = Math.max(session.lastActivityAt.getTime(), session.orders[0]?.updatedAt.getTime() ?? 0);
    const idleMs = now - baseTime;
    const sent24h = session.whatsappMessages.find((m) => m.key === "24h");
    const sent72h = session.whatsappMessages.find((m) => m.key === "72h");

    let key: "24h" | "72h" | undefined;
    if (!sent24h && idleMs >= 24 * HOUR_MS) {
      key = "24h";
    } else if (sent24h && !sent72h && idleMs >= 72 * HOUR_MS && now - sent24h.createdAt.getTime() >= 48 * HOUR_MS) {
      key = "72h";
    }
    if (!key) continue;

    const testsDone = DEEP_DIVE_MODULES.filter((m) => Boolean((session.moduleScores as Record<string, unknown>)[m.scoresKey])).length;
    void sendDeepDiveReminderMessage({
      sessionId: session.id,
      parentMobile: session.parent.mobile,
      parentName: session.parent.name,
      childName: session.child.name,
      sessionToken: session.token,
      key,
      testsDone,
    });
  }
}

/** 1 day after the Deep-Dive finishes, if tier 4 (Report + Counsellor) still
 *  isn't owned - capped at 7 days, same reason as sweepReportOffer above. */
async function sweepCounsellorOffer(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      deepDiveCompletedAt: {
        not: null,
        lte: new Date(Date.now() - 24 * HOUR_MS),
        gte: new Date(Date.now() - SEVEN_DAYS_MS),
      },
      purchasedTierLevel: { not: 4 },
      whatsappMessages: { none: { template: "counsellor_offer" } },
    },
    include: { parent: true, child: true },
  });
  for (const session of sessions) {
    const paid = await paidAmount(session.id);
    void sendCounsellorOfferMessage({
      sessionId: session.id,
      parentMobile: session.parent.mobile,
      parentName: session.parent.name,
      childName: session.child.name,
      sessionToken: session.token,
      counsellorPrice: priceAfterCredit(4, paid),
    });
  }
}

/** 2h before a booked counsellor call - this sweep's 15-minute cadence means
 *  a call's 2h mark falls inside exactly one run's lookahead window. Runs
 *  regardless of the 9am-8pm IST window (unlike every other timed send
 *  above): it's a reminder for a call the parent already booked, so a 9am
 *  call still needs its reminder at 7am. */
async function sweepCounsellorReminder(): Promise<void> {
  const windowStart = new Date(Date.now() + 2 * HOUR_MS - 15 * MINUTE_MS);
  const windowEnd = new Date(Date.now() + 2 * HOUR_MS);
  const calls = await prisma.counsellorCall.findMany({
    where: { status: "SCHEDULED", scheduledAt: { gt: windowStart, lte: windowEnd } },
    include: { session: { include: { parent: true, child: true } } },
  });
  for (const call of calls) {
    void sendCounsellorReminderMessage({
      sessionId: call.sessionId,
      parentMobile: call.session.parent.mobile,
      parentName: call.session.parent.name,
      childName: call.session.child.name,
      scheduledAt: call.scheduledAt,
      meetingLink: call.meetingLink,
    });
  }
}

/** Google Meet links can arrive a few seconds after Calendly schedules the
 *  event - a SCHEDULED, Calendly-booked call with no link yet (created in the
 *  last 24h, so an old admin-booked "" link is never touched) gets one more
 *  look via the Calendly API before giving up and leaving it for the admin
 *  team to fix by hand. Runs outside the 9am-8pm IST window, same as
 *  sweepCounsellorReminder - a parent shouldn't wait till 9am for a link that
 *  showed up at 2am. No-op entirely when Calendly isn't configured. */
async function sweepCalendlyMeetingLinks(): Promise<void> {
  const apiToken = process.env.CALENDLY_API_TOKEN;
  if (!apiToken) return;

  const calls = await prisma.counsellorCall.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { gt: new Date() },
      meetingLink: "",
      calendlyEventUri: { not: null },
      createdAt: { gte: new Date(Date.now() - 24 * HOUR_MS) },
    },
    include: { session: { include: { parent: true, child: true } } },
  });

  for (const call of calls) {
    const response = await fetch(call.calendlyEventUri as string, {
      headers: { Authorization: `Bearer ${apiToken}` },
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as
      | { resource?: { location?: { join_url?: string } } }
      | null;
    const joinUrl = body?.resource?.location?.join_url;

    if (joinUrl) {
      await prisma.counsellorCall.update({ where: { id: call.id }, data: { meetingLink: joinUrl } });
      void sendCounsellorConfirmedMessage({
        sessionId: call.sessionId,
        parentMobile: call.session.parent.mobile,
        parentName: call.session.parent.name,
        childName: call.session.child.name,
        scheduledAt: call.scheduledAt,
        meetingLink: joinUrl,
      });
    } else if (Date.now() - call.createdAt.getTime() > 30 * MINUTE_MS) {
      console.warn(`[reminders] counsellor call ${call.id} still has no Meet link after 30 minutes`);
    }
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
    }
    // Outside the business-hours gate above on purpose - see its own comment.
    await sweepCounsellorReminder();
    await sweepCalendlyMeetingLinks();
  } catch (error) {
    console.error("[reminders] sweep failed", error);
  }
}
