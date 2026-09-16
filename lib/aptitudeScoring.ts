/**
 * Aptitude module — SCHOOL_ADMIN_SPEC.md Section 7.
 *
 * IMPORTANT, and worth repeating anywhere this data is displayed: these items
 * ask a student how easy they *find* something. That is self-rated confidence,
 * not tested ability. A real aptitude test has right and wrong answers; this
 * one does not, so a high Numerical score here means "believes numbers come
 * easily to them", not "is good at numbers". The Principal Dashboard's
 * benchmarking screen has to say so on the screen itself.
 */

import aptitudeData from "@/data/aptitude-questions.json";
import { APTITUDE_DOMAINS, type AptitudeDomain, type AptitudeQuestion } from "@/types";
import { createTraitScorer, type ScaleOption } from "./traitScoring";

export const APTITUDE_QUESTIONS = aptitudeData as AptitudeQuestion[];

const scorer = createTraitScorer<AptitudeDomain>(
  APTITUDE_QUESTIONS,
  APTITUDE_DOMAINS,
  "Aptitude",
);

/** 15 items, 3 per domain, so each domain scores 3-15 */
export const APTITUDE_TOTAL_QUESTIONS = scorer.TOTAL_QUESTIONS;
export const APTITUDE_ITEMS_PER_DOMAIN = scorer.QUESTIONS_PER_TRAIT;
export const APTITUDE_MIN_SCORE = scorer.MIN_TRAIT_SCORE;
export const APTITUDE_MAX_SCORE = scorer.MAX_TRAIT_SCORE;
export const APTITUDE_QUESTIONS_BY_DOMAIN = scorer.QUESTIONS_BY_TRAIT;

/** Ease, not enjoyment — the wording has to keep that distinction visible. */
export const APTITUDE_SCALE: readonly ScaleOption[] = [
  { value: 1, label: "Very hard for me" },
  { value: 2, label: "Hard for me" },
  { value: 3, label: "Somewhere in between" },
  { value: 4, label: "Easy for me" },
  { value: 5, label: "Very easy for me" },
] as const;

export const emptyAptitudeScores = scorer.emptyScores;
export const scoreAptitude = scorer.scoreResponses;
export const getUnansweredAptitudeIds = scorer.getUnansweredQuestionIds;
export const getAptitudeAnsweredCount = scorer.getAnsweredCount;
export const isAptitudeComplete = scorer.isComplete;
export const rankAptitudeDomains = scorer.rankTraits;
export const aptitudeScoreToPercent = scorer.scoreToPercent;
