/**
 * Receives Calendly's real-time webhook for the Report + Counsellor tier's
 * self-serve booking (components/ConsultationScheduler.tsx's embedded
 * calendar). Needs a Calendly Standard-or-above plan to even create the
 * subscription (npm run calendly:subscribe) - on Free,
 * server/jobs/reminderSweep.ts's pollCalendlyBookings covers the same ground
 * by polling instead. Both call the exact same booking logic
 * (lib/calendly/bookingSync.ts), so upgrading the plan later needs no code
 * change, just running the subscribe script.
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
import { bookCall, cancelCall, rescheduleCall, type CalendlyInvitee } from "@/lib/calendly/bookingSync";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

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

interface CalendlyWebhookBody {
  event?: "invitee.created" | "invitee.canceled";
  payload?: CalendlyInvitee & { rescheduled?: boolean };
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
    if (body.event === "invitee.created") {
      await (body.payload.old_invitee ? rescheduleCall(body.payload) : bookCall(body.payload));
    } else if (body.event === "invitee.canceled") {
      if (body.payload.rescheduled) return; // the matching invitee.created with old_invitee handles it
      await cancelCall(body.payload.uri);
    }
  } catch (error) {
    console.error("[calendly webhook] handler failed", error);
  }
}
