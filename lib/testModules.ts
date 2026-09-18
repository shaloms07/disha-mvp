/**
 * The module sequence /test walks through.
 *
 * Two independent things can extend the base RIASEC-only run — see
 * modulesForSession() below:
 *   - a schoolId tags the session into the school pilot's four modules
 *     (SCHOOL_ADMIN_SPEC.md Section 7)
 *   - an orderId (a purchased tier) unlocks the paid Deep-Dive Assessment —
 *     Aptitude, Behavioral, Work Values — for an ordinary consumer session
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
  APTITUDE_MCQ_QUESTIONS,
  getAptitudeMcqAnsweredCount,
  isAptitudeMcqComplete,
  scoreAptitudeMcq,
} from "./deepAptitudeScoring";
import {
  DEEP_WORK_VALUES_QUESTIONS,
  DEEP_WORK_VALUES_SCALE,
  getDeepWorkValuesAnsweredCount,
  isDeepWorkValuesComplete,
  scoreDeepWorkValues,
} from "./deepWorkValuesScoring";
import {
  PERSONALITY_QUESTIONS,
  PERSONALITY_SCALE,
  getPersonalityAnsweredCount,
  isPersonalityComplete,
  scorePersonality,
} from "./personalityScoring";
import {
  CHOICE_A,
  CHOICE_B,
  QUESTIONS,
  getAnsweredCount,
  isTestComplete,
  scoreResponses,
} from "./scoring";
import { SJT_QUESTIONS, getSjtAnsweredCount, isSjtComplete, scoreSjt } from "./sjtScoring";
import type { ScaleOption } from "./traitScoring";
import {
  WORK_VALUES_QUESTIONS,
  WORK_VALUES_SCALE,
  getWorkValuesAnsweredCount,
  isWorkValuesComplete,
  scoreWorkValues,
} from "./workValuesScoring";
import type {
  ForcedChoiceOption,
  ModuleId,
  ModuleResponsesKey,
  ModuleScoresKey,
  SessionState,
} from "@/types";

/** A rated statement — the aptitude/personality/workValues modules' shape */
export interface ScaleModuleItem {
  kind: "scale";
  id: number;
  text: string;
}

/** A RIASEC pair — pick the option that appeals more */
export interface ForcedChoiceModuleItem {
  kind: "forcedChoice";
  id: number;
  optionA: ForcedChoiceOption;
  optionB: ForcedChoiceOption;
}

/** An MCQ or a scenario with 4 options — the Deep-Dive Aptitude/Behavioral modules' shape */
export interface MultiOptionModuleItem {
  kind: "multiOption";
  id: number;
  prompt: string;
  options: string[];
}

/** The test screen only ever needs enough to render one card */
export type ModuleItem =
  | ScaleModuleItem
  | ForcedChoiceModuleItem
  | MultiOptionModuleItem;

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
  /** Only meaningful for "scale" items — forced-choice items carry their own options */
  scale?: readonly ScaleOption[];
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
  heading: "Which one appeals more?",
  subhead: "There are no right answers. Pick one and the next card comes up.",
  intro:
    "Thirty-six pairs of things people do at work. Pick whichever side pulls you more.",
  items: QUESTIONS.map(
    (q): ForcedChoiceModuleItem => ({
      kind: "forcedChoice",
      id: q.id,
      optionA: q.optionA,
      optionB: q.optionB,
    }),
  ),
  responsesKey: "responses",
  scoresKey: "scores",
  score: scoreResponses,
  answeredCount: getAnsweredCount,
  isComplete: isTestComplete,
};

export { CHOICE_A, CHOICE_B };

/** The three pilot modules are all rated statements — wrap once, reuse thrice */
function toScaleItems(
  questions: { id: number; text: string }[],
): ScaleModuleItem[] {
  return questions.map((q) => ({ kind: "scale", id: q.id, text: q.text }));
}

export const APTITUDE_MODULE: TestModule = {
  id: "aptitude",
  label: "Aptitude",
  heading: "How easy do you find this?",
  subhead:
    "Not a test — nobody is marking this. Answer with how it actually feels to you.",
  intro:
    "Fifteen everyday tasks. Say how easy or hard each one feels — this asks how confident you are, not whether you get it right.",
  items: toScaleItems(APTITUDE_QUESTIONS),
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
  items: toScaleItems(PERSONALITY_QUESTIONS),
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
  items: toScaleItems(WORK_VALUES_QUESTIONS),
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

/* ==========================================================================
   Deep-Dive Assessment — the paid B2C upsell. Aptitude, then Behavioral,
   then Work Values, matching the 96-item master matrix's own pillar order
   (RIASEC is pulled out of that order since it's given free, upfront).
   ========================================================================== */

export const DEEP_APTITUDE_MODULE: TestModule = {
  id: "deepAptitude",
  label: "Aptitude",
  heading: "Pick the best answer",
  subhead: "There's a right answer to each one, but nobody's timing you.",
  intro:
    "Fifteen quick puzzles — numbers, words and shapes. This one does have right answers.",
  items: APTITUDE_MCQ_QUESTIONS.map(
    (q): MultiOptionModuleItem => ({
      kind: "multiOption",
      id: q.id,
      prompt: q.question,
      options: q.options,
    }),
  ),
  responsesKey: "deepAptitudeResponses",
  scoresKey: "deepAptitudeScores",
  score: scoreAptitudeMcq,
  answeredCount: getAptitudeMcqAnsweredCount,
  isComplete: isAptitudeMcqComplete,
};

export const SJT_MODULE: TestModule = {
  id: "sjt",
  label: "Behavioral",
  heading: "What would you actually do?",
  subhead: "Go with your first instinct — there's no perfect choice.",
  intro: "Thirty quick scenarios about how you tend to handle everyday situations.",
  items: SJT_QUESTIONS.map(
    (q): MultiOptionModuleItem => ({
      kind: "multiOption",
      id: q.id,
      prompt: q.scenario,
      options: q.options,
    }),
  ),
  responsesKey: "sjtResponses",
  scoresKey: "sjtScores",
  score: scoreSjt,
  answeredCount: getSjtAnsweredCount,
  isComplete: isSjtComplete,
};

export const DEEP_WORK_VALUES_MODULE: TestModule = {
  id: "deepWorkValues",
  label: "Work values",
  heading: "How important is this to you?",
  subhead: "Rate each on its own — there's no limit on how many can matter.",
  intro: "Last one. Fifteen things a job can offer — rate how much each matters to you.",
  items: toScaleItems(
    DEEP_WORK_VALUES_QUESTIONS.map((q) => ({ id: q.id, text: q.statement })),
  ),
  scale: DEEP_WORK_VALUES_SCALE,
  responsesKey: "deepWorkValuesResponses",
  scoresKey: "deepWorkValuesScores",
  score: scoreDeepWorkValues,
  answeredCount: getDeepWorkValuesAnsweredCount,
  isComplete: isDeepWorkValuesComplete,
};

/** The three modules sold as the paid "Deep-Dive Assessment" — see /pricing */
export const DEEP_DIVE_MODULES: TestModule[] = [
  DEEP_APTITUDE_MODULE,
  SJT_MODULE,
  DEEP_WORK_VALUES_MODULE,
];

/**
 * Which modules this session runs, and in what order.
 *
 * - schoolId -> the school pilot's four modules (unchanged, pre-dates the
 *   Deep-Dive Assessment and has its own dashboards built on its own
 *   aptitude/personality/workValues vocabularies)
 * - orderId (a completed checkout) -> RIASEC plus the paid Deep-Dive modules.
 *   Checked instead of `selectedTiers` because every paid tier includes the
 *   Deep-Dive Assessment — there's no tier that charges for RIASEC alone.
 * - otherwise -> just RIASEC, exactly the free consumer test that shipped.
 */
export function modulesForSession(
  session: Pick<SessionState, "schoolId" | "orderId">,
): TestModule[] {
  if (session.schoolId) return ALL_MODULES;
  if (session.orderId) return [INTEREST_MODULE, ...DEEP_DIVE_MODULES];
  return [INTEREST_MODULE];
}

export function isSchoolSession(
  session: Pick<SessionState, "schoolId">,
): boolean {
  return Boolean(session.schoolId);
}

/** True once a session has bought into the Deep-Dive Assessment */
export function hasDeepDive(session: Pick<SessionState, "orderId">): boolean {
  return Boolean(session.orderId);
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
