"use client";

import { aptitudeBenchmark, NORMS } from "@/lib/school/aggregates";
import { APTITUDE_LABELS } from "@/types";
import { MockNotice, Panel } from "./DashboardUi";

/**
 * School aptitude averages against a reference line.
 *
 * One series plus a reference marker rather than two series of bars: the norm
 * is a benchmark, not a second population, and a paired-bar chart would invite
 * the reader to compare two things that were not measured the same way.
 *
 * Two disclaimers have to be on this screen rather than in a footnote, because
 * the screen's whole shape implies a validated ability comparison and it is
 * neither half of one:
 *   - the school side is self-rated confidence, not tested ability
 *   - the norm side is invented for this build
 */
export function CognitiveBenchmark() {
  const { rows, base, max } = aptitudeBenchmark();

  return (
    <Panel
      title="Cognitive benchmarking"
      subtitle={`School average per domain, over the ${base} students who have finished the aptitude module. Each domain scores 3-15.`}
    >
      <MockNotice className="mb-6">
        Illustrative only, on both sides. These items ask a student how easy
        they <em>find</em> something, so this measures self-rated confidence,
        not tested ability — a real aptitude test has right and wrong answers.
        The reference line is invented for this build, not CBSE or any published
        norm set.
      </MockNotice>

      <div className="space-y-4">
        {rows.map((row) => {
          const schoolPct = (row.school / max) * 100;
          const normPct = (row.norm / max) * 100;
          const above = row.delta > 0;

          return (
            <div key={row.domain}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-body font-medium text-text">
                  {APTITUDE_LABELS[row.domain]}
                </span>
                <span className="text-note text-text-secondary tabular-nums">
                  <strong className="font-medium text-text">{row.school}</strong>{" "}
                  vs {row.norm}
                  <span
                    className={
                      row.delta === 0
                        ? "ml-2 text-text-muted"
                        : above
                          ? "ml-2 text-ok-700"
                          : "ml-2 text-accent-700"
                    }
                  >
                    {row.delta > 0 ? "+" : row.delta < 0 ? "−" : "±"}
                    {Math.abs(row.delta).toFixed(1)}
                  </span>
                </span>
              </div>

              <div className="relative mt-2 h-6 rounded-sm bg-surface-sunk">
                <div
                  className="h-full rounded-sm bg-chart-fit"
                  style={{ width: `${schoolPct}%` }}
                />
                {/* The reference line, drawn over the bar it qualifies. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 w-0.5 bg-text"
                  style={{ left: `${normPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline pt-4">
        <span className="flex items-center gap-2 text-note text-text-secondary">
          <span aria-hidden="true" className="size-3 rounded-sm bg-chart-fit" />
          This school&apos;s average
        </span>
        <span className="flex items-center gap-2 text-note text-text-secondary">
          <span aria-hidden="true" className="h-3.5 w-0.5 bg-text" />
          {NORMS.label}
        </span>
      </div>
    </Panel>
  );
}
