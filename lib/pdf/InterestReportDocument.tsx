/**
 * The Tier 1 "Download Report" PDF (lib/pricing.ts level 1, ₹299) - a real,
 * standalone 4-page document built from the free RIASEC test alone:
 *
 *   1. Cover + what this report covers (and doesn't)
 *   2. Full six-type interest profile
 *   3. Strengths & growth angles
 *   4. What the Deep-Dive Assessment adds
 *
 * Deliberately NOT the same file as lib/pdf/SnapshotDocument.tsx - that one
 * stays the free 1-page snapshot sent over WhatsApp the moment the test
 * completes. Paying for this report must mean getting something beyond that
 * free send, not a reprint of it.
 */

import { Document } from "@react-pdf/renderer";
import {
  InterestCoverPage,
  InterestFullProfilePage,
  InterestStrengthsPage,
  InterestUpgradePage,
} from "./interestReportSections";
import type { InterestReportData } from "./interestReportData";

export function InterestReportDocument({ data }: { data: InterestReportData }) {
  return (
    <Document title={`${data.childName || "Student"} - My Life Coach Interest Profile Report`}>
      <InterestCoverPage data={data} />
      <InterestFullProfilePage data={data} />
      <InterestStrengthsPage data={data} />
      <InterestUpgradePage data={data} />
    </Document>
  );
}
