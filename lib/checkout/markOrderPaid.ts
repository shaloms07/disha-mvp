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

export async function markOrderPaid(razorpayOrderId: string, razorpayPaymentId: string) {
  const order = await prisma.order.findUnique({ where: { razorpayOrderId } });
  if (!order) return null;
  if (order.status === "PAID") return order;

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
      data: { purchasedTierLevel: order.tierLevel },
    }),
  ]);

  return updatedOrder;
}
