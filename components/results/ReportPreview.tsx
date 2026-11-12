import { SAMPLE_REPORT_URLS } from "@/lib/sampleReports";

const PAGES = [
  { label: "Career matches", chart: 3 },
  { label: "Stream & subjects", chart: 1 },
  { label: "Roadmap preview", chart: 4 },
];

const SAMPLE_LINK_PROPS = { target: "_blank", rel: "noopener" } as const;

/**
 * "See what's inside" - faded thumbnails of the Career Match Report's pages
 * and a real sample of it: the exact same PDF a buyer gets, built for a
 * fictional student and watermarked SAMPLE REPORT on every page. Both
 * samples are pre-built static files (scripts/build-samples.tsx), so they
 * open in a new tab straight away - nothing is built on the phone.
 *
 * `compact` is the results-ready page's version: just a link, to a sample of
 * the Complete Career Report (the ₹999 plan sold there) rather than the ₹99
 * Career Match Report.
 */
export function ReportPreview({ compact = false }: { compact?: boolean } = {}) {
  // Just the sample link - for the results-ready page, where the child's own
  // report is already shown blurred above it.
  if (compact) {
    return (
      <div className="mt-5">
        <a
          href={SAMPLE_REPORT_URLS.completeReport}
          {...SAMPLE_LINK_PROPS}
          className="inline-flex min-h-11 items-center text-body font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
        >
          See a real sample report (PDF)
        </a>
      </div>
    );
  }

  return (
    <section className="mt-16">
      <h2 className="text-h2 font-semibold text-text">See what&apos;s inside</h2>
      <div aria-hidden="true" className="mt-6 grid grid-cols-3 gap-3">
        {PAGES.map((page) => (
          <div
            key={page.label}
            className="relative h-40 overflow-hidden rounded-md border border-hairline bg-white px-2.5 pt-3 shadow-card"
          >
            <div className="h-2 w-2/3 rounded-full bg-brand-800/80" />
            {Array.from({ length: 6 }, (_, i) =>
              i === page.chart ? (
                <div
                  key={i}
                  className="mt-2 h-8 rounded bg-linear-to-r from-[var(--color-riasec-a)] via-[var(--color-riasec-i)] to-[var(--color-riasec-s)] opacity-50"
                />
              ) : (
                <div key={i} className="mt-2 h-1.5 rounded-full bg-surface-sunk" />
              ),
            )}
            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-linear-to-b from-transparent to-white backdrop-blur-[1.5px]" />
            <span className="absolute inset-x-0 bottom-2 text-center text-note text-text-secondary">{page.label}</span>
          </div>
        ))}
      </div>
      <a
        href={SAMPLE_REPORT_URLS.careerMatch}
        {...SAMPLE_LINK_PROPS}
        className="mt-5 flex min-h-12 w-full items-center justify-center rounded-lg border border-hairline bg-surface px-5 text-body font-semibold text-text hover:bg-surface-sunk"
      >
        View a sample report (PDF)
      </a>
    </section>
  );
}
