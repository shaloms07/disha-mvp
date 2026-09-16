"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  GRADES,
  SECTIONS,
  UNASSIGNED_SESSIONS,
  completionAt,
  isFullyComplete,
  sessionStatus,
  type ClassCompletion,
} from "@/lib/school/aggregates";
import { DataTable, Panel, Td } from "./DashboardUi";

/**
 * Completion by grade and section.
 *
 * Sequential encoding, one hue, more-is-darker — the job here is magnitude,
 * not identity, so there is no categorical palette involved. The five steps
 * are monotonic in luminance and each carries the percentage as text, so the
 * grid is never colour-alone.
 */
const BANDS = [
  { floor: 80, bg: "bg-heat-5", fg: "text-white", label: "80-100%" },
  { floor: 60, bg: "bg-heat-4", fg: "text-white", label: "60-79%" },
  { floor: 40, bg: "bg-heat-3", fg: "text-text", label: "40-59%" },
  { floor: 20, bg: "bg-heat-2", fg: "text-text", label: "20-39%" },
  { floor: 0, bg: "bg-heat-1", fg: "text-text", label: "0-19%" },
] as const;

function bandFor(percent: number) {
  return BANDS.find((b) => percent >= b.floor) ?? BANDS[BANDS.length - 1];
}

function Cell({ completion }: { completion: ClassCompletion }) {
  const band = bandFor(completion.percent);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-3.5 transition-transform",
          "hover:scale-[1.03]",
          band.bg,
          band.fg,
        )}
      >
        <span className="text-h3 font-semibold tabular-nums">
          {completion.percent}%
        </span>
        <span className="text-note opacity-80 tabular-nums">
          {completion.completed}/{completion.total}
        </span>
      </button>

      {open && (
        <div
          role="tooltip"
          className="disha-fade-in pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-lg bg-brand-800 px-3.5 py-3 text-note text-on-dark shadow-feature"
        >
          <p className="font-medium">
            Class {completion.schoolClass.grade}-{completion.schoolClass.section}
          </p>
          <p className="mt-0.5 text-on-dark/70">
            {completion.schoolClass.teacherName}
          </p>
          <dl className="mt-2.5 space-y-1 tabular-nums">
            <div className="flex justify-between gap-4">
              <dt className="text-on-dark/70">All four modules</dt>
              <dd>{completion.completed}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-on-dark/70">Part-way</dt>
              <dd>{completion.inProgress}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-on-dark/70">Not started</dt>
              <dd>{completion.notStarted}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

export function CompletionHeatmap() {
  const [showTable, setShowTable] = useState(false);

  return (
    <Panel
      title="Completion by section"
      subtitle="A student counts as complete only once all four modules are finished."
      aside={
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="rounded-lg px-2.5 py-1.5 text-note font-medium text-brand-700 hover:bg-brand-50"
        >
          {showTable ? "Show grid" : "Show as table"}
        </button>
      }
    >
      {showTable ? (
        <DataTable
          caption="Completion by section"
          headers={["Section", "Class teacher", "Complete", "Part-way", "Not started", "Completion"]}
        >
          {GRADES.flatMap((grade) =>
            SECTIONS.map((section) => {
              const c = completionAt(grade, section);
              if (!c) return null;
              return (
                <tr key={c.schoolClass.id} className="border-b border-hairline last:border-0">
                  <Td className="font-medium">{c.schoolClass.id}</Td>
                  <Td className="text-text-secondary">{c.schoolClass.teacherName}</Td>
                  <Td className="tabular-nums">{c.completed}</Td>
                  <Td className="tabular-nums">{c.inProgress}</Td>
                  <Td className="tabular-nums">{c.notStarted}</Td>
                  <Td className="font-medium tabular-nums">{c.percent}%</Td>
                </tr>
              );
            }),
          )}
        </DataTable>
      ) : (
        <>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `3.5rem repeat(${SECTIONS.length}, minmax(4.5rem, 1fr))`,
            }}
          >
            <div aria-hidden="true" />
            {SECTIONS.map((section) => (
              <div
                key={section}
                className="pb-1 text-center text-note font-medium text-text-secondary"
              >
                Sec {section}
              </div>
            ))}

            {GRADES.map((grade) => (
              <div key={grade} className="contents">
                <div className="flex items-center text-note font-medium text-text-secondary">
                  Class {grade}
                </div>
                {SECTIONS.map((section) => {
                  const completion = completionAt(grade, section);
                  return (
                    <div key={`${grade}-${section}`}>
                      {completion ? (
                        <Cell completion={completion} />
                      ) : (
                        <div className="flex h-full min-h-[4.5rem] items-center justify-center rounded-lg border border-dashed border-hairline text-note text-text-muted">
                          <span className="sr-only">
                            No section {section} in class {grade}
                          </span>
                          <span aria-hidden="true">—</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-note text-text-secondary">Completion</span>
            {[...BANDS].reverse().map((band) => (
              <span key={band.label} className="flex items-center gap-1.5 text-note text-text-muted">
                <span
                  aria-hidden="true"
                  className={cn("size-3.5 rounded-sm border border-hairline", band.bg)}
                />
                {band.label}
              </span>
            ))}
          </div>
        </>
      )}

      {UNASSIGNED_SESSIONS.length > 0 && (
        <p className="mt-5 rounded-lg border border-hairline bg-surface-sunk px-3.5 py-3 text-note text-text-secondary">
          <span className="font-medium text-text">
            {UNASSIGNED_SESSIONS.length} student
            {UNASSIGNED_SESSIONS.length === 1 ? "" : "s"} outside the grid.
          </span>{" "}
          They registered with the school code but no section, so they sit in
          the school total and in nobody&apos;s class list —{" "}
          {UNASSIGNED_SESSIONS.filter(isFullyComplete).length} finished,{" "}
          {UNASSIGNED_SESSIONS.filter((s) => sessionStatus(s) !== "completed").length}{" "}
          still going. Assigning them a section is the fix.
        </p>
      )}
    </Panel>
  );
}
