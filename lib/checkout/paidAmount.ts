/**
 * The rupees a session has actually paid, in total, across every PAID order -
 * the real credit lib/pricing.ts's priceAfterCredit takes off an upgrade.
 * Distinct from paidTierLevel.ts's tier-based view: a parent who paid ₹299
 * for tier 1 before the ₹99 launch must get all ₹299 off a later upgrade,
 * not just the list price of the tier they own.
 */

import { prisma } from "@/lib/db";

export async function paidAmount(sessionId: string): Promise<number> {
  const { _sum } = await prisma.order.aggregate({
    where: { sessionId, status: "PAID" },
    _sum: { amount: true },
  });
  return (_sum.amount ?? 0) / 100;
}
