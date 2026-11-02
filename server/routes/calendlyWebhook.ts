/**
 * Receives Calendly's webhook for the Report + Counsellor tier's self-serve
 * booking (components/ConsultationScheduler.tsx's embedded calendar). An
 * `invitee.created` records the CounsellorCall and sends counsellor_confirmed;
 * `invitee.canceled` marks it CANCELLED (unless it's actually a reschedule,
 * which the matching invitee.created with old_invitee handles instead).
 *
 * Mounted in server/index.ts with express.raw() BEFORE the app-wide
 * express.json(), same reason as server/routes/razorpayWebhook.ts: the
 * signature is computed over the exact raw request bytes.
 *
 * Only registered at all when both CALENDLY_API_TOKEN and
 * CALENDLY_WEBHOOK_SIGNING_KEY are set (server/index.ts) - empty means the
 * feature is off, admin-page booking (server/routes/admin.ts) is unaffected.
 */

import type { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { normalizeMobile } from "@/lib/validation";
import { sendCounsellorConfirmedMessage } from "@/lib/whatsapp/journeyMessages";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const PRISMA_UNIQUE_CONSTRAINT_ERROR = "P2002";

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** "t=1730000000,v1=<hex>" -> { t, v1 } */
function parseSignatureHeader(header: string): { t: string; v1: string } | null {
  const parts: Record<string, string> = {};
  for (const pair of header.split(",")) {
    const [key, value] = pair.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  }
  return parts.t && parts.v1 ? { t: parts.t, v1: parts.v1 } : null;
}

interface CalendlyQuestionAndAnswer {
  question?: string;
  answer?: string;
  position?: number;
}

interface CalendlyInvitee {
  uri: string;
  name?: string;
  email?: string;
  old_invitee?: string;
  rescheduled?: boolean;
  reschedule_url?: string;
  tracking?: { utm_content?: string };
  questions_and_answers?: CalendlyQuestionAndAnswer[];
  scheduled_event?: {
    uri: string;
    start_time: string;
    location?: { join_url?: string };
  };
}

interface CalendlyWebhookBody {
  event?: "invitee.created" | "invitee.canceled";
  payload?: CalendlyInvitee;
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
async function findSessionForInvitee(payload: CalendlyInvitee): Promise<SessionForBooking | null> {
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

  console.warn(`[calendly webhook] could not match invitee to a session: ${payload.name ?? "?"} <${payload.email ?? "?"}>`);
  return null;
}

async function handleReschedule(payload: CalendlyInvitee): Promise<void> {
  const existing = await prisma.counsellorCall.findUnique({ where: { calendlyInviteeUri: payload.old_invitee } });
  if (!existing) {
    console.warn(`[calendly webhook] reschedule for unknown invitee ${payload.old_invitee}`);
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
      // Reset - the rescheduled time gets its own 2h-before reminder, not the
      // old time's (server/jobs/reminderSweep.ts's sweepCounsellorReminder
      // keys off scheduledAt, so this is implicit, but kept explicit here for
      // the common case where reschedule only changes the link).
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

async function handleInviteeCreated(payload: CalendlyInvitee): Promise<void> {
  if (payload.old_invitee) {
    await handleReschedule(payload);
    return;
  }
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
    if (isUniqueConstraintError(error)) return; // already booked by a concurrent delivery
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

async function handleInviteeCanceled(payload: CalendlyInvitee): Promise<void> {
  if (payload.rescheduled) return; // the matching invitee.created with old_invitee handles this
  await prisma.counsellorCall
    .updateMany({ where: { calendlyInviteeUri: payload.uri }, data: { status: "CANCELLED" } })
    .catch((error) => console.error("[calendly webhook] failed to cancel call", error));
}

export async function calendlyWebhookHandler(req: Request, res: Response): Promise<void> {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  const signatureHeader = req.headers["calendly-webhook-signature"];
  const rawBody = req.body as Buffer;

  if (!signingKey || typeof signatureHeader !== "string") {
    res.sendStatus(401);
    return;
  }

  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) {
    res.sendStatus(401);
    return;
  }

  const ageMs = Math.abs(Date.now() - Number(parsed.t) * 1000);
  if (!Number.isFinite(ageMs) || ageMs > FIVE_MINUTES_MS) {
    res.sendStatus(401);
    return;
  }

  const expected = createHmac("sha256", signingKey).update(`${parsed.t}.${rawBody}`).digest("hex");
  if (!timingSafeEqualStrings(expected, parsed.v1)) {
    res.sendStatus(401);
    return;
  }

  // Verified - ack quickly, same reason as server/routes/whatsappWebhook.ts:
  // Calendly retries aggressively on anything other than a prompt 2xx.
  res.sendStatus(200);

  let body: CalendlyWebhookBody;
  try {
    body = JSON.parse(rawBody.toString("utf8")) as CalendlyWebhookBody;
  } catch {
    return;
  }
  if (!body.payload) return;

  try {
    if (body.event === "invitee.created") await handleInviteeCreated(body.payload);
    else if (body.event === "invitee.canceled") await handleInviteeCanceled(body.payload);
  } catch (error) {
    console.error("[calendly webhook] handler failed", error);
  }
}
