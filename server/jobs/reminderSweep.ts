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

const HOUR_MS = 60 * 60 * 1000;

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

/** Never throws - a failed sweep just tries again at the next interval. */
export async function runReminderSweep(): Promise<void> {
  try {
    await sweep2Hour();
    await sweep24Hour();
    await sweep72Hour();
  } catch (error) {
    console.error("[reminders] sweep failed", error);
  }
}
