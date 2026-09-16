/**
 * The module sequence /test walks through — SCHOOL_ADMIN_SPEC.md Section 7.
 *
 * A session with no schoolId runs one module (Interest/RIASEC) and is exactly
 * the 60-question consumer test that shipped. A school-tagged session runs all
 * four, in order, before /results.
 *
 * Each entry says everything the test screen needs to render and store a
 * module, so the screen itself contains no per-module branching beyond "which
 * modules does this session run".
 */

import {
  APTITUDE_QUESTIONS,
  APTITUDE_SCALE,
  getAptitudeAnsweredCount,
  isAptitudeComplete,
  scoreAptitude,
} from "./aptitudeScoring";
import {
  PERSONALITY_QUESTIONS,
  PERSONALITY_SCALE,
  getPersonalityAnsweredCount,
  isPersonalityComplete,
  scorePersonality,
} from "./personalityScoring";
import { QUESTIONS, getAnsweredCount, isTestComplete, scoreResponses } from "./scoring";
import { LIKERT_SCALE } from "./likert";
import type { ScaleOption } from "./traitScoring";
import {
  WORK_VALUES_QUESTIONS,
  WORK_VALUES_SCALE,
  getWorkValuesAnsweredCount,
  isWorkValuesComplete,
  scoreWorkValues,
} from "./workValuesScoring";
import type {
  ModuleId,
  ModuleResponsesKey,
  ModuleScoresKey,
  SessionState,
} from "@/types";

/** The test screen only ever needs an id and the wording of an item */
export interface ModuleItem {
  id: number;
  text: string;
}

export interface TestModule {
  id: ModuleId;
  /** Short name, for the progress header and the dashboards */
  label: string;
  /** The question put above the card deck */
  heading: string;
  subhead: string;
  /** One line shown on the hand-off screen before this module starts */
  intro: string;
  items: ModuleItem[];
  scale: readonly ScaleOption[];
  responsesKey: ModuleResponsesKey;
  scoresKey: ModuleScoresKey;
  /**
   * Scores are `Record<string, number>` here because the four modules have
   * different trait vocabularies. Each module's own scoring lib keeps the
   * precise type; this registry is the one place that erases it, so the test
   * screen can treat all four the same.
   */
  score(responses: Record<number, number>): Record<string, number>;
  answeredCount(responses: Record<number, number>): number;
  isComplete(responses: Record<number, number>): boolean;
}

export const INTEREST_MODULE: TestModule = {
  id: "interest",
  label: "Interests",
  heading: "How much would you enjoy doing this?",
  subhead: "There are no right answers. Pick one and the next card comes up.",
  intro: "Sixty things people do at work. Say how much each one appeals to you.",
  items: QUESTIONS,
  scale: LIKERT_SCALE,
  responsesKey: "responses",
  scoresKey: "scores",
  score: scoreResponses,
  answeredCount: getAnsweredCount,
  isComplete: isTestComplete,
};

export const APTITUDE_MODULE: TestModule = {
  id: "aptitude",
  label: "Aptitude",
  heading: "How easy do you find this?",
  subhead:
    "Not a test — nobody is marking this. Answer with how it actually feels to you.",
  intro:
    "Fifteen everyday tasks. Say how easy or hard each one feels — this asks how confident you are, not whether you get it right.",
  items: APTITUDE_QUESTIONS,
  scale: APTITUDE_SCALE,
  responsesKey: "aptitudeResponses",
  scoresKey: "aptitudeScores",
  score: scoreAptitude,
  answeredCount: getAptitudeAnsweredCount,
  isComplete: isAptitudeComplete,
};

export const PERSONALITY_MODULE: TestModule = {
  id: "personality",
  label: "Personality",
  heading: "How much does this sound like you?",
  subhead: "Answer for how you usually are, not how you would like to be.",
  intro:
    "Fifteen statements about how you usually are. There is no better or worse answer here.",
  items: PERSONALITY_QUESTIONS,
  scale: PERSONALITY_SCALE,
  responsesKey: "personalityResponses",
  scoresKey: "personalityScores",
  score: scorePersonality,
  answeredCount: getPersonalityAnsweredCount,
  isComplete: isPersonalityComplete,
};

export const WORK_VALUES_MODULE: TestModule = {
  id: "workValues",
  label: "Work values",
  heading: "How important is this to you in a future job?",
  subhead: "Everyone weighs these differently. Go with your first instinct.",
  intro:
    "Last one. Eighteen things a job can offer — say how much each one matters to you.",
  items: WORK_VALUES_QUESTIONS,
  scale: WORK_VALUES_SCALE,
  responsesKey: "workValuesResponses",
  scoresKey: "workValuesScores",
  score: scoreWorkValues,
  answeredCount: getWorkValuesAnsweredCount,
  isComplete: isWorkValuesComplete,
};

/** Interest first — it is the module the consumer product is built around. */
export const ALL_MODULES: TestModule[] = [
  INTEREST_MODULE,
  APTITUDE_MODULE,
  PERSONALITY_MODULE,
  WORK_VALUES_MODULE,
];

/**
 * Which modules this session runs.
 *
 * The branch is deliberately narrow: only a schoolId turns the extra three on.
 * An individual parent's session must not pick up ~48 more questions, since
 * that would change the consumer funnel's completion and conversion behaviour.
 */
export function modulesForSession(
  session: Pick<SessionState, "schoolId">,
): TestModule[] {
  return session.schoolId ? ALL_MODULES : [INTEREST_MODULE];
}

export function isSchoolSession(
  session: Pick<SessionState, "schoolId">,
): boolean {
  return Boolean(session.schoolId);
}

/** The answers already stored for one module */
export function responsesFor(
  session: SessionState,
  module: TestModule,
): Record<number, number> {
  return session[module.responsesKey] ?? {};
}

/** The scores already stored for one module, if it has been completed */
export function scoresFor(
  session: SessionState,
  module: TestModule,
): Record<string, number> | undefined {
  return session[module.scoresKey];
}
