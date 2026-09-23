/**
 * Base data shaping shared by both PDF reports (the standalone Deep-Dive
 * Report and the Deep-Dive + Roadmap Report) — see lib/pdf/deepDiveReportData.ts
 * and lib/pdf/roadmapReportData.ts. Every number here comes straight from the
 * app's existing scoring/matching modules; nothing is computed or invented
 * for presentation purposes.
 */

import type {
  CareerMatch,
  CareerRoadmap,
  DeepAptitudeDomain,
  DeepWorkValue,
  RiasecType,
  SjtTrait,
} from "@/types";
import { DEEP_APTITUDE_LABELS, DEEP_WORK_VALUE_LABELS, SJT_TRAIT_LABELS } from "@/types";
import { MAX_TYPE_SCORE, getHollandCode, rankTypes, scoreToPercent } from "@/lib/scoring";
import { RIASEC_LABELS } from "@/types";
import {
  APTITUDE_MCQ_MAX_SCORE,
  aptitudeMcqScoreToPercent,
  rankAptitudeMcqDomains,
} from "@/lib/deepAptitudeScoring";
import { SJT_MAX_SCORE, SJT_MIN_SCORE, rankSjtTraits, sjtScoreToPercent } from "@/lib/sjtScoring";
import {
  DEEP_WORK_VALUES_MAX_SCORE,
  deepWorkValueScoreToPercent,
  rankDeepWorkValues,
} from "@/lib/deepWorkValuesScoring";
import { getTopMatches, matchPercent } from "@/lib/matching";

export interface InterestRow {
  type: RiasecType;
  label: string;
  score: number;
  max: number;
  percent: number;
}

export interface AptitudeRow {
  domain: DeepAptitudeDomain;
  label: string;
  value: number;
  max: number;
  percent: number;
}

export interface BehavioralRow {
  trait: SjtTrait;
  label: string;
  value: number;
  min: number;
  max: number;
  percent: number;
}

export interface WorkValueRow {
  key: DeepWorkValue;
  label: string;
  value: number;
  max: number;
  percent: number;
}

export interface CareerRow {
  id: string;
  rank: number;
  title: string;
  description: string;
  /** Real cosine-similarity-derived score from lib/matching.ts, 0-1 */
  matchScore: number;
  matchPercent: number;
  stars: number;
  /** The career's own RIASEC profile, for computing which types it shares with the student */
  profile: Record<RiasecType, number>;
  /** Only populated when the caller opts in (Roadmap report) — never read by the standalone report */
  roadmap?: CareerRoadmap;
}

export interface BaseReportData {
  childName: string;
  who: string;
  generatedOn: string;
  assessmentId: string;
  hollandCode: string;
  interestRows: InterestRow[];
  aptitudeRows: AptitudeRow[];
  behavioralRows: BehavioralRow[];
  workValueRows: WorkValueRow[];
  careers: CareerRow[];
  attentionOk?: boolean;
}

export interface BuildBaseReportDataInput {
  childName: string;
  orderId?: string;
  scores: Record<RiasecType, number>;
  aptitudeScores: Record<DeepAptitudeDomain, number>;
  sjtScores: Record<SjtTrait, number>;
  workValueScores: Record<DeepWorkValue, number>;
  attentionOk?: boolean;
  careerCount?: number;
  includeRoadmap?: boolean;
}

function assessmentIdFrom(orderId: string | undefined, childName: string): string {
  if (orderId) return `DISHA-${orderId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`;
  const seed = (childName || "guest").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `DISHA-${(seed.slice(0, 4) || "DEMO")}${datePart.slice(-4)}`;
}

export function buildBaseReportData(input: BuildBaseReportDataInput): BaseReportData {
  const {
    childName,
    orderId,
    scores,
    aptitudeScores,
    sjtScores,
    workValueScores,
    attentionOk,
    careerCount = 5,
    includeRoadmap = false,
  } = input;

  const rankedInterest = rankTypes(scores);
  const interestRows: InterestRow[] = rankedInterest.map((type) => ({
    type,
    label: RIASEC_LABELS[type],
    score: scores[type],
    max: MAX_TYPE_SCORE[type],
    percent: scoreToPercent(scores[type], type),
  }));

  const aptitudeRows: AptitudeRow[] = rankAptitudeMcqDomains(aptitudeScores).map((domain) => ({
    domain,
    label: DEEP_APTITUDE_LABELS[domain],
    value: aptitudeScores[domain],
    max: APTITUDE_MCQ_MAX_SCORE[domain],
    percent: aptitudeMcqScoreToPercent(aptitudeScores[domain], domain),
  }));

  const behavioralRows: BehavioralRow[] = rankSjtTraits(sjtScores).map((trait) => ({
    trait,
    label: SJT_TRAIT_LABELS[trait],
    value: sjtScores[trait],
    min: SJT_MIN_SCORE[trait],
    max: SJT_MAX_SCORE[trait],
    percent: sjtScoreToPercent(sjtScores[trait], trait),
  }));

  const workValueRows: WorkValueRow[] = rankDeepWorkValues(workValueScores).map((key) => ({
    key,
    label: DEEP_WORK_VALUE_LABELS[key],
    value: workValueScores[key],
    max: DEEP_WORK_VALUES_MAX_SCORE,
    percent: deepWorkValueScoreToPercent(workValueScores[key]),
  }));

  const matches: CareerMatch[] = getTopMatches(scores, careerCount);
  const careers: CareerRow[] = matches.map((match, i) => ({
    id: match.career.id,
    rank: i + 1,
    title: match.career.title,
    description: match.career.description,
    matchScore: match.matchScore,
    matchPercent: matchPercent(match.matchScore),
    stars: match.stars,
    profile: match.career.profile,
    roadmap: includeRoadmap ? match.career.roadmap : undefined,
  }));

  return {
    childName,
    who: childName || "You",
    generatedOn: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    assessmentId: assessmentIdFrom(orderId, childName),
    hollandCode: getHollandCode(scores),
    interestRows,
    aptitudeRows,
    behavioralRows,
    workValueRows,
    careers,
    attentionOk,
  };
}
