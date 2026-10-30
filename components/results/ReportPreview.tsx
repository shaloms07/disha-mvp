"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { downloadPdfDocument } from "@/lib/pdf/download";
import { buildSampleInterestReportData } from "@/lib/pdf/interestReportData";
import { InterestReportDocument } from "@/lib/pdf/InterestReportDocument";

const PAGES = [
  { label: "Career matches", chart: 3 },
  { label: "Stream & subjects", chart: 1 },
  { label: "Roadmap preview", chart: 4 },
];

/**
 * "See what's inside" - faded thumbnails of the Career Match Report's pages
 * and a real sample of it to download: the exact same PDF a buyer gets, built
 * for a fictional student and labelled SAMPLE on its cover and every footer.
 */
export function ReportPreview() {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  async function handleSample() {
    setStatus("working");
    try {
      await downloadPdfDocument(
        <InterestReportDocument data={buildSampleInterestReportData()} />,
        "my-life-coach-sample-career-match-report.pdf",
      );
      setStatus("idle");
    } catch {
      setStatus("error");
    }
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
      <Button
        variant="secondary"
        size="lg"
        className="mt-5 w-full"
        loading={status === "working"}
        loadingText="Preparing the sample"
        onClick={handleSample}
      >
        View a sample report (PDF)
      </Button>
      {status === "error" && (
        <p role="alert" className="mt-2 text-note text-err-700">
          Couldn&apos;t prepare the sample. Please try again.
        </p>
      )}
    </section>
  );
}
