/**
 * Pre-builds the two sample report PDFs into public/samples/, so "See a
 * sample report" opens a static file instantly instead of building a PDF in
 * the parent's browser (slow on a budget phone).
 *
 *   npm run samples
 *
 * Re-run it - and commit the PDFs - whenever the report templates
 * (lib/pdf/**), the career data or the sample student change, or the
 * samples go stale. Both keep the SAMPLE REPORT watermark: they're built
 * with the same `sample: true` data the in-browser version used.
 */

import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { renderToFile } from "@react-pdf/renderer";
import { buildSampleInterestReportData } from "@/lib/pdf/interestReportData";
import { InterestReportDocument } from "@/lib/pdf/InterestReportDocument";
import { buildSampleCompleteReportDocument } from "@/lib/pdf/sampleCompleteReport";
import { SAMPLE_REPORT_FILES } from "@/lib/sampleReports";

async function main() {
  const outDir = path.join(process.cwd(), "public");
  mkdirSync(path.join(outDir, "samples"), { recursive: true });

  const builds = [
    { file: SAMPLE_REPORT_FILES.careerMatch, document: <InterestReportDocument data={buildSampleInterestReportData()} /> },
    { file: SAMPLE_REPORT_FILES.completeReport, document: buildSampleCompleteReportDocument() },
  ];

  for (const { file, document } of builds) {
    const target = path.join(outDir, file);
    await renderToFile(document, target);
    console.log(`${file}  ${(statSync(target).size / 1024).toFixed(0)} KB`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
