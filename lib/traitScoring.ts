/**
 * The scoring engine shared by the three pilot modules added in
 * SCHOOL_ADMIN_SPEC.md Section 7 (Aptitude, Personality, Work Values).
 *
 * All three follow exactly the pattern lib/scoring.ts already established for
 * RIASEC: a fixed item set, a 1-5 Likert answer per item, and a plain sum per
 * trait. The only difference between them is which traits they have and how
 * the scale is worded, so the mechanics live here once and each module file is
 * a thin, named wrapper over it.
 *
 * lib/scoring.ts is deliberately left alone. It is the shipped consumer path
 * and is not rewritten to sit on top of this.
 *
 * Note on what these instruments are: every item is keyed positively, so a
 * straight sum is a valid total. Real Big Five inventories mix in
 * reverse-scored items to counter acquiescence bias; this pilot version does
 * not, and its scores should not be read as equivalent to a validated
 * instrument's.
 */

import type { TraitQuestion } from "@/types";

/** Same 1-5 Likert range the RIASEC test uses */
export const LIKERT_MIN = 1;
export const LIKERT_MAX = 5;

/** One option on a module's answer scale */
export interface ScaleOption {
  value: number;
  label: string;
}

export function isValidAnswer(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= LIKERT_MIN &&
    value <= LIKERT_MAX
  );
}

export interface TraitScorer<TTrait extends string> {
  QUESTIONS: TraitQuestion<TTrait>[];
  TRAITS: readonly TTrait[];
  TOTAL_QUESTIONS: number;
  QUESTIONS_BY_TRAIT: Record<TTrait, TraitQuestion<TTrait>[]>;
  QUESTIONS_PER_TRAIT: number;
  MIN_TRAIT_SCORE: number;
  MAX_TRAIT_SCORE: number;
  emptyScores(): Record<TTrait, number>;
  scoreResponses(responses: Record<number, number>): Record<TTrait, number>;
  getUnansweredQuestionIds(responses: Record<number, number>): number[];
  getAnsweredCount(responses: Record<number, number>): number;
  isComplete(responses: Record<number, number>): boolean;
  rankTraits(scores: Record<TTrait, number>): TTrait[];
  scoreToPercent(score: number): number;
}

/**
 * Build a scorer for one module's item set.
 *
 * Throws if the items aren't evenly distributed across the traits — an uneven
 * set would make the per-trait totals silently incomparable, which is exactly
 * the kind of thing that survives all the way to a dashboard unnoticed.
 */
export function createTraitScorer<TTrait extends string>(
  questions: TraitQuestion<TTrait>[],
  traits: readonly TTrait[],
  moduleName: string,
): TraitScorer<TTrait> {
  const byTrait = Object.fromEntries(
    traits.map((t) => [t, [] as TraitQuestion<TTrait>[]]),
  ) as Record<TTrait, TraitQuestion<TTrait>[]>;

  for (const question of questions) {
    const bucket = byTrait[question.trait];
    if (!bucket) {
      throw new Error(
        `${moduleName}: question ${question.id} has unknown trait "${question.trait}"`,
      );
    }
    bucket.push(question);
  }

  const counts = traits.map((t) => byTrait[t].length);
  const perTrait = counts[0];
  if (counts.some((c) => c !== perTrait) || perTrait === 0) {
    throw new Error(
      `${moduleName}: expected an equal number of items per trait, got ${traits
        .map((t, i) => `${t}=${counts[i]}`)
        .join(", ")}`,
    );
  }

  const minTraitScore = perTrait * LIKERT_MIN;
  const maxTraitScore = perTrait * LIKERT_MAX;

  function emptyScores(): Record<TTrait, number> {
    return Object.fromEntries(traits.map((t) => [t, 0])) as Record<
      TTrait,
      number
    >;
  }

  /** Missing or out-of-range answers are skipped, never guessed at. */
  function scoreResponses(
    responses: Record<number, number>,
  ): Record<TTrait, number> {
    const scores = emptyScores();
    for (const question of questions) {
      const answer = responses[question.id];
      if (!isValidAnswer(answer)) continue;
      scores[question.trait] += answer;
    }
    return scores;
  }

  function getUnansweredQuestionIds(
    responses: Record<number, number>,
  ): number[] {
    return questions
      .filter((q) => !isValidAnswer(responses[q.id]))
      .map((q) => q.id);
  }

  function getAnsweredCount(responses: Record<number, number>): number {
    return questions.length - getUnansweredQuestionIds(responses).length;
  }

  /** Ties fall back to the declared trait order, so ranking is reproducible. */
  function rankTraits(scores: Record<TTrait, number>): TTrait[] {
    return [...traits].sort((a, b) => {
      const diff = scores[b] - scores[a];
      if (diff !== 0) return diff;
      return traits.indexOf(a) - traits.indexOf(b);
    });
  }

  function scoreToPercent(score: number): number {
    const span = maxTraitScore - minTraitScore;
    const pct = ((score - minTraitScore) / span) * 100;
    return Math.round(Math.min(100, Math.max(0, pct)));
  }

  return {
    QUESTIONS: questions,
    TRAITS: traits,
    TOTAL_QUESTIONS: questions.length,
    QUESTIONS_BY_TRAIT: byTrait,
    QUESTIONS_PER_TRAIT: perTrait,
    MIN_TRAIT_SCORE: minTraitScore,
    MAX_TRAIT_SCORE: maxTraitScore,
    emptyScores,
    scoreResponses,
    getUnansweredQuestionIds,
    getAnsweredCount,
    isComplete: (responses) => getUnansweredQuestionIds(responses).length === 0,
    rankTraits,
    scoreToPercent,
  };
}
