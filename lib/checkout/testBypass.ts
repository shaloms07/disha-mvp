/**
 * Mobiles that skip Razorpay entirely (server/routes/checkout.ts) - internal
 * QA testers who need to exercise the full paid flow (Deep-Dive, counsellor
 * booking, WhatsApp journey) without actually paying, including once real
 * (non-test-mode) Razorpay keys are live. Comma-separated env var, normalized
 * the same way every other mobile comparison in this codebase is.
 */

import { normalizeMobile } from "@/lib/validation";

export function isTestBypassMobile(mobile: string): boolean {
  const list = (process.env.CHECKOUT_BYPASS_MOBILES ?? "")
    .split(",")
    .map((m) => normalizeMobile(m.trim()))
    .filter(Boolean);
  return list.includes(normalizeMobile(mobile));
}
