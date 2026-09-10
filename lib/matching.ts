/**
 * Career matching — real product logic (SPEC.md Section 5).
 *
 * Rescales the child's six RIASEC totals onto the same 1-10 scale the career
 * profiles in data/careers.json use, then ranks every career by how closely its
 * profile matches.
 */

import careersData from "@/data/careers.json";
import {
  RIASEC_TYPES,
  type CareerMatch,
  type CareerProfile,
  type RiasecType,
} from "@/types";
import { MAX_TYPE_SCORE, MIN_TYPE_SCORE } from "./scoring";

export const CAREERS = careersData as CareerProfile[];

/** The scale career profiles are authored on */
export const PROFILE_MIN = 1;
export const PROFILE_MAX = 10;

/** Map one type total (10-50) onto the career profile scale (1-10) */
export function rescaleScore(score: number): number {
  const clamped = Math.min(MAX_TYPE_SCORE, Math.max(MIN_TYPE_SCORE, score));
  const ratio = (clamped - MIN_TYPE_SCORE) / (MAX_TYPE_SCORE - MIN_TYPE_SCORE);
  return PROFILE_MIN + ratio * (PROFILE_MAX - PROFILE_MIN);
}

export function rescaleScores(
  scores: Record<RiasecType, number>,
): Record<RiasecType, number> {
  return Object.fromEntries(
    RIASEC_TYPES.map((t) => [t, rescaleScore(scores[t])]),
  ) as Record<RiasecType, number>;
}

/** Six values in canonical R-I-A-S-E-C order */
export function toVector(profile: Record<RiasecType, number>): number[] {
  return RIASEC_TYPES.map((t) => profile[t]);
}

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

function magnitude(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

function mean(v: number[]): number {
  return v.reduce((sum, x) => sum + x, 0) / v.length;
}

/** Plain cosine similarity. Both vectors are positive here, so this sits in 0-1. */
export function cosineSimilarity(a: number[], b: number[]): number {
  const denominator = magnitude(a) * magnitude(b);
  return denominator === 0 ? 0 : dot(a, b) / denominator;
}

/**
 * Cosine similarity of the mean-centred vectors, i.e. the correlation between
 * the two profile *shapes*, in -1 to 1.
 *
 * Centring matters for this test. A child who answers 4-5 to everything and a
 * child who answers 1-2 to everything can have the same interest shape, and
 * plain cosine on all-positive vectors barely separates careers at all (every
 * pair lands around 0.7-0.95). Comparing shape rather than overall enthusiasm
 * is both the fairer read and the one that produces a usable ranking.
 */
export function shapeSimilarity(a: number[], b: number[]): number {
  const aMean = mean(a);
  const bMean = mean(b);
  const aCentred = a.map((v) => v - aMean);
  const bCentred = b.map((v) => v - bMean);
  const denominator = magnitude(aCentred) * magnitude(bCentred);
  // A perfectly flat profile has no shape to compare — treat it as neutral.
  return denominator === 0 ? 0 : dot(aCentred, bCentred) / denominator;
}

/** Fold the -1..1 correlation into a 0..1 match score */
export function toMatchScore(similarity: number): number {
  return (similarity + 1) / 2;
}

/** 1-10 stars, linear in the match score (SPEC.md: top band 9-10, lowest 1-2) */
export function starsFromMatchScore(matchScore: number): number {
  return Math.min(10, Math.max(1, Math.round(matchScore * 10)));
}

/**
 * Rank every career against the child's scores, strongest match first.
 * Ties break on career title so the order is stable between runs.
 */
export function matchCareers(
  scores: Record<RiasecType, number>,
  careers: CareerProfile[] = CAREERS,
): CareerMatch[] {
  const childVector = toVector(rescaleScores(scores));

  return careers
    .map((career) => {
      const matchScore = toMatchScore(
        shapeSimilarity(childVector, toVector(career.profile)),
      );
      return {
        career,
        matchScore,
        stars: starsFromMatchScore(matchScore),
      };
    })
    .sort(
      (a, b) =>
        b.matchScore - a.matchScore ||
        a.career.title.localeCompare(b.career.title),
    );
}

export function getTopMatches(
  scores: Record<RiasecType, number>,
  count = 3,
  careers: CareerProfile[] = CAREERS,
): CareerMatch[] {
  return matchCareers(scores, careers).slice(0, count);
}

/** Match score as a whole percentage, for display */
export function matchPercent(matchScore: number): number {
  return Math.round(matchScore * 100);
}
