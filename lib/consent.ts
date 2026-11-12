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
/**
 * Shown on /register under the checkboxes: what this number gets on WhatsApp
 * whether or not the box above is ticked - including the test reminders
 * (exam_reminder, a marketing template on Meta's side), which stop on STOP.
 */
export const WHATSAPP_SERVICE_NOTICE =
  "We'll send the test link, results, payment receipts and up to three reminders to finish the test to this number on WhatsApp. Reply STOP any time to stop reminders and offers.";

export const WHATSAPP_OPT_IN_TEXT =
  "Also send me occasional offers and updates from My Life Coach on WhatsApp. I can stop them any time.";

/**
 * Stored as AssessmentSession.whatsappOptInVersion next to whatsappOptInAt:
 * which wording the parent agreed to, and where. Bump the date whenever that
 * wording changes.
 */
export const WHATSAPP_OPT_IN_VERSIONS = {
  /** WHATSAPP_OPT_IN_TEXT on /register */
  register: "register-2026-10-15",
  /** whatsappResultsOptInText() on the results snapshot */
  results: "results-2026-11-12",
} as const;

/** The results snapshot's opt-in (components/results/ResultsOptIn.tsx) -
 *  same marketing consent as /register's, asked at the moment of value. */
export function whatsappResultsOptInText(firstName: string): string {
  return `Send ${firstName ? `${firstName}'s` : "the"} results and next steps to my WhatsApp.`;
}

export const WHATSAPP_RESULTS_OPT_IN_NOTE =
  "Includes occasional offers and updates from My Life Coach. Untick here or reply STOP any time.";

export function consentText(childLabel: string): string {
  return `I am ${childLabel}'s parent or guardian, and I consent to them taking this assessment. I understand the result describes their interests, not their ability, and is not a prediction of academic performance.`;
}
