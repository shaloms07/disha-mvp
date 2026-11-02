/**
 * Shared parental-consent copy — used by /register (new sessions) and
 * /resume (the legacy-session fallback, and the OTP step for a brand-new
 * parent). Versioned so a later wording change doesn't silently reinterpret
 * what an already-recorded consent meant.
 */

export const CONSENT_VERSION = "2026-10-15";

/**
 * Optional, separate from the parental consent above: lets the server send
 * marketing-kind WhatsApp messages (offers and upgrade reminders). The test
 * link, results, receipts and reminders are sent either way. Unticked by
 * default - consent has to be an active choice.
 */
export const WHATSAPP_OPT_IN_TEXT =
  "Also send me occasional offers and updates from My Life Coach on WhatsApp. I can stop them any time.";

export function consentText(childLabel: string): string {
  return `I am ${childLabel}'s parent or guardian, and I consent to them taking this assessment. I understand the result describes their interests, not their ability, and is not a prediction of academic performance.`;
}
