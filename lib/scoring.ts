/**
 * RIASEC scoring — real product logic (SPEC.md Section 5).
 *
 * The test is 36 forced-choice pairs (data/questions.json): each item names
 * two activities, and the child picks the one that appeals more. A pick is
 * one point for that option's trait — "RIASEC Choice Tally" per the 96-item
 * master matrix's scoring_rules.module_2.
 */

import questionsData from "@/data/questions.json";
import { RIASEC_TYPES, type Question, type RiasecType } from "@/types";

export const QUESTIONS = questionsData as Question[];

export const TOTAL_QUESTIONS = QUESTIONS.length;

/** A stored answer is which option was picked: 1 = optionA, 2 = optionB */
export const CHOICE_A = 1;
export const CHOICE_B = 2;

export function emptyScores(): Record<RiasecType, number> {
  return Object.fromEntries(RIASEC_TYPES.map((t) => [t, 0])) as Record<
    RiasecType,
    number
  >;
}

function isValidAnswer(value: unknown): value is typeof CHOICE_A | typeof CHOICE_B {
  return value === CHOICE_A || value === CHOICE_B;
}

/**
 * How many times each trait appears as either option across the 36 pairs.
 * That count is the true maximum for that trait — every pick could in
 * principle have gone to it. The pairs aren't a perfectly balanced design
 * (R appears 13 times, S appears 11, the rest 12), so this is computed from
 * the data rather than assumed to be a shared constant.
 */
function computeMaxPerType(): Record<RiasecType, number> {
  const counts = emptyScores();
  for (const question of QUESTIONS) {
    counts[question.optionA.trait] += 1;
    counts[question.optionB.trait] += 1;
  }
  return counts;
}

export const MAX_TYPE_SCORE: Record<RiasecType, number> = computeMaxPerType();
export const MIN_TYPE_SCORE = 0;

/**
 * Tally the 36 picks by trait. Missing or out-of-range answers are skipped
 * rather than guessed, so a partially-answered test still scores — the test
 * screen gates completion on isTestComplete() so a real result always
 * reflects all 36 picks.
 */
export function scoreResponses(
  responses: Record<number, number>,
): Record<RiasecType, number> {
  const scores = emptyScores();
  for (const question of QUESTIONS) {
    const answer = responses[question.id];
    if (!isValidAnswer(answer)) continue;
    const picked = answer === CHOICE_A ? question.optionA : question.optionB;
    scores[picked.trait] += 1;
  }
  return scores;
}

export function getUnansweredQuestionIds(
  responses: Record<number, number>,
): number[] {
  return QUESTIONS.filter((q) => !isValidAnswer(responses[q.id])).map(
    (q) => q.id,
  );
}

export function getAnsweredCount(responses: Record<number, number>): number {
  return TOTAL_QUESTIONS - getUnansweredQuestionIds(responses).length;
}

export function isTestComplete(responses: Record<number, number>): boolean {
  return getUnansweredQuestionIds(responses).length === 0;
}

/**
 * Types ordered strongest first. Ties fall back to the canonical R-I-A-S-E-C
 * order so the ranking is stable and reproducible.
 */
export function rankTypes(scores: Record<RiasecType, number>): RiasecType[] {
  return [...RIASEC_TYPES].sort((a, b) => {
    const diff = scores[b] - scores[a];
    if (diff !== 0) return diff;
    return RIASEC_TYPES.indexOf(a) - RIASEC_TYPES.indexOf(b);
  });
}

/** e.g. "IRC" — the child's three strongest types, Holland-code style */
export function getHollandCode(
  scores: Record<RiasecType, number>,
  length = 3,
): string {
  return rankTypes(scores).slice(0, length).join("");
}

/** A single type total expressed as 0-100, against that type's own max */
export function scoreToPercent(score: number, type: RiasecType): number {
  const max = MAX_TYPE_SCORE[type];
  const pct = (score / max) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}
