/**
 * Plain-language copy for the six RIASEC types.
 *
 * Tone follows PRD.md Section 6: warm, non-alarming, about interests rather
 * than ability. Nothing here is a prediction or a verdict.
 */

import { rankTypes, scoreToPercent } from "./scoring";
import { RIASEC_LABELS, RIASEC_TYPES, type RiasecType } from "@/types";

export interface TypeSummary {
  label: string;
  /** Two or three words a parent can hold onto */
  headline: string;
  blurb: string;
  examples: string;
}

export const TYPE_SUMMARIES: Record<RiasecType, TypeSummary> = {
  R: {
    label: RIASEC_LABELS.R,
    headline: "Hands-on and practical",
    blurb:
      "Drawn to building, fixing and working with real things — tools, machines, materials, the outdoors. Would usually rather do it than read about it.",
    examples: "Repairing things, building kits, sport, working outdoors",
  },
  I: {
    label: RIASEC_LABELS.I,
    headline: "Curious and analytical",
    blurb:
      "Drawn to working out how things function. Enjoys questions with something to dig into — experiments, patterns, puzzles, causes and effects.",
    examples: "Experiments, maths and logic problems, research, how-things-work",
  },
  A: {
    label: RIASEC_LABELS.A,
    headline: "Expressive and original",
    blurb:
      "Drawn to making things and doing them their own way — writing, design, music, performance. Values originality over following a set template.",
    examples: "Drawing, writing, music, design, drama, film",
  },
  S: {
    label: RIASEC_LABELS.S,
    headline: "People-centred",
    blurb:
      "Drawn to teaching, helping and listening. Notices how people around them are doing, and gets real satisfaction from being useful to someone.",
    examples: "Tutoring, volunteering, counselling friends, teamwork",
  },
  E: {
    label: RIASEC_LABELS.E,
    headline: "Persuasive and driven",
    blurb:
      "Drawn to leading, convincing and organising people around an idea. Comfortable being in front, and willing to take a chance on something.",
    examples: "Leading groups, debating, selling, starting ventures",
  },
  C: {
    label: RIASEC_LABELS.C,
    headline: "Organised and precise",
    blurb:
      "Drawn to structure and accuracy — getting things in order and doing them properly. Comfortable with clear rules and reliable systems.",
    examples: "Planning, record-keeping, accounts, organising, detail work",
  },
};

/**
 * Difference between the strongest and weakest type, in percent (0-100).
 * Each type's raw tally caps out at a slightly different number (see
 * lib/scoring.ts's MAX_TYPE_SCORE), so comparing raw totals across types
 * isn't apples-to-apples — percent of each type's own max is.
 */
export function getSpread(scores: Record<RiasecType, number>): number {
  const percents = RIASEC_TYPES.map((t) => scoreToPercent(scores[t], t));
  return Math.max(...percents) - Math.min(...percents);
}

/**
 * True when no type really stands out. Worth saying out loud rather than
 * presenting a top-two that the answers don't actually support.
 */
export function isFlatProfile(scores: Record<RiasecType, number>): boolean {
  return getSpread(scores) < 20;
}

/** The headline sentence for the results screen */
export function getHeadline(
  scores: Record<RiasecType, number>,
  childName: string,
): string {
  const who = childName ? `${childName}'s` : "Your child's";
  if (isFlatProfile(scores)) {
    return `${who} interests are spread fairly evenly across all six types.`;
  }
  const [first, second] = rankTypes(scores);
  return `${who} strongest interests are ${RIASEC_LABELS[first]} and ${RIASEC_LABELS[second]}.`;
}
