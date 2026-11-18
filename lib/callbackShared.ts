/**
 * Free callback bits shared by the page and the API - no database access, so
 * the browser can import this (lib/callbacks/ is server-only).
 */

export const CALLBACK_STATUSES = ["requested", "called", "no_answer", "paid"] as const;
export type CallbackStatus = (typeof CALLBACK_STATUSES)[number];

/** A preference, not a slot */
export const PREFERRED_TIMES = ["morning", "evening"] as const;
export type PreferredTime = (typeof PREFERRED_TIMES)[number];

/** "+91 98XXX XX123" - the parent's verified number, as shown back on the page */
export function maskMobile(mobile: string | undefined): string {
  const digits = (mobile ?? "").replace(/\D/g, "").slice(-10);
  if (digits.length < 10) return "your registered number";
  return `+91 ${digits.slice(0, 2)}XXX XX${digits.slice(7)}`;
}
