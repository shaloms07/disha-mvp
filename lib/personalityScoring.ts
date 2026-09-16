/**
 * Personality module (Big Five / OCEAN) — SCHOOL_ADMIN_SPEC.md Section 7.
 *
 * 15 items, 3 per trait, scored as a plain sum like RIASEC. Every item is
 * keyed positively — there are no reverse-scored items — so this is a
 * simplified pilot instrument, not a validated Big Five inventory. Neuroticism
 * in particular is a sensitive thing to put in front of a school; it is scored
 * here because the brief names the five factors, and the dashboards should
 * present it as "how much pressure this student reports feeling", not as a
 * clinical label.
 */

import personalityData from "@/data/personality-questions.json";
import {
  BIG_FIVE_TRAITS,
  type BigFiveTrait,
  type PersonalityQuestion,
} from "@/types";
import { createTraitScorer, type ScaleOption } from "./traitScoring";

export const PERSONALITY_QUESTIONS = personalityData as PersonalityQuestion[];

const scorer = createTraitScorer<BigFiveTrait>(
  PERSONALITY_QUESTIONS,
  BIG_FIVE_TRAITS,
  "Personality",
);

/** 15 items, 3 per trait, so each trait scores 3-15 */
export const PERSONALITY_TOTAL_QUESTIONS = scorer.TOTAL_QUESTIONS;
export const PERSONALITY_ITEMS_PER_TRAIT = scorer.QUESTIONS_PER_TRAIT;
export const PERSONALITY_MIN_SCORE = scorer.MIN_TRAIT_SCORE;
export const PERSONALITY_MAX_SCORE = scorer.MAX_TRAIT_SCORE;
export const PERSONALITY_QUESTIONS_BY_TRAIT = scorer.QUESTIONS_BY_TRAIT;

export const PERSONALITY_SCALE: readonly ScaleOption[] = [
  { value: 1, label: "Not like me at all" },
  { value: 2, label: "A little like me" },
  { value: 3, label: "Somewhat like me" },
  { value: 4, label: "Mostly like me" },
  { value: 5, label: "Very much like me" },
] as const;

export const emptyPersonalityScores = scorer.emptyScores;
export const scorePersonality = scorer.scoreResponses;
export const getUnansweredPersonalityIds = scorer.getUnansweredQuestionIds;
export const getPersonalityAnsweredCount = scorer.getAnsweredCount;
export const isPersonalityComplete = scorer.isComplete;
export const rankPersonalityTraits = scorer.rankTraits;
export const personalityScoreToPercent = scorer.scoreToPercent;
