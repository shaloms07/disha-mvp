/**
 * The pre-built sample report PDFs (scripts/build-samples.tsx writes them
 * into public/, `npm run samples`). Paths are site-relative, so a link opens
 * the static file straight away - nothing is built in the browser.
 */
export const SAMPLE_REPORT_FILES = {
  /** The ₹99 Career Match Report, for a fictional student */
  careerMatch: "samples/career-match-report-sample.pdf",
  /** The ₹999 Complete Career Report, same fictional student */
  completeReport: "samples/complete-career-report-sample.pdf",
} as const;

export const SAMPLE_REPORT_URLS = {
  careerMatch: `/${SAMPLE_REPORT_FILES.careerMatch}`,
  completeReport: `/${SAMPLE_REPORT_FILES.completeReport}`,
} as const;
