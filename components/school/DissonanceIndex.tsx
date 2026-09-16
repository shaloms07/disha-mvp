"use client";

import { useState } from "react";
import {
  DISSONANCE_TOP_N,
  dissonanceByGrade,
  dissonanceRows,
  mostStatedPreferences,
  summarise,
} from "@/lib/school/aggregates";
import { DataTable, Panel, Pill, StatTile, Td } from "./DashboardUi";

/**
 * How often a parent's stated preference misses their child's top matches.
 *
 * Nothing here is stored: the flag is recomputed from lib/matching.ts on every
 * render, so it always agrees with the ranking the parent is shown on
 * /results. The denominator is only the parents who filled in the optional
 * field, which the screen states rather than implying school-wide coverage.
 */
export function DissonanceIndex() {
  const rows = dissonanceRows();
  const summary = summarise(rows);
  const byGrade = dissonanceByGrade(rows);
  const topPreferences = mostStatedPreferences(rows);
  const [showStudents, setShowStudents] = useState(false);

  // Guarded rather than reduced bare: a data set where no parent filled the
  // optional field is a legitimate state, not a crash.
  const widest = byGrade.length
    ? byGrade.reduce((a, b) => (b.summary.percent > a.summary.percent ? b : a))
    : null;

  return (
    <Panel
      title="Parent dissonance index"
      subtitle={
        <>
          A parent&apos;s preference counts as divergent when it is not among
          their child&apos;s top {DISSONANCE_TOP_N} matched careers. Measured
          over the {summary.base} parents who named one — the field is optional,
          so this is not school-wide.
        </>
      }
      aside={
        <button
          type="button"
          onClick={() => setShowStudents((v) => !v)}
          className="rounded-lg px-2.5 py-1.5 text-note font-medium text-brand-700 hover:bg-brand-50"
        >
          {showStudents ? "Hide students" : "See the students"}
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Expectations diverging from fit"
          value={`${summary.percent}%`}
          detail={`${summary.dissonant} of ${summary.base} parents who named a career`}
          tone="alert"
        />
        <StatTile
          label="Widest gap"
          value={widest ? `Class ${widest.grade}` : "—"}
          detail={
            widest
              ? `${widest.summary.percent}% divergent — the cohort to put a session on first`
              : "No parent has named a career yet"
          }
        />
      </div>

      <h3 className="mt-7 text-body font-semibold text-text">By class</h3>
      <DataTable
        className="mt-2"
        caption="Dissonance by class"
        headers={["Class", "Parents who named a career", "Divergent", "Rate"]}
      >
        {byGrade.map(({ grade, summary: s }) => (
          <tr key={grade} className="border-b border-hairline last:border-0">
            <Td className="font-medium">Class {grade}</Td>
            <Td className="tabular-nums text-text-secondary">{s.base}</Td>
            <Td className="tabular-nums">{s.dissonant}</Td>
            <Td>
              <Pill tone={s.percent >= 50 ? "alert" : "neutral"}>
                {s.percent}%
              </Pill>
            </Td>
          </tr>
        ))}
      </DataTable>

      <h3 className="mt-7 text-body font-semibold text-text">
        Most-named careers
      </h3>
      <p className="mt-1 text-note text-text-secondary">
        Where a career is named often and matches rarely, that is the webinar
        topic.
      </p>
      <DataTable
        className="mt-2"
        caption="Most-named careers and how often they match"
        headers={["Career named by parents", "Times named", "Not in child's top 3"]}
      >
        {topPreferences.map((pref) => (
          <tr key={pref.title} className="border-b border-hairline last:border-0">
            <Td className="font-medium">{pref.title}</Td>
            <Td className="tabular-nums text-text-secondary">{pref.stated}</Td>
            <Td>
              <Pill
                tone={
                  pref.dissonant === pref.stated
                    ? "alert"
                    : pref.dissonant === 0
                      ? "good"
                      : "progress"
                }
              >
                {pref.dissonant} of {pref.stated}
              </Pill>
            </Td>
          </tr>
        ))}
      </DataTable>

      {showStudents && (
        <>
          <h3 className="mt-7 text-body font-semibold text-text">
            Student by student
          </h3>
          <DataTable
            className="mt-2"
            caption="Every student whose parent named a career"
            headers={["Student", "Class", "Parent's preference", "Child's top 3", "Status"]}
          >
            {rows.map((row) => (
              <tr
                key={row.session.sessionToken ?? row.session.childName}
                className="border-b border-hairline last:border-0"
              >
                <Td className="font-medium">{row.session.childName}</Td>
                <Td className="text-text-secondary">
                  {row.session.classId ?? "—"}
                </Td>
                <Td className="text-text-secondary">{row.statedPreference}</Td>
                <Td className="text-note text-text-secondary">
                  {row.topMatches.join(", ")}
                </Td>
                <Td>
                  <Pill tone={row.dissonant ? "alert" : "good"}>
                    {row.dissonant ? "Diverges" : "Aligned"}
                  </Pill>
                </Td>
              </tr>
            ))}
          </DataTable>
        </>
      )}
    </Panel>
  );
}
