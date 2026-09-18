/**
 * Deep-Dive Assessment — Behavioral Profile / Situational Judgement (SPEC:
 * 96-item master matrix, "Pillar 3: Behavioral & Personality Profile").
 *
 * Structurally different from the school pilot's Personality module
 * (lib/personalityScoring.ts), which is a plain 1-5 rating per trait. Here
 * each scenario has four options, and each option can move a *different*
 * trait by a different (sometimes negative) weight — picking "push hard to
 * win at all costs" costs Agreeableness rather than scoring anything.
 *
 * The source data used two trait names per axis (Extraversion/Introversion,
 * Neuroticism/Emotional Stability) to describe opposite pulls on the same
 * scale; data/sjt-questions.json has already folded those into signed
 * weights against the five standard Big Five axes (see the generation note
 * in that file's sibling script), so this file only ever sees five traits.
 *
 * One item (kind: "attentionCheck") isn't a trait item at all — it's a data-
 * quality check ("select option B"), scored separately and excluded from
 * every trait total.
 */

import questionsData from "@/data/sjt-questions.json";
import { SJT_TRAITS, type SjtQuestion, type SjtTrait } from "@/types";

export const SJT_QUESTIONS = questionsData as SjtQuestion[];
/** Includes the attention-check item — the student still answers it as a card */
export const SJT_TOTAL_QUESTIONS = SJT_QUESTIONS.length;

const SCORED_QUESTIONS = SJT_QUESTIONS.filter(
  (q): q is Extract<SjtQuestion, { kind: "scenario" }> => q.kind === "scenario",
);

const ATTENTION_CHECK = SJT_QUESTIONS.find(
  (q): q is Extract<SjtQuestion, { kind: "attentionCheck" }> =>
    q.kind === "attentionCheck",
);

export function emptySjtScores(): Record<SjtTrait, number> {
  return Object.fromEntries(SJT_TRAITS.map((t) => [t, 0])) as Record<
    SjtTrait,
    number
  >;
}

/** A stored answer is the chosen option's index into the 4-option array */
function isValidChoice(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 3
  );
}

/**
 * Theoretical best/worst a trait could hit if every scenario were answered
 * to help or hurt it as much as possible. Needed because, unlike a plain
 * Likert sum, a trait's range here depends on how often it's touched and by
 * which weights — there's no shared constant to fall back on.
 */
function computeRange(): {
  min: Record<SjtTrait, number>;
  max: Record<SjtTrait, number>;
} {
  const min = emptySjtScores();
  const max = emptySjtScores();

  for (const q of SCORED_QUESTIONS) {
    const weightsByTrait = new Map<SjtTrait, number[]>();
    for (const option of q.scoring) {
      const list = weightsByTrait.get(option.trait) ?? [];
      list.push(option.weight);
      weightsByTrait.set(option.trait, list);
    }
    for (const [trait, weights] of weightsByTrait) {
      max[trait] += Math.max(0, ...weights);
      min[trait] += Math.min(0, ...weights);
    }
  }

  return { min, max };
}

const RANGE = computeRange();
export const SJT_MIN_SCORE = RANGE.min;
export const SJT_MAX_SCORE = RANGE.max;

/** Tally each pick's weight onto its trait. The attention-check item never scores. */
export function scoreSjt(responses: Record<number, number>): Record<SjtTrait, number> {
  const scores = emptySjtScores();
  for (const q of SCORED_QUESTIONS) {
    const answer = responses[q.id];
    if (!isValidChoice(answer)) continue;
    const chosen = q.scoring[answer];
    if (!chosen) continue;
    scores[chosen.trait] += chosen.weight;
  }
  return scores;
}

/**
 * Whether the respondent picked the instructed option on the attention-check
 * item. Undefined until that item has an answer — a report shouldn't flag a
 * "failed" check before the student has even reached it.
 */
export function attentionCheckPassed(
  responses: Record<number, number>,
): boolean | undefined {
  if (!ATTENTION_CHECK) return undefined;
  const answer = responses[ATTENTION_CHECK.id];
  if (!isValidChoice(answer)) return undefined;
  return answer === ATTENTION_CHECK.validIndex;
}

export function getUnansweredSjtIds(responses: Record<number, number>): number[] {
  return SJT_QUESTIONS.filter((q) => !isValidChoice(responses[q.id])).map(
    (q) => q.id,
  );
}

export function getSjtAnsweredCount(responses: Record<number, number>): number {
  return SJT_TOTAL_QUESTIONS - getUnansweredSjtIds(responses).length;
}

export function isSjtComplete(responses: Record<number, number>): boolean {
  return getUnansweredSjtIds(responses).length === 0;
}

/** Traits ordered strongest first, ties falling back to declared order */
export function rankSjtTraits(scores: Record<SjtTrait, number>): SjtTrait[] {
  return [...SJT_TRAITS].sort((a, b) => {
    const diff = scores[b] - scores[a];
    if (diff !== 0) return diff;
    return SJT_TRAITS.indexOf(a) - SJT_TRAITS.indexOf(b);
  });
}

/** A trait score expressed as 0-100 against that trait's own achievable range */
export function sjtScoreToPercent(score: number, trait: SjtTrait): number {
  const min = SJT_MIN_SCORE[trait];
  const max = SJT_MAX_SCORE[trait];
  const span = max - min;
  if (span === 0) return 50;
  const pct = ((score - min) / span) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}
