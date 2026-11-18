import { CounsellorTrust } from "@/components/results/CounsellorTrust";
import { PARENT_TESTIMONIALS } from "@/lib/resultsPageConfig";
import { SAMPLE_REPORT_URLS } from "@/lib/sampleReports";

const CHECKS = [
  "Based on Holland's RIASEC interest model",
  "Results saved — open them anytime",
  "Secure payment via Razorpay",
];

const SAMPLE_PAGES = [
  { label: "Career matches", chart: 1 },
  { label: "Strengths", chart: 2 },
  { label: "Roadmap", chart: 0 },
];

/**
 * RESULT_PAGE_V2's trust block. `full` (below the price cards after the
 * tests): sample report thumbnails linking to the real sample PDF, the
 * counsellor (lib/counsellor.ts - hidden while empty), parent quotes
 * (lib/resultsPageConfig.ts's PARENT_TESTIMONIALS - hidden while empty, real
 * ones only) and the checkmarks. `small` (the snapshot): the sample link and
 * the checkmarks.
 */
export function TrustBlock({ size = "full" }: { size?: "full" | "small" }) {
  const full = size === "full";
  return (
    <section aria-label="Why families trust this" className={full ? "mt-14" : "mt-12"}>
      {full && (
        <a
          href={SAMPLE_REPORT_URLS.completeReport}
          target="_blank"
          rel="noopener"
          className="block rounded-xl border border-hairline bg-surface p-4 hover:bg-surface-sunk sm:p-5"
        >
          <span aria-hidden="true" className="grid grid-cols-3 gap-2.5">
            {SAMPLE_PAGES.map((page) => (
              <span
                key={page.label}
                className="relative block h-28 overflow-hidden rounded-md border border-hairline bg-white px-2 pt-2.5 shadow-card"
              >
                <span className="block h-1.5 w-2/3 rounded-full bg-brand-800/80" />
                {Array.from({ length: 4 }, (_, i) =>
                  i === page.chart ? (
                    <span
                      key={i}
                      className="mt-1.5 block h-6 rounded bg-linear-to-r from-[var(--color-riasec-a)] via-[var(--color-riasec-i)] to-[var(--color-riasec-s)] opacity-50"
                    />
                  ) : (
                    <span key={i} className="mt-1.5 block h-1.5 rounded-full bg-surface-sunk" />
                  ),
                )}
                <span className="absolute inset-x-0 bottom-1.5 text-center text-[0.7rem] font-medium text-text-secondary">
                  {page.label}
                </span>
              </span>
            ))}
          </span>
          <span className="mt-3 block text-center text-body font-semibold text-brand-700 underline underline-offset-4">
            See a real sample report (PDF)
          </span>
        </a>
      )}

      {full && <CounsellorTrust />}

      {full && PARENT_TESTIMONIALS.length > 0 && (
        <ul className="mt-6 space-y-3">
          {PARENT_TESTIMONIALS.map((t) => (
            <li key={t.quote} className="rounded-xl border border-hairline bg-surface p-4">
              <p className="text-body text-text">“{t.quote}”</p>
              <p className="mt-2 text-note font-medium text-text-secondary">
                {t.name}
                {t.detail ? ` · ${t.detail}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      {!full && (
        <a
          href={SAMPLE_REPORT_URLS.completeReport}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center text-body font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
        >
          See a real sample of the full report (PDF)
        </a>
      )}

      <ul className={`${full ? "mt-6" : "mt-3"} space-y-2.5`}>
        {CHECKS.map((check) => (
          <li key={check} className="flex items-center gap-3 text-body text-text">
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ok-700/10 text-note font-bold text-ok-700"
            >
              ✓
            </span>
            {check}
          </li>
        ))}
      </ul>
    </section>
  );
}
