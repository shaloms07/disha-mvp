/**
 * Shared types for the DISHA frontend-only MVP.
 *
 * These mirror SPEC.md Section 4. A few extra fields (sessionToken, orderId,
 * completedAt) are stored alongside the spec shape because the demo flow needs
 * to carry them between screens; they are all optional.
 */

export type RiasecType = "R" | "I" | "A" | "S" | "E" | "C";

export const RIASEC_TYPES: RiasecType[] = ["R", "I", "A", "S", "E", "C"];

export const RIASEC_LABELS: Record<RiasecType, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

export interface Question {
  id: number;
  text: string;
  type: RiasecType;
}

export interface CareerRoadmap {
  exams: string[];
  collegesOrPaths: string[];
  steps: string[];
}

export interface CareerProfile {
  id: string;
  title: string;
  description: string;
  /** 1-10 scale per RIASEC type */
  profile: Record<RiasecType, number>;
  roadmap?: CareerRoadmap;
}

export interface SelectedTiers {
  detailedReport: boolean;
  roadmap: boolean;
  consultation: boolean;
}

export interface SessionState {
  parentName: string;
  parentMobile: string;
  childName: string;
  childClass: string;
  consentGiven: boolean;
  otpVerified: boolean;
  /** questionId -> Likert score 1-5 */
  responses: Record<number, number>;
  /** computed totals, 10-50 per type */
  scores?: Record<RiasecType, number>;
  selectedTiers: SelectedTiers;

  /** Demo-flow extras (not part of the spec's core shape) */
  sessionToken?: string;
  orderId?: string;
  completedAt?: string;

  /* ---- School pilot fields (SCHOOL_ADMIN_SPEC.md Section 3) --------------
     All optional. Present only when the registration arrived through a
     school-issued link or a school code; absent for individual B2C sessions,
     which keep behaving exactly as they do today. */

  /** Set when this registration came via a school-issued link or school code */
  schoolId?: string;
  /** "10-A" — which section this student belongs to, when it is known */
  classId?: string;
  /** Exactly what the parent typed on /register, kept for display/debugging */
  schoolCode?: string;
  /** Optional: the career/field the parent already has in mind for the child */
  parentStatedPreference?: string;

  /* ---- Extra modules, run only for school-tagged sessions (Section 7) ----
     Same shape as `responses`/`scores` above, one pair per module. */

  aptitudeResponses?: Record<number, number>;
  aptitudeScores?: Record<AptitudeDomain, number>;

  personalityResponses?: Record<number, number>;
  personalityScores?: Record<BigFiveTrait, number>;

  workValuesResponses?: Record<number, number>;
  workValuesScores?: Record<WorkValue, number>;
}

/** Input accepted by mockRegisterSession */
export interface RegistrationInput {
  parentName: string;
  parentMobile: string;
  childName: string;
  childClass: string;
  /** Optional school code typed by the parent (SCHOOL_ADMIN_SPEC.md Section 6) */
  schoolCode?: string;
  /** Optional career the parent has in mind, for the dissonance index */
  parentStatedPreference?: string;
}

/** One ranked career, produced by lib/matching.ts */
export interface CareerMatch {
  career: CareerProfile;
  /** cosine similarity, 0-1 */
  matchScore: number;
  /** derived 1-10 star rating */
  stars: number;
}

/* ==========================================================================
   School pilot (B2B) — SCHOOL_ADMIN_SPEC.md Sections 3 and 7.

   Everything below is additive. A session with no `schoolId` is an ordinary
   individual B2C session and behaves exactly as it did before this file grew.
   ========================================================================== */

/** Who is looking at a /school dashboard. Simulated client-side, never enforced. */
export type Role = "principal" | "teacher" | "parent";

export interface School {
  id: string;
  name: string;
  board: "CBSE" | "ICSE" | "IB" | "State";
  /**
   * The code a parent can type on /register instead of using a school-issued
   * link. Accepted with an optional section suffix, e.g. "BVMNGP26-10A".
   */
  code: string;
  city?: string;
}

export interface SchoolClass {
  /** "10-A" — also the value stored on SessionState.classId */
  id: string;
  grade: number; // 8-12
  section: string; // "A", "B", ...
  teacherName: string;
}

/* ------------------------------------------------- module trait vocabularies */

export const APTITUDE_DOMAINS = [
  "numerical",
  "verbal",
  "spatial",
  "mechanical",
  "logical",
] as const;
export type AptitudeDomain = (typeof APTITUDE_DOMAINS)[number];

export const APTITUDE_LABELS: Record<AptitudeDomain, string> = {
  numerical: "Numerical",
  verbal: "Verbal",
  spatial: "Spatial",
  mechanical: "Mechanical",
  logical: "Logical / Abstract",
};

export const BIG_FIVE_TRAITS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const;
export type BigFiveTrait = (typeof BIG_FIVE_TRAITS)[number];

export const BIG_FIVE_LABELS: Record<BigFiveTrait, string> = {
  openness: "Openness",
  conscientiousness: "Conscientiousness",
  extraversion: "Extraversion",
  agreeableness: "Agreeableness",
  neuroticism: "Neuroticism",
};

export const WORK_VALUES = [
  "stability",
  "independence",
  "recognition",
  "helping",
  "creativity",
  "leadership",
] as const;
export type WorkValue = (typeof WORK_VALUES)[number];

export const WORK_VALUE_LABELS: Record<WorkValue, string> = {
  stability: "Stability & Security",
  independence: "Independence",
  recognition: "Recognition",
  helping: "Helping Others",
  creativity: "Creativity",
  leadership: "Leadership",
};

/** Shared shape of the three new modules' item sets (same idea as Question) */
export interface TraitQuestion<TTrait extends string> {
  id: number;
  text: string;
  trait: TTrait;
}

export type AptitudeQuestion = TraitQuestion<AptitudeDomain>;
export type PersonalityQuestion = TraitQuestion<BigFiveTrait>;
export type WorkValuesQuestion = TraitQuestion<WorkValue>;

/** The four assessment modules a school-tagged session runs through, in order */
export const MODULE_IDS = [
  "interest",
  "aptitude",
  "personality",
  "workValues",
] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export const MODULE_LABELS: Record<ModuleId, string> = {
  interest: "Interest (RIASEC)",
  aptitude: "Aptitude",
  personality: "Personality",
  workValues: "Work Values",
};

/** The SessionState keys a module reads and writes, so the test screen and the
 *  session store can address any of the four modules uniformly. */
export type ModuleResponsesKey =
  | "responses"
  | "aptitudeResponses"
  | "personalityResponses"
  | "workValuesResponses";

export type ModuleScoresKey =
  | "scores"
  | "aptitudeScores"
  | "personalityScores"
  | "workValuesScores";
