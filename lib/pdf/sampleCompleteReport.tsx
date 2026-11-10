/**
 * The sample Complete Career Report - the exact PDF a ₹999 buyer gets
 * (lib/pdf/DeepDiveRoadmapDocument.tsx), built for a fictional student and
 * watermarked SAMPLE REPORT on every page, so a page screenshotted on its own
 * can't pass for a real report. Same fictional student as the Career Match
 * Report's sample (lib/pdf/interestReportData.ts's SAMPLE_STUDENT), so the
 * two samples tell one consistent story.
 *
 * Every score below is a valid result on each test's own scale: aptitude and
 * behaviour are placed as a share of each domain's/trait's real range, so a
 * change to the question banks can't push them out of bounds.
 */

import { APTITUDE_MCQ_MAX_SCORE } from "@/lib/deepAptitudeScoring";
import { SJT_MAX_SCORE, SJT_MIN_SCORE } from "@/lib/sjtScoring";
import type { DeepAptitudeDomain, DeepWorkValue, SjtTrait } from "@/types";
import { buildDeepDiveReportData } from "./deepDiveReportData";
import { DeepDiveRoadmapDocument } from "./DeepDiveRoadmapDocument";
import { SAMPLE_STUDENT } from "./interestReportData";
import { buildRoadmapReportData } from "./roadmapReportData";

/** Matches components/DownloadReportButtons.tsx, so the sample is the same length as a real report */
const CAREER_COUNT = 5;
const ROADMAP_CAREER_COUNT = 3;
const SAMPLE_CLASS = "Class 10";

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

/** The sample as a ready-to-render <Document> element (lib/pdf/download.ts) */
export function buildSampleCompleteReportDocument() {
  const scores = SAMPLE_STUDENT.scores;
  const data = buildDeepDiveReportData({
    childName: SAMPLE_STUDENT.childName,
    scores,
    aptitudeScores: mapShares(APTITUDE_SHARE, (domain, share) => Math.round(APTITUDE_MCQ_MAX_SCORE[domain] * share)),
    sjtScores: mapShares(BEHAVIOUR_SHARE, (trait, share) =>
      Math.round(SJT_MIN_SCORE[trait] + (SJT_MAX_SCORE[trait] - SJT_MIN_SCORE[trait]) * share),
    ),
    workValueScores: WORK_VALUES,
    attentionOk: true,
    careerCount: CAREER_COUNT,
    includeRoadmap: true,
    sample: true,
  });
  const roadmap = buildRoadmapReportData({
    base: data.base,
    studentScores: scores,
    childClass: SAMPLE_CLASS,
    roadmapCareerCount: ROADMAP_CAREER_COUNT,
  });
  return <DeepDiveRoadmapDocument data={data} roadmap={roadmap} />;
}
