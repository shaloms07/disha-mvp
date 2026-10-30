/**
 * The Tier 1 "Career Match Report" PDF (lib/pricing.ts level 1, ₹299) - a
 * standalone 7-page document built from the free RIASEC test alone:
 *
 *   1. Cover + what this report covers (and doesn't)
 *   2. Full six-type interest profile
 *   3. Strengths & growth angles
 *   4. Every career, ranked against the profile
 *   5. Stream direction and subject choices
 *   6. Roadmap preview for the top three careers
 *   7. What the Complete Career Report adds
 *
 * The same document, built from lib/pdf/interestReportData.ts's sample data,
 * is the free "View a sample report" download on /results.
 *
 * Deliberately NOT the same file as lib/pdf/SnapshotDocument.tsx - that one
 * stays the free 1-page snapshot sent over WhatsApp the moment the test
 * completes. Paying for this report must mean getting something beyond that
 * free send, not a reprint of it.
 */

import { Document } from "@react-pdf/renderer";
import { CareerMatchesPage, RoadmapPreviewPage, StreamSubjectsPage } from "./careerMatchSections";
import {
  InterestCoverPage,
  InterestFullProfilePage,
  InterestStrengthsPage,
  InterestUpgradePage,
} from "./interestReportSections";
import type { InterestReportData } from "./interestReportData";

export function InterestReportDocument({ data }: { data: InterestReportData }) {
  return (
    <Document title={`${data.sample ? "Sample - " : ""}${data.childName || "Student"} - My Life Coach Career Match Report`}>
      <InterestCoverPage data={data} />
      <InterestFullProfilePage data={data} />
      <InterestStrengthsPage data={data} />
      <CareerMatchesPage data={data} />
      <StreamSubjectsPage data={data} />
      <RoadmapPreviewPage data={data} />
      <InterestUpgradePage data={data} />
    </Document>
  );
}
