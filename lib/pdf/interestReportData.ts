/**
 * Data shaping for the Tier 1 "Career Match Report" PDF
 * (lib/pdf/InterestReportDocument.tsx) - the paid ₹299 report, built from the
 * free RIASEC test alone. Deliberately lighter than lib/pdf/reportData.ts's
 * BaseReportData: that shape requires aptitude/behavioral/work-value scores
 * from the Deep-Dive modules, which no Tier 1-only session has.
 *
 * Careers are ranked here on interests only (lib/matching.ts) - the Complete
 * Career Report re-ranks them on interest + ability + personality. Streams use
 * the same stream profiles the school dashboards match against
 * (lib/school/streams.ts), and the roadmap preview comes straight from each
 * career's own entry in data/careers.json.
 */

import type { RiasecType } from "@/types";
import { RIASEC_LABELS } from "@/types";
import { CAREERS, matchCareers, matchPercent } from "@/lib/matching";
import { MAX_TYPE_SCORE, getHollandCode, rankTypes, scoreToPercent } from "@/lib/scoring";
import { STREAMS, matchStreams } from "@/lib/school/streams";
import { assessmentIdFrom, type InterestRow } from "./reportData";
import { buildInterestInterpretation } from "./reportInterpretation";

export interface CareerMatchRow {
  id: string;
  title: string;
  description: string;
  /** 1-10, lib/matching.ts's star rating */
  stars: number;
  percent: number;
  /** From the career's roadmap entry in data/careers.json, when it has one */
  schoolSubjects: string[];
}

export interface StreamRow {
  id: string;
  title: string;
  description: string;
  percent: number;
}

export interface RoadmapPreview {
  title: string;
  eligibility?: string;
  schoolSubjects: string[];
  exams: string[];
  paths: string[];
  firstSteps: string[];
}

export interface InterestReportData {
  childName: string;
  who: string;
  generatedOn: string;
  assessmentId: string;
  hollandCode: string;
  interestRows: InterestRow[];
  interest: ReturnType<typeof buildInterestInterpretation>;
  careerMatches: CareerMatchRow[];
  streams: StreamRow[];
  roadmapPreview: RoadmapPreview[];
  /** A sample report for a fictional student - labelled as such throughout */
  sample: boolean;
}

export interface BuildInterestReportDataInput {
  childName: string;
  orderId?: string;
  scores: Record<RiasecType, number>;
  sample?: boolean;
}

/** How many of the top matches get a roadmap preview page entry */
export const ROADMAP_PREVIEW_COUNT = 3;

export function buildInterestReportData(input: BuildInterestReportDataInput): InterestReportData {
  const { childName, orderId, scores, sample = false } = input;
  const who = childName || "You";

  const ranked = rankTypes(scores);
  const interestRows: InterestRow[] = ranked.map((type) => ({
    type,
    label: RIASEC_LABELS[type],
    score: scores[type],
    max: MAX_TYPE_SCORE[type],
    percent: scoreToPercent(scores[type], type),
  }));

  const matches = matchCareers(scores, CAREERS);
  const careerMatches: CareerMatchRow[] = matches.map((m) => ({
    id: m.career.id,
    title: m.career.title,
    description: m.career.description,
    stars: m.stars,
    percent: matchPercent(m.matchScore),
    schoolSubjects: m.career.roadmap?.schoolSubjects ?? [],
  }));

  const streams: StreamRow[] = matchStreams(scores).map((m) => ({
    id: m.career.id,
    title: m.career.title,
    description: STREAMS.find((s) => s.id === m.career.id)?.description ?? m.career.description,
    percent: matchPercent(m.matchScore),
  }));

  const roadmapPreview: RoadmapPreview[] = matches.slice(0, ROADMAP_PREVIEW_COUNT).map((m) => {
    const roadmap = m.career.roadmap;
    return {
      title: m.career.title,
      eligibility: roadmap?.eligibility,
      schoolSubjects: roadmap?.schoolSubjects ?? [],
      exams: roadmap?.exams ?? [],
      paths: roadmap?.collegesOrPaths ?? [],
      firstSteps: (roadmap?.steps ?? []).slice(0, 2),
    };
  });

  return {
    childName,
    who,
    generatedOn: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    assessmentId: sample ? "SAMPLE REPORT" : assessmentIdFrom(orderId, childName),
    hollandCode: getHollandCode(scores),
    interestRows,
    interest: buildInterestInterpretation(interestRows, who),
    careerMatches,
    streams,
    roadmapPreview,
    sample,
  };
}

/* ------------------------------------------------------------- sample --- */

/** A fictional student for the "View a sample report" button on /results. */
export const SAMPLE_STUDENT = {
  childName: "Aarav",
  scores: { R: 4, I: 10, A: 9, S: 6, E: 5, C: 2 } as Record<RiasecType, number>,
};

export function buildSampleInterestReportData(): InterestReportData {
  return buildInterestReportData({ ...SAMPLE_STUDENT, sample: true });
}
