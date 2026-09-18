/**
 * Deep-Dive Assessment — Work Values (SPEC: 96-item master matrix,
 * "Pillar 4: Work Values & Motivators").
 *
 * The simplest of the three new modules: each of the 15 items names one
 * value and asks how important it is, 1 (Unimportant) to 5 (Essential). One
 * item per value, so there's nothing to sum — the score for a value *is* its
 * rating. Distinct from the school pilot's work-values module
 * (lib/workValuesScoring.ts), which uses a different, smaller value set with
 * three items per value.
 */

import questionsData from "@/data/deep-workvalues-questions.json";
import { DEEP_WORK_VALUES, type DeepWorkValue, type DeepWorkValueQuestion } from "@/types";
import type { ScaleOption } from "./traitScoring";

/** SPEC: "Scale: 1 = Unimportant, 2 = Low Priority, 3 = Moderate, 4 = Important, 5 = Essential" */
export const DEEP_WORK_VALUES_SCALE: readonly ScaleOption[] = [
  { value: 1, label: "Unimportant" },
  { value: 2, label: "Low priority" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Important" },
  { value: 5, label: "Essential" },
] as const;

export const DEEP_WORK_VALUES_QUESTIONS = questionsData as DeepWorkValueQuestion[];
export const DEEP_WORK_VALUES_TOTAL_QUESTIONS = DEEP_WORK_VALUES_QUESTIONS.length;

export const DEEP_WORK_VALUES_MIN_SCORE = 1;
export const DEEP_WORK_VALUES_MAX_SCORE = 5;

function isValidAnswer(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= DEEP_WORK_VALUES_MIN_SCORE &&
    value <= DEEP_WORK_VALUES_MAX_SCORE
  );
}

export function emptyDeepWorkValuesScores(): Record<DeepWorkValue, number> {
  return Object.fromEntries(DEEP_WORK_VALUES.map((v) => [v, 0])) as Record<
    DeepWorkValue,
    number
  >;
}

/** Each value's score is simply its own rating — there's only one item per value. */
export function scoreDeepWorkValues(
  responses: Record<number, number>,
): Record<DeepWorkValue, number> {
  const scores = emptyDeepWorkValuesScores();
  for (const q of DEEP_WORK_VALUES_QUESTIONS) {
    const answer = responses[q.id];
    if (!isValidAnswer(answer)) continue;
    scores[q.value] = answer;
  }
  return scores;
}

export function getUnansweredDeepWorkValuesIds(
  responses: Record<number, number>,
): number[] {
  return DEEP_WORK_VALUES_QUESTIONS.filter(
    (q) => !isValidAnswer(responses[q.id]),
  ).map((q) => q.id);
}

export function getDeepWorkValuesAnsweredCount(
  responses: Record<number, number>,
): number {
  return (
    DEEP_WORK_VALUES_TOTAL_QUESTIONS -
    getUnansweredDeepWorkValuesIds(responses).length
  );
}

export function isDeepWorkValuesComplete(
  responses: Record<number, number>,
): boolean {
  return getUnansweredDeepWorkValuesIds(responses).length === 0;
}

export function rankDeepWorkValues(
  scores: Record<DeepWorkValue, number>,
): DeepWorkValue[] {
  return [...DEEP_WORK_VALUES].sort((a, b) => {
    const diff = scores[b] - scores[a];
    if (diff !== 0) return diff;
    return DEEP_WORK_VALUES.indexOf(a) - DEEP_WORK_VALUES.indexOf(b);
  });
}

export function deepWorkValueScoreToPercent(score: number): number {
  const span = DEEP_WORK_VALUES_MAX_SCORE - DEEP_WORK_VALUES_MIN_SCORE;
  const pct = ((score - DEEP_WORK_VALUES_MIN_SCORE) / span) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}
