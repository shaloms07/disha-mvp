"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import {
  STATUS_LABELS,
  isFullyComplete,
  moduleStatus,
  overallProgress,
  sessionStatus,
  type ModuleStatus,
} from "@/lib/school/aggregates";
import { mockSendNudge } from "@/lib/school/mockSchoolApi";
import { ALL_MODULES } from "@/lib/testModules";
import { gapFlags, preferenceStatus } from "@/lib/school/studentInsights";
import type { SessionState } from "@/types";
import { DataTable, MockNotice, Panel, Pill, Td } from "./DashboardUi";

const MODULE_CELL: Record<ModuleStatus, { label: string; tone: "good" | "progress" | "neutral" }> = {
  completed: { label: "Done", tone: "good" },
  in_progress: { label: "Part-way", tone: "progress" },
  not_started: { label: "—", tone: "neutral" },
};

/**
 * One row per student, with the four modules as columns.
 *
 * The status ladder is the same one the base product defines for a test
 * session (registered -> consent -> verified -> in progress -> completed), so
 * a teacher chasing a student knows whether the problem is that the parent
 * never consented or that the child stalled in module three.
 */
export function SectionRoster({
  classId,
  sessions,
  onToast,
  onOpenStudent,
}: {
  classId: string;
  sessions: SessionState[];
  onToast: (message: string) => void;
  onOpenStudent: (session: SessionState) => void;
}) {
  const [nudging, setNudging] = useState<string | null>(null);
  const [nudged, setNudged] = useState<Set<string>>(new Set());

  async function handleNudge(session: SessionState) {
    const key = session.sessionToken ?? session.childName;
    setNudging(key);
    await mockSendNudge(session.childName);
    setNudging(null);
    setNudged((prev) => new Set(prev).add(key));
    onToast(
      `Reminder queued for ${session.parentName} about ${session.childName} — nothing was actually sent.`,
    );
  }

  const complete = sessions.filter(isFullyComplete).length;

  return (
    <Panel
      title={`Section ${classId}`}
      subtitle={`${sessions.length} students · ${complete} have finished all four modules`}
    >
      <MockNotice className="mb-5">
        Reminders are simulated. No WhatsApp or SMS message is sent to any
        parent.
      </MockNotice>

      <DataTable
        caption={`Roster for section ${classId}`}
        headers={[
          "Student",
          "Where they are",
          ...ALL_MODULES.map((m) => m.label),
          "Answered",
          "Flags",
          <span key="action" className="sr-only">
            Reminder
          </span>,
        ]}
      >
        {sessions.map((session) => {
          const key = session.sessionToken ?? session.childName;
          const status = sessionStatus(session);
          const progress = overallProgress(session);
          const gaps = gapFlags(session).filter((f) => f.tone === "gap");
          const preference = preferenceStatus(session);
          const done = status === "completed";

          return (
            <tr
              key={key}
              className="border-b border-hairline last:border-0 hover:bg-brand-50/50"
            >
              <Td>
                <button
                  type="button"
                  onClick={() => onOpenStudent(session)}
                  className="text-left font-medium text-brand-700 underline decoration-transparent underline-offset-2 hover:decoration-inherit"
                >
                  {session.childName}
                </button>
                <span className="mt-0.5 block text-note text-text-muted">
                  {session.parentName}
                </span>
              </Td>

              <Td>
                <Pill tone={done ? "good" : status === "in_progress" ? "progress" : "neutral"}>
                  {STATUS_LABELS[status]}
                </Pill>
              </Td>

              {ALL_MODULES.map((testModule) => {
                const cell = MODULE_CELL[moduleStatus(session, testModule)];
                return (
                  <Td key={testModule.id}>
                    {cell.label === "—" ? (
                      <span className="text-text-muted" aria-label="Not started">
                        —
                      </span>
                    ) : (
                      <Pill tone={cell.tone}>{cell.label}</Pill>
                    )}
                  </Td>
                );
              })}

              <Td className="text-note text-text-secondary tabular-nums">
                {progress.answered}/{progress.total}
              </Td>

              <Td>
                <span className="flex flex-wrap gap-1.5">
                  {gaps.length > 0 && (
                    <Pill tone="progress">
                      {gaps.length} gap{gaps.length === 1 ? "" : "s"}
                    </Pill>
                  )}
                  {preference?.dissonant && <Pill tone="alert">Parent gap</Pill>}
                  {gaps.length === 0 && !preference?.dissonant && (
                    <span className="text-text-muted">—</span>
                  )}
                </span>
              </Td>

              <Td className="text-right">
                {done ? (
                  <span className="text-note text-text-muted">—</span>
                ) : nudged.has(key) ? (
                  <span className="text-note text-ok-700">Reminded</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleNudge(session)}
                    disabled={nudging === key}
                    className="inline-flex items-center gap-2 rounded-lg border border-control-line px-3 py-1.5 text-note font-medium text-text whitespace-nowrap hover:border-brand-700 hover:bg-brand-50 disabled:opacity-50"
                  >
                    {nudging === key && <Spinner />}
                    {nudging === key ? "Sending" : "Nudge"}
                  </button>
                )}
              </Td>
            </tr>
          );
        })}
      </DataTable>

      {sessions.length === 0 && (
        <p className="py-6 text-center text-body text-text-secondary">
          No students registered in this section yet.
        </p>
      )}
    </Panel>
  );
}
