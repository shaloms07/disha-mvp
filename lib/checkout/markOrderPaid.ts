/**
 * The one place an Order (and the session it belongs to) actually gets
 * marked as paid - called from both the client-callback verify route
 * (server/routes/checkout.ts, for instant UX) and the Razorpay webhook
 * (server/routes/razorpayWebhook.ts, the reliable server-to-server fallback
 * if the browser never completes that round trip). Idempotent: a webhook
 * that arrives twice, or arrives after the client already verified the same
 * payment, is a safe no-op the second time.
 */

import { prisma } from "@/lib/db";
import {
  sendCounsellorBookMessage,
  sendFullReportReadyMessage,
  sendPaymentReceivedMessage,
  sendReportPaidMessage,
} from "@/lib/whatsapp/journeyMessages";
import { sendCapiEvent } from "@/lib/meta/capi";
import { TIER_OPTIONS } from "@/lib/pricing";
import { planKeyForLevel, type ServerFunnelEventName } from "@/lib/funnelEvents";
import type { RiasecType } from "@/types";

export async function markOrderPaid(razorpayOrderId: string, razorpayPaymentId: string) {
  const order = await prisma.order.findUnique({ where: { razorpayOrderId } });
  if (!order) return null;
  if (order.status === "PAID") return order;

  const session = await prisma.assessmentSession.findUnique({
    where: { id: order.sessionId },
    select: { unlockedVia: true, purchasedTierLevel: true },
  });

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID", razorpayPaymentId },
    }),
    // Never downgrade - a later, smaller top-up order should never erase a
    // higher tier already paid for.
    prisma.assessmentSession.updateMany({
      where: {
        id: order.sessionId,
        OR: [{ purchasedTierLevel: null }, { purchasedTierLevel: { lt: order.tierLevel } }],
      },
      data: {
        purchasedTierLevel: order.tierLevel,
        // A payment is the "real" unlock reason even if a free referral
        // unlock (tier 1) happened first - but never overwrite an existing one.
        ...(session?.unlockedVia ? {} : { unlockedVia: "PAYMENT", unlockedAt: new Date() }),
      },
    }),
  ]);

  void sendPaymentWhatsAppMessage(updatedOrder, session?.purchasedTierLevel ?? 0);

  // The funnel's payment_success (/admin/funnel) - from the verified payment,
  // once (the PAID check above returns early on a repeat).
  void recordPaymentSuccess(order.sessionId, order.tierLevel, order.amount / 100);

  return updatedOrder;
}

/**
 * A funnel event only the server may record (lib/funnelEvents.ts's
 * SERVER_FUNNEL_EVENTS). Fire-and-forget and best-effort: a failure here
 * must never affect a payment, an order or a callback request. The class
 * comes from the database; the viewer and A/B variant, when not given, are
 * copied from the session's latest order event (what the page said then).
 */
export function recordServerFunnelEvent(
  sessionId: string,
  name: ServerFunnelEventName,
  extra: { tierLevel?: number; amount?: number; deviceRole?: string; variant?: string } = {},
): void {
  void (async () => {
    try {
      const [session, lastOrderEvent] = await Promise.all([
        prisma.assessmentSession.findUnique({ where: { id: sessionId }, select: { child: { select: { grade: true } } } }),
        extra.deviceRole
          ? Promise.resolve(null)
          : prisma.funnelEvent.findFirst({
              where: { sessionId, name: "razorpay_order_created" },
              orderBy: { createdAt: "desc" },
              select: { deviceRole: true, variant: true },
            }),
      ]);
      await prisma.funnelEvent.create({
        data: {
          sessionId,
          name,
          plan: extra.tierLevel ? planKeyForLevel(extra.tierLevel) : undefined,
          amount: extra.amount,
          deviceRole: extra.deviceRole ?? lastOrderEvent?.deviceRole ?? undefined,
          variant: extra.variant ?? lastOrderEvent?.variant ?? undefined,
          childClass: session?.child.grade,
        },
      });
    } catch (error) {
      console.error(`[funnel] ${name} not recorded`, error);
    }
  })();
}

/** payment_success, and callback_paid_48h when a free callback was requested
 *  in the 48 hours before - that request is then marked paid. */
async function recordPaymentSuccess(sessionId: string, tierLevel: number, amount: number): Promise<void> {
  recordServerFunnelEvent(sessionId, "payment_success", { tierLevel, amount });
  try {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const callback = await prisma.callbackRequest.findFirst({
      where: { sessionId, requestedAt: { gte: since }, status: { not: "paid" } },
      orderBy: { requestedAt: "desc" },
      select: { id: true },
    });
    if (callback) {
      await prisma.callbackRequest.update({ where: { id: callback.id }, data: { status: "paid" } });
      recordServerFunnelEvent(sessionId, "callback_paid_48h", { tierLevel, amount, deviceRole: "parent" });
    }
  } catch (error) {
    console.error("[funnel] callback_paid_48h not recorded", error);
  }
}

async function sendPaymentWhatsAppMessage(
  order: {
    id: string;
    sessionId: string;
    tierLevel: number;
    amount: number;
    currency: string;
    razorpayOrderId: string;
    razorpayPaymentId: string | null;
  },
  /** The tier owned before this payment */
  ownedBefore: number,
): Promise<void> {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: order.sessionId },
    select: {
      token: true,
      scores: true,
      deepDiveCompletedAt: true,
      parent: { select: { name: true, mobile: true } },
      child: { select: { name: true } },
    },
  });
  if (!session) return;

  // Reliable half of ad-spend tracking - fires here (server-side, every
  // payment, regardless of ad blockers or a closed tab) rather than only
  // from the browser's own fbq call. Same event_id as that browser call
  // (app/results/page.tsx, app/pricing/page.tsx) so Meta counts the pair once.
  void sendCapiEvent({
    eventName: "Purchase",
    mobile: session.parent.mobile,
    eventId: `purchase_${order.razorpayOrderId}`,
    customData: {
      value: order.amount / 100,
      currency: order.currency,
      content_name: TIER_OPTIONS.find((t) => t.level === order.tierLevel)?.name,
    },
  });

  const base = {
    sessionId: order.sessionId,
    parentMobile: session.parent.mobile,
    parentName: session.parent.name,
    childName: session.child.name,
    sessionToken: session.token,
  };
  const amountPaid = order.amount / 100;
  const razorpayPaymentId = order.razorpayPaymentId ?? "";

  if (order.tierLevel === 1) {
    if (!session.scores) return; // shouldn't happen - tier 1 requires a completed free test
    void sendReportPaidMessage({
      ...base,
      orderId: order.id,
      amountPaid,
      razorpayPaymentId,
      scores: session.scores as Record<RiasecType, number>,
    });
  } else {
    // payment_received's {{4}} reads "...for Rohan's <plan>". Adding the
    // counsellor to a Complete Career Report already owned buys just the
    // call, so it's named as that rather than the whole plan.
    const planName =
      order.tierLevel === 4 && ownedBefore >= 3
        ? "counsellor call"
        : (TIER_OPTIONS.find((t) => t.level === order.tierLevel)?.name ?? "your plan");
    // Awaited so the receipt lands before "report ready" below.
    await sendPaymentReceivedMessage({ ...base, orderId: order.id, amountPaid, planName, razorpayPaymentId });

    // The Deep-Dive is free to take, so it may already be finished when the
    // plan that includes it is bought - the report is ready this moment, and
    // nothing else will say so (server/routes/session.ts only sends these at
    // completion when the plan was already owned). Both are once-per-session
    // sends (lib/whatsapp/journey.ts), so an earlier one is never repeated.
    if (session.deepDiveCompletedAt) {
      await sendFullReportReadyMessage(base);
      if (order.tierLevel === 4) await sendCounsellorBookMessage(base);
    }
  }
}
