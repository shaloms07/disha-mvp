/**
 * Turning a Calendly invitee into a CounsellorCall - shared by two ways of
 * finding out about one:
 *  - server/routes/calendlyWebhook.ts, Calendly's real-time webhook (needs a
 *    Standard-or-above Calendly plan);
 *  - server/jobs/reminderSweep.ts's pollCalendlyBookings, which works on any
 *    plan (including Free) by asking the Calendly API directly instead of
 *    waiting for a push.
 * Both end up with the exact same CalendlyInvitee shape and call the same
 * three functions below, so a plan upgrade later is a one-line change
 * (running the subscribe script), not a rewrite.
 */

import { prisma } from "@/lib/db";
import { normalizeMobile } from "@/lib/validation";
import { sendCounsellorConfirmedMessage } from "@/lib/whatsapp/journeyMessages";

const PRISMA_UNIQUE_CONSTRAINT_ERROR = "P2002";

export interface CalendlyQuestionAndAnswer {
  question?: string;
  answer?: string;
  position?: number;
}

export interface CalendlyInvitee {
  uri: string;
  name?: string;
  email?: string;
  old_invitee?: string | null;
  reschedule_url?: string;
  tracking?: { utm_content?: string };
  questions_and_answers?: CalendlyQuestionAndAnswer[];
  scheduled_event?: {
    uri: string;
    start_time: string;
    location?: { join_url?: string };
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (error as { code?: string } | undefined)?.code === PRISMA_UNIQUE_CONSTRAINT_ERROR;
}

type SessionForBooking = {
  id: string;
  parent: { name: string; mobile: string };
  child: { name: string };
};

const SESSION_INCLUDE = { parent: { select: { name: true, mobile: true } }, child: { select: { name: true } } } as const;

/** payload.tracking.utm_content (the session token the website tags every
 *  booking with) first; a plain Calendly link with no tracking falls back to
 *  the "Parent's WhatsApp number" answer, matched to the most recent tier-4
 *  session with a finished Deep-Dive for that mobile. */
export async function findSessionForInvitee(payload: CalendlyInvitee): Promise<SessionForBooking | null> {
  const token = payload.tracking?.utm_content;
  if (token) {
    const session = await prisma.assessmentSession.findUnique({ where: { token }, include: SESSION_INCLUDE });
    if (session) return session;
  }

  const whatsAppAnswer = payload.questions_and_answers?.find((qa) => qa.position === 0)?.answer;
  if (whatsAppAnswer) {
    const mobile = normalizeMobile(whatsAppAnswer).slice(-10);
    const session = await prisma.assessmentSession.findFirst({
      where: { parent: { mobile }, purchasedTierLevel: 4, deepDiveCompletedAt: { not: null } },
      orderBy: { createdAt: "desc" },
      include: SESSION_INCLUDE,
    });
    if (session) return session;
  }

  console.warn(`[calendly] could not match invitee to a session: ${payload.name ?? "?"} <${payload.email ?? "?"}>`);
  return null;
}

/** A brand-new booking (no old_invitee) - creates the CounsellorCall and
 *  sends counsellor_confirmed once a Meet link is present. Idempotent on
 *  calendlyInviteeUri - a repeat delivery (webhook retry, or the poller
 *  seeing the same invitee twice) is a safe no-op. */
export async function bookCall(payload: CalendlyInvitee): Promise<void> {
  if (!payload.scheduled_event) return;

  const session = await findSessionForInvitee(payload);
  if (!session) return;

  const meetingLink = payload.scheduled_event.location?.join_url ?? "";
  const scheduledAt = new Date(payload.scheduled_event.start_time);

  let call;
  try {
    call = await prisma.counsellorCall.create({
      data: {
        sessionId: session.id,
        scheduledAt,
        meetingLink,
        calendlyInviteeUri: payload.uri,
        calendlyEventUri: payload.scheduled_event.uri,
        rescheduleUrl: payload.reschedule_url,
        notes: "Booked via Calendly",
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) return; // already booked - a concurrent webhook/poll, or a retry
    throw error;
  }

  // Google Meet links can arrive a few seconds after the event is scheduled -
  // server/jobs/reminderSweep.ts's sweepCalendlyMeetingLinks catches it up and
  // sends this same message once the link actually shows up.
  if (meetingLink) {
    void sendCounsellorConfirmedMessage({
      sessionId: session.id,
      parentMobile: session.parent.mobile,
      parentName: session.parent.name,
      childName: session.child.name,
      scheduledAt: call.scheduledAt,
      meetingLink: call.meetingLink,
    });
  }
}

/** payload.old_invitee set - updates that existing call in place rather than
 *  creating a second row, and re-sends counsellor_confirmed with the new
 *  details (sendCounsellorConfirmedMessage's key is scheduledAt+meetingLink,
 *  so a changed time or link always gets its own send). */
export async function rescheduleCall(payload: CalendlyInvitee): Promise<void> {
  const existing = await prisma.counsellorCall.findUnique({ where: { calendlyInviteeUri: payload.old_invitee ?? undefined } });
  if (!existing) {
    console.warn(`[calendly] reschedule for unknown invitee ${payload.old_invitee}`);
    return;
  }
  if (!payload.scheduled_event) return;

  const call = await prisma.counsellorCall.update({
    where: { id: existing.id },
    data: {
      scheduledAt: new Date(payload.scheduled_event.start_time),
      meetingLink: payload.scheduled_event.location?.join_url ?? "",
      calendlyInviteeUri: payload.uri,
      calendlyEventUri: payload.scheduled_event.uri,
      rescheduleUrl: payload.reschedule_url,
      status: "SCHEDULED",
    },
  });

  const session = await prisma.assessmentSession.findUnique({ where: { id: existing.sessionId }, include: SESSION_INCLUDE });
  if (!session || !call.meetingLink) return;
  void sendCounsellorConfirmedMessage({
    sessionId: session.id,
    parentMobile: session.parent.mobile,
    parentName: session.parent.name,
    childName: session.child.name,
    scheduledAt: call.scheduledAt,
    meetingLink: call.meetingLink,
  });
}

/** A plain cancellation (not a reschedule) - no WhatsApp message, Calendly
 *  emails the parent directly. */
export async function cancelCall(calendlyInviteeUri: string): Promise<void> {
  await prisma.counsellorCall
    .updateMany({ where: { calendlyInviteeUri }, data: { status: "CANCELLED" } })
    .catch((error) => console.error("[calendly] failed to cancel call", error));
}
