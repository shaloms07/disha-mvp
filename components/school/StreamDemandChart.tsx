"use client";

import { STREAM_TITLES } from "@/lib/school/streams";
import { streamDemand } from "@/lib/school/aggregates";
import { Panel } from "./DashboardUi";

/**
 * Stated preference against psychometric fit, per stream.
 *
 * Two series, so the palette is categorical and both are direct-labelled as
 * well as legended — identity never rests on colour alone. The two hues are
 * the validated chart tokens, not generated ones.
 *
 * The honest caveat is in the subtitle: the two bars are counted over
 * different populations. Every scored student has a best-fit stream, but only
 * the parents who filled in the optional preference field have a stated one,
 * so the pair is a comparison of shape, not of totals.
 */
export function StreamDemandChart() {
  const { rows, statedBase, fitBase } = streamDemand();
  const max = Math.max(...rows.flatMap((r) => [r.stated, r.fit]), 1);

  return (
    <Panel
      title="Stream demand forecast"
      subtitle={
        <>
          What parents say they want, next to what the assessment indicates.
          Counted over different groups — psychometric fit over the{" "}
          <strong className="font-medium text-text">{fitBase} students</strong>{" "}
          who have an interest score, stated preference over the{" "}
          <strong className="font-medium text-text">{statedBase} parents</strong>{" "}
          who filled in that optional field. Read the shapes, not the totals.
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-2 text-note text-text-secondary">
          <span
            aria-hidden="true"
            className="size-3 rounded-sm bg-chart-stated"
          />
          Parent&apos;s stated preference
        </span>
        <span className="flex items-center gap-2 text-note text-text-secondary">
          <span aria-hidden="true" className="size-3 rounded-sm bg-chart-fit" />
          Psychometric fit
        </span>
      </div>

      <div className="mt-6 space-y-5">
        {rows.map((row) => (
          <div key={row.stream}>
            <p className="text-body font-medium text-text">
              {STREAM_TITLES[row.stream]}
            </p>
            <div className="mt-2 space-y-1.5">
              {(
                [
                  { key: "stated", value: row.stated, color: "bg-chart-stated", label: "stated" },
                  { key: "fit", value: row.fit, color: "bg-chart-fit", label: "fit" },
                ] as const
              ).map((bar) => (
                <div key={bar.key} className="flex items-center gap-3">
                  <div className="h-5 flex-1 rounded-sm bg-surface-sunk">
                    <div
                      className={`h-full rounded-sm ${bar.color}`}
                      style={{ width: `${Math.max((bar.value / max) * 100, bar.value ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-note text-text-secondary tabular-nums">
                    <strong className="font-medium text-text">{bar.value}</strong>{" "}
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 border-t border-hairline pt-4 text-note text-text-secondary">
        The gap worth acting on is{" "}
        <strong className="font-medium text-text">Humanities</strong>: it is the
        best fit for {rows.find((r) => r.stream === "humanities")?.fit} students
        and the stated preference of{" "}
        {rows.find((r) => r.stream === "humanities")?.stated}.
      </p>
    </Panel>
  );
}
