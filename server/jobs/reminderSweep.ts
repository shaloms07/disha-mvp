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
import { isWithinMarketingHours } from "@/lib/whatsapp/journey";
import {
  sendCounsellorBookMessage,
  sendCounsellorConfirmedMessage,
  sendCounsellorOfferMessage,
  sendCounsellorReminderMessage,
  sendDeepDiveReminderMessage,
  sendDeepDiveUnlockMessage,
  sendReportOfferMessage,
  sendUpgradeOfferMessage,
} from "@/lib/whatsapp/journeyMessages";
import { paidAmount } from "@/lib/checkout/paidAmount";
import { priceAfterCredit } from "@/lib/pricing";
import { DEEP_DIVE_MODULES } from "@/lib/testModules";
import { bookCall, cancelCall, rescheduleCall, type CalendlyInvitee } from "@/lib/calendly/bookingSync";

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * HOUR_MS;

async function sweep2Hour(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      status: { not: "COMPLETED" },
      // Not yet 24h idle - past that, the 24h reminder is the one due, so a
      // session idle overnight doesn't get two reminders in the same run.
      lastActivityAt: { lte: new Date(Date.now() - 2 * HOUR_MS), gt: new Date(Date.now() - 24 * HOUR_MS) },
      reminder2hSentAt: null,
      // exam_reminder is a marketing template - never to a parent who opted out
      whatsappOptOutAt: null,
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
      lastActivityAt: { lte: new Date(Date.now() - 24 * HOUR_MS), gt: new Date(Date.now() - 72 * HOUR_MS) },
      reminder24hSentAt: null,
      whatsappOptOutAt: null,
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
      whatsappOptOutAt: null,
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


/** 1h after a free test completes, if the Career Match Report still isn't
 *  owned - capped at 7 days so switching the template on doesn't suddenly
 *  message everyone who finished long ago. */
async function sweepReportOffer(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      completedAt: { not: null, lte: new Date(Date.now() - HOUR_MS), gte: new Date(Date.now() - SEVEN_DAYS_MS) },
      OR: [{ purchasedTierLevel: null }, { purchasedTierLevel: { lt: 1 } }],
      // Finished the (free) Deep-Dive already - deepdive_unlock is the offer now.
      deepDiveCompletedAt: null,
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
      // Finished the (free) Deep-Dive already - deepdive_unlock is the offer now.
      deepDiveCompletedAt: null,
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

/** 1 day after the Complete Career Report is ready, for parents on that plan
 *  (tier 3, not Report + Counsellor). "Ready" is the later of the Deep-Dive
 *  finishing and the plan being paid for - the tests are free to take, so
 *  they may have been done days before the purchase. Capped at 7 days, same
 *  reason as sweepReportOffer above. */
async function sweepCounsellorOffer(): Promise<void> {
  const candidates = await prisma.assessmentSession.findMany({
    where: {
      deepDiveCompletedAt: { not: null, lte: new Date(Date.now() - 24 * HOUR_MS) },
      purchasedTierLevel: 3,
      whatsappMessages: { none: { template: "counsellor_offer" } },
    },
    include: {
      parent: true,
      child: true,
      orders: { where: { tierLevel: 3, status: "PAID" }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  const now = Date.now();
  const sessions = candidates.filter((session) => {
    const readyAt = Math.max(session.deepDiveCompletedAt!.getTime(), session.orders[0]?.updatedAt.getTime() ?? 0);
    return now - readyAt >= 24 * HOUR_MS && now - readyAt <= SEVEN_DAYS_MS;
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

/** deepdive_unlock is sent the moment the Deep-Dive finishes without a plan
 *  that includes its report (server/routes/session.ts) - unless that's
 *  outside 9:00-21:00 IST, when nothing is sent. This picks it up in the next
 *  run inside the window, re-checking that the report still isn't bought. */
async function sweepDeepDiveUnlock(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      deepDiveCompletedAt: { not: null, gte: new Date(Date.now() - SEVEN_DAYS_MS) },
      OR: [{ purchasedTierLevel: null }, { purchasedTierLevel: { lt: 2 } }],
      whatsappMessages: { none: { template: "deepdive_unlock" } },
    },
    include: { parent: true, child: true },
  });
  for (const session of sessions) {
    const paid = await paidAmount(session.id);
    void sendDeepDiveUnlockMessage({
      sessionId: session.id,
      parentMobile: session.parent.mobile,
      parentName: session.parent.name,
      childName: session.child.name,
      sessionToken: session.token,
      reportPrice: priceAfterCredit(3, paid),
    });
  }
}

/** Same for counsellor_book (Report + Counsellor paid and the report ready -
 *  sent at that moment by session.ts / markOrderPaid.ts when inside the
 *  window). Skipped once a call is booked: the calendar on /results doesn't
 *  wait for this message. */
async function sweepCounsellorBook(): Promise<void> {
  const sessions = await prisma.assessmentSession.findMany({
    where: {
      deepDiveCompletedAt: { not: null },
      purchasedTierLevel: 4,
      counsellorCalls: { none: {} },
      whatsappMessages: { none: { template: "counsellor_book" } },
    },
    include: { parent: true, child: true },
  });
  for (const session of sessions) {
    void sendCounsellorBookMessage({
      sessionId: session.id,
      parentMobile: session.parent.mobile,
      parentName: session.parent.name,
      childName: session.child.name,
      sessionToken: session.token,
    });
  }
}

/** 2h before a booked counsellor call - this sweep's 15-minute cadence means
 *  a call's 2h mark falls inside exactly one run's lookahead window. Runs
 *  regardless of the 9am-9pm IST window (unlike every other timed send
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

interface CalendlyApiEvent {
  uri: string;
  start_time: string;
  location?: { join_url?: string };
}

async function calendlyApiGet(path: string, apiToken: string): Promise<any> {
  const url = path.startsWith("http") ? path : `https://api.calendly.com${path}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
  if (!response.ok) throw new Error(`Calendly API ${path} -> ${response.status}`);
  return response.json();
}

let cachedCalendlyIdentity: { userUri: string; organizationUri: string } | null = null;
async function calendlyIdentity(apiToken: string): Promise<{ userUri: string; organizationUri: string }> {
  if (cachedCalendlyIdentity) return cachedCalendlyIdentity;
  const me = await calendlyApiGet("/users/me", apiToken);
  cachedCalendlyIdentity = { userUri: me.resource.uri, organizationUri: me.resource.current_organization };
  return cachedCalendlyIdentity;
}

/** Calendly's real-time webhook (server/routes/calendlyWebhook.ts) needs a
 *  Standard-or-above plan to even subscribe - this polls the Calendly API
 *  directly instead, so booking still works on a Free account. A booking can
 *  take up to one sweep interval (15 min) to show up here; that's the
 *  accepted trade-off. No-op entirely when Calendly isn't configured; safe
 *  to leave running even once a real webhook subscription exists later
 *  (lib/calendly/bookingSync.ts's functions are idempotent either way). */
async function pollCalendlyBookings(): Promise<void> {
  const apiToken = process.env.CALENDLY_API_TOKEN;
  if (!apiToken) return;

  try {
    const { userUri, organizationUri } = await calendlyIdentity(apiToken);
    const minStart = new Date(Date.now() - 24 * HOUR_MS).toISOString();
    const maxStart = new Date(Date.now() + 30 * 24 * HOUR_MS).toISOString();
    const events = await calendlyApiGet(
      `/scheduled_events?organization=${encodeURIComponent(organizationUri)}&user=${encodeURIComponent(userUri)}` +
        `&status=active&min_start_time=${minStart}&max_start_time=${maxStart}&count=100&sort=start_time:asc`,
      apiToken,
    );

    for (const event of (events.collection ?? []) as CalendlyApiEvent[]) {
      const invitees = await calendlyApiGet(`${event.uri}/invitees?status=active&count=100`, apiToken);
      for (const invitee of (invitees.collection ?? []) as CalendlyInvitee[]) {
        const already = await prisma.counsellorCall.findUnique({ where: { calendlyInviteeUri: invitee.uri } });
        if (already) continue;

        const fullInvitee: CalendlyInvitee = {
          ...invitee,
          scheduled_event: { uri: event.uri, start_time: event.start_time, location: event.location },
        };
        await (fullInvitee.old_invitee ? rescheduleCall(fullInvitee) : bookCall(fullInvitee));
      }
    }

    // A call we already have on record, checked directly for a cancellation -
    // a reschedule's new booking is caught by the events scan above instead,
    // once its new time falls inside the lookahead window.
    const pending = await prisma.counsellorCall.findMany({
      where: { status: "SCHEDULED", calendlyInviteeUri: { not: null }, scheduledAt: { gt: new Date() } },
      select: { calendlyInviteeUri: true },
    });
    for (const call of pending) {
      const invitee = await calendlyApiGet(call.calendlyInviteeUri as string, apiToken).catch(() => null);
      if (invitee?.resource?.status === "canceled" && !invitee.resource.rescheduled) {
        await cancelCall(call.calendlyInviteeUri as string);
      }
    }
  } catch (error) {
    console.error("[reminders] Calendly poll failed", error);
  }
}

/** Google Meet links can arrive a few seconds after Calendly schedules the
 *  event - a SCHEDULED, Calendly-booked call with no link yet (created in the
 *  last 24h, so an old admin-booked "" link is never touched) gets one more
 *  look via the Calendly API before giving up and leaving it for the admin
 *  team to fix by hand. Runs outside the 9am-9pm IST window, same as
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
    // Every marketing template (exam_reminder included) goes out 9:00-21:00
    // IST only (lib/whatsapp/journey.ts's isWithinMarketingHours); anything
    // due outside it waits for the next run inside it.
    if (isWithinMarketingHours()) {
      await sweep2Hour();
      await sweep24Hour();
      await sweep72Hour();
      await sweepReportOffer();
      await sweepUpgradeOffer();
      await sweepDeepDiveReminder();
      await sweepCounsellorOffer();
      await sweepDeepDiveUnlock();
      await sweepCounsellorBook();
    }
    // Outside the business-hours gate above on purpose - see its own comment.
    await sweepCounsellorReminder();
    await pollCalendlyBookings();
    await sweepCalendlyMeetingLinks();
  } catch (error) {
    console.error("[reminders] sweep failed", error);
  }
}
