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
