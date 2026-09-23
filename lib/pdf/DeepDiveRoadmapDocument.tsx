/**
 * The Deep-Dive Assessment + Career Roadmap Report (Report B / Product 2) —
 * `generateDeepDiveAndRoadmapReport` in spec terms. Structurally:
 *
 *   PART I  — the exact same 12 pages as the standalone Deep-Dive Report
 *             (Product 1 / lib/pdf/DeepDiveDocument.tsx = `generateDeepDiveReport`),
 *             reused unmodified so the two products can never drift apart.
 *   PART II — Career Roadmap (`generateRoadmapReport`'s output, appended):
 *             a transition page, an optional multi-career comparison page,
 *             three pages per selected career (overview, plan, action —
 *             split apart deliberately rather than left to overflow), and a
 *             combined closing page with the required disclaimer.
 *
 * Entrance exams, education routes and step-by-step plans live ONLY in Part
 * II (lib/pdf/roadmapSections.tsx) — Part I's page templates
 * (lib/pdf/deepDiveSections.tsx) never render them, which is what keeps
 * Product 1 free of roadmap content even though it's built from the same
 * underlying data as Product 2.
 */

import { Fragment } from "react";
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
import {
  CombinedNextStepsPage,
  RoadmapCareerActionPage,
  RoadmapCareerOverviewPage,
  RoadmapCareerPlanPage,
  RoadmapComparisonPage,
  RoadmapTransitionPage,
} from "./roadmapSections";
import { buildKeyTakeaways, buildNextSteps } from "./reportInterpretation";
import type { DeepDiveReportData } from "./deepDiveReportData";
import type { RoadmapReportData } from "./roadmapReportData";

export function DeepDiveRoadmapDocument({
  data,
  roadmap,
}: {
  data: DeepDiveReportData;
  roadmap: RoadmapReportData;
}) {
  const keyTakeaways = buildKeyTakeaways(data.base, data.profileStrengths, data.base.careers[0]?.title);
  const nextSteps = buildNextSteps();
  const total = roadmap.careers.length;

  return (
    <Document title={`${data.base.childName || "Student"} - DISHA Deep-Dive + Career Roadmap Report`}>
      {/* ---------------------------------------------------------- Part I */}
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
      <ConclusionPage
        data={data}
        keyTakeaways={keyTakeaways}
        nextSteps={nextSteps}
        showRoadmapUpsell={false}
        roadmapTransitionNote="Part II of this report translates these findings into a practical roadmap for each of your closest career matches."
      />

      {/* --------------------------------------------------------- Part II */}
      <RoadmapTransitionPage data={data} />
      {total > 1 && <RoadmapComparisonPage data={data} roadmap={roadmap} />}
      {roadmap.careers.map((rc, i) => (
        <Fragment key={rc.career.id}>
          <RoadmapCareerOverviewPage data={data} rc={rc} roadmapIndex={i + 1} total={total} />
          <RoadmapCareerPlanPage data={data} rc={rc} roadmapIndex={i + 1} total={total} />
          <RoadmapCareerActionPage data={data} rc={rc} roadmapIndex={i + 1} total={total} />
        </Fragment>
      ))}
      <CombinedNextStepsPage data={data} roadmap={roadmap} />
    </Document>
  );
}
