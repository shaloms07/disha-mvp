/**
 * The standalone Deep-Dive Assessment Report (Report A) — assessment
 * results, interpretation, integrated profile, career matching and
 * development areas. Deliberately contains no career roadmap detail
 * (entrance exams, colleges, step-by-step plans) — that belongs only to the
 * separate Deep-Dive + Roadmap Report (lib/pdf/DeepDiveRoadmapDocument.tsx),
 * which reuses these exact same 12 pages and appends its own roadmap pages.
 *
 * Twelve fixed-height pages:
 *   1. Cover + Executive Summary
 *   2. How to Read Your Results
 *   3. Vocational Interest Profile
 *   4. Understanding Your Interest Profile
 *   5. Cognitive Aptitude
 *   6. Behavioral / Personality Profile
 *   7. Work Values & Motivators
 *   8. Integrated Career Profile
 *   9. Career Matching
 *   10. Career Comparison
 *   11. Areas to Develop
 *   12. Conclusion + Next Step (introduces, but does not include, the Roadmap report)
 */

import { Document } from "@react-pdf/renderer";
import {
  AptitudePage,
  BehavioralPage,
  CareerComparisonPage,
  CareerMatchingPage,
  ConclusionPage,
  CoverSummaryPage,
  DevelopmentAreasPage,
  HowToReadPage,
  IntegratedProfilePage,
  InterestInterpretationPage,
  InterestProfilePage,
  WorkValuesPage,
} from "./deepDiveSections";
import { buildKeyTakeaways, buildNextSteps } from "./reportInterpretation";
import type { DeepDiveReportData } from "./deepDiveReportData";

export function DeepDiveDocument({ data }: { data: DeepDiveReportData }) {
  const keyTakeaways = buildKeyTakeaways(data.base, data.profileStrengths, data.base.careers[0]?.title);
  const nextSteps = buildNextSteps();

  return (
    <Document title={`${data.base.childName || "Student"} - DISHA Deep-Dive Assessment Report`}>
      <CoverSummaryPage data={data} />
      <HowToReadPage data={data} />
      <InterestProfilePage data={data} />
      <InterestInterpretationPage data={data} />
      <AptitudePage data={data} />
      <BehavioralPage data={data} />
      <WorkValuesPage data={data} />
      <IntegratedProfilePage data={data} />
      <CareerMatchingPage data={data} />
      <CareerComparisonPage data={data} />
      <DevelopmentAreasPage data={data} />
      <ConclusionPage data={data} keyTakeaways={keyTakeaways} nextSteps={nextSteps} showRoadmapUpsell />
    </Document>
  );
}
