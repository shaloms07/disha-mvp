/**
 * Switches and content for the /results sales sections that exist in the code
 * but aren't live yet. Flip a flag (and fill its content) to show a section -
 * nothing else needs to change.
 */

import type { RiasecType } from "@/types";

/** "Who's behind this" - counsellor profile, method and common questions */
export const SHOW_TRUST_SECTION = false;

/** "Not ready to decide?" - the free weekly webinar for parents */
export const SHOW_WEBINAR_SECTION = false;

/** "Invite 3 parents · get it free" beside the Career Match Report button
 *  (lib/invite.ts). Off until invite counting has stronger checks on the
 *  server; ?ref= links are still captured at registration either way. */
export const SHOW_INVITE_OPTION = false;

export const COUNSELLOR = {
  name: "",
  credentials: "",
  /** Path or URL to a square photo */
  photo: "",
};

export const WEBINAR = {
  /** e.g. "Sunday, 11:00 am" */
  nextSession: "",
  registerUrl: "",
  recordingUrl: "",
};

/**
 * One explainer video per top-two interest pair, keyed by the two letters in
 * RIASEC order ("RI", "AS", ...), plus "FLAT" for a profile with no clear
 * leader. Paste a video URL (an embeddable YouTube/Vimeo link or a direct
 * .mp4) against a key and the video card appears for that result. Empty
 * means the card stays hidden.
 */
export const RESULT_VIDEOS: Partial<Record<string, string>> = {};

/** Shown under the video when it's made with an AI avatar, as planned */
export const RESULT_VIDEOS_AI_ASSISTED = true;

const ORDER: RiasecType[] = ["R", "I", "A", "S", "E", "C"];

export function resultVideoKey(topTwo: [RiasecType, RiasecType], flat: boolean): string {
  if (flat) return "FLAT";
  return [...topTwo].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join("");
}

/**
 * Optional videos under the locked plan on the results-ready page (e.g. how
 * the report is used, or a real counsellor explaining it). Each needs a
 * caption. Empty = the slot is hidden. Real videos only - no placeholders
 * and no invented testimonials.
 */
export const PLAN_VIDEOS: { src: string; caption: string }[] = [];

/**
 * "Book a free 10-min call to understand {name}'s results" on the paywall.
 * Set NEXT_PUBLIC_FREE_CALL_URL (a Calendly or similar booking link); unset
 * hides the button. A literal process.env access so Next.js inlines it.
 */
export const FREE_CALL_URL = process.env.NEXT_PUBLIC_FREE_CALL_URL?.trim() || "";

/**
 * RESULT_PAGE_V2's one-line refund promise beside the pay button, e.g.
 * "Not useful? Full refund within 7 days." Empty hides it (the Refund
 * policy link still shows).
 * TODO(Shalom): the real line, once the refund policy rewrite is final.
 */
export const REFUND_PROMISE = "";

/**
 * Real parent quotes for RESULT_PAGE_V2's trust block - with permission,
 * never written by us. The quotes section is hidden while this is empty.
 * TODO(Shalom): add 2-3 real ones, e.g. { quote: "…", name: "Sunita R.", detail: "Parent, Class 10" }.
 */
export const PARENT_TESTIMONIALS: { quote: string; name: string; detail?: string }[] = [];
