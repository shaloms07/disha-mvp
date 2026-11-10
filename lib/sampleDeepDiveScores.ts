/**
 * A fictional student's Deep-Dive results - the same profile behind the
 * sample Complete Career Report PDF (lib/pdf/sampleCompleteReport.tsx), and
 * what /demo loads to jump straight to the results-ready page.
 *
 * Every score is a valid result on each test's own scale: aptitude and
 * behaviour are placed as a share of each domain's/trait's real range, so a
 * change to the question banks can't push them out of bounds.
 */

import { APTITUDE_MCQ_MAX_SCORE } from "@/lib/deepAptitudeScoring";
import { SJT_MAX_SCORE, SJT_MIN_SCORE } from "@/lib/sjtScoring";
import type { DeepAptitudeDomain, DeepWorkValue, SjtTrait } from "@/types";

/** An Investigative-Artistic student: strongest verbally, curious, values creative freedom */
const APTITUDE_SHARE: Record<DeepAptitudeDomain, number> = { numerical: 0.67, verbal: 0.8, spatial: 0.5 };

const BEHAVIOUR_SHARE: Record<SjtTrait, number> = {
  openness: 0.85,
  conscientiousness: 0.65,
  extraversion: 0.45,
  agreeableness: 0.7,
  neuroticism: 0.3,
};

/** On the 1-5 scale lib/deepWorkValuesScoring.ts scores on */
const WORK_VALUES: Record<DeepWorkValue, number> = {
  Creative_Freedom: 4.6,
  Intellectual_Challenge: 4.4,
  Continuous_Learning: 4.2,
  Autonomy: 4.0,
  Social_Impact: 3.6,
  Collaboration: 3.5,
  Variety_Dynamics: 3.4,
  WorkLife_Balance: 3.2,
  Travel_Opportunities: 3.1,
  Recognition: 3.0,
  Job_Security: 3.0,
  Financial_Reward: 2.8,
  Entrepreneurial_Power: 2.6,
  Leadership_Status: 2.4,
  Structured_Routine: 2.0,
};

function mapShares<K extends string>(shares: Record<K, number>, toScore: (key: K, share: number) => number) {
  return Object.fromEntries(
    (Object.entries(shares) as [K, number][]).map(([key, share]) => [key, toScore(key, share)]),
  ) as Record<K, number>;
}

export function sampleDeepDiveScores(): {
  aptitudeScores: Record<DeepAptitudeDomain, number>;
  sjtScores: Record<SjtTrait, number>;
  workValueScores: Record<DeepWorkValue, number>;
} {
  return {
    aptitudeScores: mapShares(APTITUDE_SHARE, (domain, share) => Math.round(APTITUDE_MCQ_MAX_SCORE[domain] * share)),
    sjtScores: mapShares(BEHAVIOUR_SHARE, (trait, share) =>
      Math.round(SJT_MIN_SCORE[trait] + (SJT_MAX_SCORE[trait] - SJT_MIN_SCORE[trait]) * share),
    ),
    workValueScores: { ...WORK_VALUES },
  };
}
