/**
 * Real payment via Razorpay, replacing lib/mockApi.ts's mockCheckout. The
 * amount charged is always recomputed here from lib/pricing.ts's own
 * TIER_OPTIONS - never trusted from the client, so a tampered request can't
 * pay ₹1 for a ₹1,999 plan. A session's actual purchased tier is only ever
 * set from a verified payment signature (below) or the Razorpay webhook
 * (server/routes/razorpayWebhook.ts) - never from anything sessionStorage
 * alone claims.
 */

import { Router } from "express";
import { z } from "zod";
import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { TIER_OPTIONS } from "@/lib/pricing";
import { markOrderPaid } from "@/lib/checkout/markOrderPaid";

export const checkoutRouter = Router();

function razorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET must both be set.");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/** Constant-time string compare, tolerant of mismatched lengths. */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

const TIER_LEVEL_SCHEMA = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const CREATE_ORDER_SCHEMA = z.object({ tierLevel: TIER_LEVEL_SCHEMA });

checkoutRouter.post("/session/:token/checkout/create-order", async (req, res) => {
  const parsed = CREATE_ORDER_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const session = await prisma.assessmentSession.findUnique({
    where: { token: req.params.token },
    select: { id: true },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const option = TIER_OPTIONS.find((t) => t.level === parsed.data.tierLevel);
  if (!option) {
    res.status(400).json({ error: "Invalid tier" });
    return;
  }

  // Razorpay amounts are in paise.
  const amount = option.total * 100;

  let razorpayOrder: { id: string };
  try {
    razorpayOrder = await razorpayClient().orders.create({
      amount,
      currency: "INR",
      receipt: `${req.params.token}-${option.level}-${Date.now()}`,
      notes: { sessionToken: req.params.token, tierLevel: String(option.level) },
    });
  } catch (error) {
    console.error("[checkout] razorpay order creation failed", error);
    res.status(502).json({ error: "Could not start checkout. Please try again." });
    return;
  }

  await prisma.order.create({
    data: {
      sessionId: session.id,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency: "INR",
      tierLevel: option.level,
    },
  });

  res.json({
    razorpayOrderId: razorpayOrder.id,
    amount,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

const VERIFY_SCHEMA = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

/**
 * Fires from Razorpay Checkout's client-side success callback - instant UX,
 * but deliberately NOT the only path to "paid": the webhook
 * (server/routes/razorpayWebhook.ts) covers a parent who closes the tab right
 * after paying, before this request ever reaches us. Both converge on the
 * same idempotent markOrderPaid().
 */
checkoutRouter.post("/session/:token/checkout/verify", async (req, res) => {
  const parsed = VERIFY_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    res.status(500).json({ error: "Checkout is not configured." });
    return;
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
  // Razorpay's documented signature formula for a successful checkout.
  const expectedSignature = createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!timingSafeEqualStrings(expectedSignature, razorpay_signature)) {
    res.status(400).json({ error: "Payment could not be verified." });
    return;
  }

  const order = await markOrderPaid(razorpay_order_id, razorpay_payment_id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json({ verified: true, tierLevel: order.tierLevel });
});
