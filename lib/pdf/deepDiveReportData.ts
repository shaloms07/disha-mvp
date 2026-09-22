/**
 * Assembles lib/pdf/reportData.ts's BaseReportData with the interpretive
 * copy from lib/pdf/reportInterpretation.ts into the one object the Deep-Dive
 * Report's page templates (lib/pdf/deepDiveSections.tsx) read. This is the
 * data both PDF reports are built from — see lib/pdf/DeepDiveDocument.tsx and
 * lib/pdf/DeepDiveRoadmapDocument.tsx.
 */

import type { DeepAptitudeDomain, DeepWorkValue, RiasecType, SjtTrait } from "@/types";
import { rankTypes } from "@/lib/scoring";
import { buildBaseReportData, type BaseReportData, type CareerRow } from "./reportData";
import {
  type CareerExplanation,
  type DevelopmentSignal,
  type ProfileGlance,
  buildExecutiveSummary,
  buildIntegratedNarrative,
  buildInterestInterpretation,
  buildAptitudeNarrative,
  buildProfileAtAGlance,
  buildProfileStrengths,
  buildSupportingContext,
  buildWorkValuesInterpretation,
  deriveDevelopmentSignals,
  explainCareerMatch,
} from "./reportInterpretation";

export interface DeepDiveReportData {
  base: BaseReportData;
  profileGlance: ProfileGlance[];
  executiveSummary: string;
  interest: ReturnType<typeof buildInterestInterpretation>;
  aptitude: ReturnType<typeof buildAptitudeNarrative>;
  workValues: ReturnType<typeof buildWorkValuesInterpretation>;
  integratedNarrative: string;
  profileStrengths: string[];
  developmentSignals: DevelopmentSignal[];
  careerExplanations: CareerExplanation[];
  careerSupportingContext: string;
}

export interface BuildDeepDiveReportDataInput {
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

export function buildDeepDiveReportData(input: BuildDeepDiveReportDataInput): DeepDiveReportData {
  const base = buildBaseReportData(input);
  const studentRanked = rankTypes(input.scores);

  return {
    base,
    profileGlance: buildProfileAtAGlance(base),
    executiveSummary: buildExecutiveSummary(base),
    interest: buildInterestInterpretation(base.interestRows, base.who),
    aptitude: buildAptitudeNarrative(base.aptitudeRows, base.who),
    workValues: buildWorkValuesInterpretation(base.workValueRows, base.who),
    integratedNarrative: buildIntegratedNarrative(base),
    profileStrengths: buildProfileStrengths(base),
    developmentSignals: deriveDevelopmentSignals(base),
    careerExplanations: base.careers.map((career: CareerRow) => explainCareerMatch(career, studentRanked)),
    careerSupportingContext: buildSupportingContext(base),
  };
}
