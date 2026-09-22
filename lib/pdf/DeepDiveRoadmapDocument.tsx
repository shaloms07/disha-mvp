/**
 * The Deep-Dive Assessment + Career Roadmap Report (Report B). Explicitly
 * Report A's own 12 pages, reused unmodified, plus one appended page per
 * matched career with the roadmap detail (entrance exams, courses,
 * step-by-step plan) that the standalone report deliberately omits. Built
 * from the exact same BaseReportData/DeepDiveReportData as Report A — see
 * lib/pdf/deepDiveReportData.ts — with `includeRoadmap: true` so each
 * CareerRow carries its roadmap.
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
import { RoadmapCareerPage } from "./roadmapSections";
import { buildKeyTakeaways, buildNextSteps } from "./reportInterpretation";
import type { DeepDiveReportData } from "./deepDiveReportData";

export function DeepDiveRoadmapDocument({ data }: { data: DeepDiveReportData }) {
  const keyTakeaways = buildKeyTakeaways(data.base, data.profileStrengths, data.base.careers[0]?.title);
  const nextSteps = buildNextSteps();
  const careersWithRoadmap = data.base.careers.filter((c) => c.roadmap);

  return (
    <Document title={`${data.base.childName || "Student"} - DISHA Deep-Dive + Career Roadmap Report`}>
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
        roadmapTransitionNote="The following pages provide your detailed Career Roadmap — entrance exams, courses and a step-by-step plan for each of your top career matches."
      />
      {careersWithRoadmap.map((career, i) => (
        <RoadmapCareerPage key={career.id} data={data} career={career} isFirst={i === 0} />
      ))}
    </Document>
  );
}
