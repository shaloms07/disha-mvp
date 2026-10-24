/**
 * Razorpay's server-to-server webhook - the reliable source of truth for
 * "did this payment actually complete", independent of whether the paying
 * parent's browser ever makes it back to us (closed tab, dropped network,
 * etc. - see server/routes/checkout.ts's /verify route for the client-side
 * twin, and lib/checkout/markOrderPaid.ts for the idempotent logic both
 * converge on).
 *
 * Mounted in server/index.ts with express.raw() BEFORE the app-wide
 * express.json(), since Razorpay's signature is computed over the exact raw
 * request bytes - a JSON.parse() + re-stringify would not reliably reproduce
 * the same bytes, and the signature would fail to verify.
 */

import type { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { markOrderPaid } from "@/lib/checkout/markOrderPaid";

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
      };
    };
  };
}

export async function razorpayWebhookHandler(req: Request, res: Response): Promise<void> {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];

  if (!webhookSecret || typeof signature !== "string") {
    res.status(400).json({ error: "Webhook not configured" });
    return;
  }

  const rawBody = req.body as Buffer;
  const expectedSignature = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  if (!timingSafeEqualStrings(expectedSignature, signature)) {
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as RazorpayWebhookPayload;
  } catch {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  if (payload.event === "payment.captured") {
    const entity = payload.payload?.payment?.entity;
    if (entity?.order_id && entity.id) {
      try {
        await markOrderPaid(entity.order_id, entity.id);
      } catch (error) {
        console.error("[razorpay webhook] failed to mark order paid", error);
        // Still 200 - Razorpay retries on non-2xx, and a DB hiccup here isn't
        // something retrying the exact same webhook delivery will fix faster
        // than our own alerting would. Logged above for follow-up.
      }
    }
  }

  res.json({ received: true });
}
