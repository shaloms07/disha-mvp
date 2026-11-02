/**
 * What a session has ACTUALLY paid for, as opposed to AssessmentSession.
 * purchasedTierLevel ("what can this session open" - also true for a free
 * invite-unlock, see lib/referral.ts). server/routes/checkout.ts uses this,
 * not purchasedTierLevel, to compute an upgrade's credit - an invite-unlocked
 * parent must pay full price for a bigger plan, never a credited one.
 */

import { prisma } from "@/lib/db";
import type { TierLevel } from "@/lib/pricing";

export async function paidTierLevel(sessionId: string): Promise<TierLevel> {
  const highestPaidOrder = await prisma.order.findFirst({
    where: { sessionId, status: "PAID" },
    orderBy: { tierLevel: "desc" },
    select: { tierLevel: true },
  });
  return (highestPaidOrder?.tierLevel ?? 0) as TierLevel;
}
