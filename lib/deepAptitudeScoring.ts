/**
 * Deep-Dive Assessment — Cognitive Aptitude (SPEC: 96-item master matrix,
 * "Pillar 1: Cognitive Aptitude & Spatial Reasoning").
 *
 * Unlike the school pilot's self-rated aptitude module (lib/aptitudeScoring.ts),
 * this is a real test: 15 MCQs with a correct answer, +1 point per correct
 * pick. The three domains aren't evenly split (numerical 6, verbal 5, spatial
 * 4 — the matrix wasn't authored as a balanced design), so each domain's max
 * is computed from the data rather than assumed to be a shared constant, the
 * same approach lib/scoring.ts uses for RIASEC.
 */

import questionsData from "@/data/deep-aptitude-questions.json";
import {
  DEEP_APTITUDE_DOMAINS,
  type AptitudeMcqQuestion,
  type DeepAptitudeDomain,
} from "@/types";

export const APTITUDE_MCQ_QUESTIONS = questionsData as AptitudeMcqQuestion[];
export const APTITUDE_MCQ_TOTAL_QUESTIONS = APTITUDE_MCQ_QUESTIONS.length;

export function emptyAptitudeMcqScores(): Record<DeepAptitudeDomain, number> {
  return Object.fromEntries(DEEP_APTITUDE_DOMAINS.map((d) => [d, 0])) as Record<
    DeepAptitudeDomain,
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

function computeMaxPerDomain(): Record<DeepAptitudeDomain, number> {
  const counts = emptyAptitudeMcqScores();
  for (const q of APTITUDE_MCQ_QUESTIONS) counts[q.domain] += 1;
  return counts;
}

export const APTITUDE_MCQ_MAX_SCORE: Record<DeepAptitudeDomain, number> =
  computeMaxPerDomain();
export const APTITUDE_MCQ_MIN_SCORE = 0;

/** Correct picks tallied by domain. Wrong or missing answers score nothing. */
export function scoreAptitudeMcq(
  responses: Record<number, number>,
): Record<DeepAptitudeDomain, number> {
  const scores = emptyAptitudeMcqScores();
  for (const q of APTITUDE_MCQ_QUESTIONS) {
    const answer = responses[q.id];
    if (!isValidChoice(answer)) continue;
    if (answer === q.correctIndex) scores[q.domain] += 1;
  }
  return scores;
}

export function getUnansweredAptitudeMcqIds(
  responses: Record<number, number>,
): number[] {
  return APTITUDE_MCQ_QUESTIONS.filter(
    (q) => !isValidChoice(responses[q.id]),
  ).map((q) => q.id);
}

export function getAptitudeMcqAnsweredCount(
  responses: Record<number, number>,
): number {
  return (
    APTITUDE_MCQ_TOTAL_QUESTIONS -
    getUnansweredAptitudeMcqIds(responses).length
  );
}

export function isAptitudeMcqComplete(
  responses: Record<number, number>,
): boolean {
  return getUnansweredAptitudeMcqIds(responses).length === 0;
}

/** Domains ordered strongest first, ties falling back to declared order */
export function rankAptitudeMcqDomains(
  scores: Record<DeepAptitudeDomain, number>,
): DeepAptitudeDomain[] {
  return [...DEEP_APTITUDE_DOMAINS].sort((a, b) => {
    const diff = scores[b] - scores[a];
    if (diff !== 0) return diff;
    return DEEP_APTITUDE_DOMAINS.indexOf(a) - DEEP_APTITUDE_DOMAINS.indexOf(b);
  });
}

export function aptitudeMcqScoreToPercent(
  score: number,
  domain: DeepAptitudeDomain,
): number {
  const max = APTITUDE_MCQ_MAX_SCORE[domain];
  const pct = (score / max) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}
