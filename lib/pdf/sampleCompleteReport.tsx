/**
 * The sample Complete Career Report - the exact PDF a ₹999 buyer gets
 * (lib/pdf/DeepDiveRoadmapDocument.tsx), built for a fictional student and
 * watermarked SAMPLE REPORT on every page, so a page screenshotted on its own
 * can't pass for a real report. Same fictional student as the Career Match
 * Report's sample (lib/pdf/interestReportData.ts's SAMPLE_STUDENT), so the
 * two samples tell one consistent story; the Deep-Dive results are
 * lib/sampleDeepDiveScores.ts's.
 */

import { sampleDeepDiveScores } from "@/lib/sampleDeepDiveScores";
import { buildDeepDiveReportData } from "./deepDiveReportData";
import { DeepDiveRoadmapDocument } from "./DeepDiveRoadmapDocument";
import { SAMPLE_STUDENT } from "./interestReportData";
import { buildRoadmapReportData } from "./roadmapReportData";

/** Matches components/DownloadReportButtons.tsx, so the sample is the same length as a real report */
const CAREER_COUNT = 5;
const ROADMAP_CAREER_COUNT = 3;
const SAMPLE_CLASS = "Class 10";

/** The sample as a ready-to-render <Document> element (lib/pdf/download.ts) */
export function buildSampleCompleteReportDocument() {
  const scores = SAMPLE_STUDENT.scores;
  const data = buildDeepDiveReportData({
    childName: SAMPLE_STUDENT.childName,
    scores,
    ...sampleDeepDiveScores(),
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
