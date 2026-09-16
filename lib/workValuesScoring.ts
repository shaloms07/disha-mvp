/**
 * Work Values module — SCHOOL_ADMIN_SPEC.md Section 7.
 *
 * Six workplace-value dimensions, 18 items, 3 each, same Likert/sum pattern as
 * RIASEC. Unlike Aptitude and Personality there is no better-or-worse here:
 * a high Stability score is not a weaker result than a high Creativity one, and
 * anywhere these are shown they should be ranked, never graded.
 */

import workValuesData from "@/data/workvalues-questions.json";
import { WORK_VALUES, type WorkValue, type WorkValuesQuestion } from "@/types";
import { createTraitScorer, type ScaleOption } from "./traitScoring";

export const WORK_VALUES_QUESTIONS = workValuesData as WorkValuesQuestion[];

const scorer = createTraitScorer<WorkValue>(
  WORK_VALUES_QUESTIONS,
  WORK_VALUES,
  "Work Values",
);

/** 18 items, 3 per value, so each value scores 3-15 */
export const WORK_VALUES_TOTAL_QUESTIONS = scorer.TOTAL_QUESTIONS;
export const WORK_VALUES_ITEMS_PER_VALUE = scorer.QUESTIONS_PER_TRAIT;
export const WORK_VALUES_MIN_SCORE = scorer.MIN_TRAIT_SCORE;
export const WORK_VALUES_MAX_SCORE = scorer.MAX_TRAIT_SCORE;
export const WORK_VALUES_QUESTIONS_BY_VALUE = scorer.QUESTIONS_BY_TRAIT;

export const WORK_VALUES_SCALE: readonly ScaleOption[] = [
  { value: 1, label: "Not important to me" },
  { value: 2, label: "Slightly important" },
  { value: 3, label: "Moderately important" },
  { value: 4, label: "Very important" },
  { value: 5, label: "Essential to me" },
] as const;

export const emptyWorkValuesScores = scorer.emptyScores;
export const scoreWorkValues = scorer.scoreResponses;
export const getUnansweredWorkValuesIds = scorer.getUnansweredQuestionIds;
export const getWorkValuesAnsweredCount = scorer.getAnsweredCount;
export const isWorkValuesComplete = scorer.isComplete;
export const rankWorkValues = scorer.rankTraits;
export const workValuesScoreToPercent = scorer.scoreToPercent;
