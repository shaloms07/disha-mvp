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
import { sendPaymentReceivedMessage, sendReportPaidMessage } from "@/lib/whatsapp/journeyMessages";
import type { RiasecType } from "@/types";

export async function markOrderPaid(razorpayOrderId: string, razorpayPaymentId: string) {
  const order = await prisma.order.findUnique({ where: { razorpayOrderId } });
  if (!order) return null;
  if (order.status === "PAID") return order;

  const session = await prisma.assessmentSession.findUnique({
    where: { id: order.sessionId },
    select: { unlockedVia: true },
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

  void sendPaymentWhatsAppMessage(order);

  return updatedOrder;
}

async function sendPaymentWhatsAppMessage(order: { id: string; sessionId: string; tierLevel: number }): Promise<void> {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: order.sessionId },
    select: { token: true, scores: true, parent: { select: { name: true, mobile: true } }, child: { select: { name: true } } },
  });
  if (!session) return;

  const base = {
    sessionId: order.sessionId,
    parentMobile: session.parent.mobile,
    parentName: session.parent.name,
    childName: session.child.name,
    sessionToken: session.token,
  };

  if (order.tierLevel === 1) {
    if (!session.scores) return; // shouldn't happen - tier 1 requires a completed free test
    void sendReportPaidMessage({ ...base, orderId: order.id, scores: session.scores as Record<RiasecType, number> });
  } else {
    void sendPaymentReceivedMessage({ ...base, tierLevel: order.tierLevel });
  }
}
