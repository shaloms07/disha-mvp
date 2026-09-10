/**
 * RIASEC scoring — real product logic (SPEC.md Section 5).
 *
 * Takes the child's raw Likert answers and turns them into six type totals.
 * Everything is derived from data/questions.json, so the counts below stay
 * correct if the question set ever changes.
 */

import questionsData from "@/data/questions.json";
import { RIASEC_TYPES, type Question, type RiasecType } from "@/types";

export const QUESTIONS = questionsData as Question[];

export const TOTAL_QUESTIONS = QUESTIONS.length;

/** Likert scale used on the test screen: 1 = strongly dislike … 5 = strongly like */
export const LIKERT_MIN = 1;
export const LIKERT_MAX = 5;

export const QUESTIONS_BY_TYPE: Record<RiasecType, Question[]> = groupByType(QUESTIONS);

/** 10 with the shipped question set */
export const QUESTIONS_PER_TYPE = QUESTIONS_BY_TYPE.R.length;

/** A fully-answered test scores 10-50 per type */
export const MIN_TYPE_SCORE = QUESTIONS_PER_TYPE * LIKERT_MIN;
export const MAX_TYPE_SCORE = QUESTIONS_PER_TYPE * LIKERT_MAX;

function groupByType(questions: Question[]): Record<RiasecType, Question[]> {
  const grouped = Object.fromEntries(
    RIASEC_TYPES.map((t) => [t, [] as Question[]]),
  ) as Record<RiasecType, Question[]>;
  for (const q of questions) grouped[q.type].push(q);
  return grouped;
}

export function emptyScores(): Record<RiasecType, number> {
  return Object.fromEntries(RIASEC_TYPES.map((t) => [t, 0])) as Record<
    RiasecType,
    number
  >;
}

function isValidAnswer(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= LIKERT_MIN &&
    value <= LIKERT_MAX
  );
}

/**
 * Group the 60 answers by their question type and sum each group.
 * Missing or out-of-range answers are skipped rather than guessed, so a
 * partially-filled test still scores without throwing — but the test screen
 * gates completion on isTestComplete() so real results are always 10-50.
 */
export function scoreResponses(
  responses: Record<number, number>,
): Record<RiasecType, number> {
  const scores = emptyScores();
  for (const question of QUESTIONS) {
    const answer = responses[question.id];
    if (!isValidAnswer(answer)) continue;
    scores[question.type] += answer;
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

/** A single type total expressed as 0-100, for progress bars and copy */
export function scoreToPercent(score: number): number {
  const span = MAX_TYPE_SCORE - MIN_TYPE_SCORE;
  const pct = ((score - MIN_TYPE_SCORE) / span) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}
