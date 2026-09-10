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
}

/** Input accepted by mockRegisterSession */
export interface RegistrationInput {
  parentName: string;
  parentMobile: string;
  childName: string;
  childClass: string;
}

/** One ranked career, produced by lib/matching.ts */
export interface CareerMatch {
  career: CareerProfile;
  /** cosine similarity, 0-1 */
  matchScore: number;
  /** derived 1-10 star rating */
  stars: number;
}
