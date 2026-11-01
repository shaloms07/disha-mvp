/**
 * Invite-code generation for the "invite 3 parents, get the Career Match
 * Report free" flow (lib/invite.ts builds the shareable link from this code).
 * Deliberately a different, shorter charset than lib/session/token.ts's
 * session tokens - this one gets typed/read aloud, not just pasted from a link.
 */

import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendReferralProgressMessage, sendReferralUnlockedMessage } from "@/lib/whatsapp/journeyMessages";
import type { RiasecType } from "@/types";

export const INVITES_NEEDED = 3;

const REFERRAL_CODE_LENGTH = 6;
// No 0/O/1/I - avoids characters that are easy to misread when shared verbally.
const REFERRAL_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomReferralCode(): string {
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += REFERRAL_CODE_CHARSET[randomInt(0, REFERRAL_CODE_CHARSET.length)];
  }
  return code;
}

/** Generates a referral code guaranteed unique against AssessmentSession.referralCode,
 *  retrying on the rare unique-constraint clash. Caller is responsible for
 *  actually persisting it (e.g. inside the same transaction as OTP verify). */
export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomReferralCode();
    const existing = await prisma.assessmentSession.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique referral code after 10 attempts");
}

/**
 * Called right after a session's OTP verify succeeds (server/routes/otp.ts) -
 * credits the invite that brought this parent here, if any. Counts once, and
 * only for a genuinely new mobile number: not the inviter's own, and never
 * seen on any other verified session before. Never throws - a referral
 * mis-credit must not block OTP verification itself.
 */
export async function creditReferralIfEligible(params: {
  sessionId: string;
  referredByCode: string;
  verifiedMobile: string;
}): Promise<void> {
  try {
    const referrer = await prisma.assessmentSession.findUnique({
      where: { referralCode: params.referredByCode },
      select: {
        id: true,
        token: true,
        referralCode: true,
        purchasedTierLevel: true,
        scores: true,
        parent: { select: { name: true, mobile: true } },
        child: { select: { name: true } },
      },
    });
    // A stale/invalid code - silently ignored, same as register.ts's own lookup.
    if (!referrer || !referrer.referralCode) return;
    // Inviting yourself doesn't count.
    if (referrer.parent.mobile === params.verifiedMobile) return;

    // Never seen before: no OTHER verified session already exists for this mobile.
    const seenBefore = await prisma.assessmentSession.findFirst({
      where: {
        id: { not: params.sessionId },
        otpVerified: true,
        parent: { mobile: params.verifiedMobile },
      },
      select: { id: true },
    });
    if (seenBefore) return;

    // Idempotent: only the first credit attempt for this invitee session wins.
    const { count } = await prisma.assessmentSession.updateMany({
      where: { id: params.sessionId, referralCountedAt: null },
      data: { referralCountedAt: new Date() },
    });
    if (count === 0) return; // already counted (e.g. a retried request)

    const referralCount = await prisma.assessmentSession.count({
      where: { referredByCode: referrer.referralCode, referralCountedAt: { not: null } },
    });

    if (referralCount < INVITES_NEEDED) {
      void sendReferralProgressMessage({
        sessionId: referrer.id,
        parentMobile: referrer.parent.mobile,
        parentName: referrer.parent.name,
        referralCount,
      });
      return;
    }

    // Never downgrade/re-unlock - same guarded-updateMany shape as
    // lib/checkout/markOrderPaid.ts, so a payment already covering tier 1+
    // is never overwritten by a free unlock arriving after it.
    const { count: unlockedCount } = await prisma.assessmentSession.updateMany({
      where: { id: referrer.id, OR: [{ purchasedTierLevel: null }, { purchasedTierLevel: { lt: 1 } }] },
      data: { purchasedTierLevel: 1, unlockedVia: "REFERRAL", unlockedAt: new Date() },
    });
    if (unlockedCount === 0) return; // referrer already has tier 1+ some other way

    if (referrer.scores) {
      void sendReferralUnlockedMessage({
        sessionId: referrer.id,
        parentMobile: referrer.parent.mobile,
        parentName: referrer.parent.name,
        childName: referrer.child.name,
        sessionToken: referrer.token,
        scores: referrer.scores as Record<RiasecType, number>,
      });
    }
  } catch (error) {
    console.error("[referral] failed to credit invite", error);
  }
}
