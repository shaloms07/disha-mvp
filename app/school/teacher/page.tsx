"use client";

import { useCallback, useState } from "react";
import { StatTile, Toast } from "@/components/school/DashboardUi";
import { ScopeStrip } from "@/components/school/ScopeStrip";
import { SectionRoster } from "@/components/school/SectionRoster";
import { StudentFlashcard } from "@/components/school/StudentFlashcard";
import { SelectField } from "@/components/ui/Field";
import {
  classIdOf,
  isFullyComplete,
  sessionStatus,
} from "@/lib/school/aggregates";
import { MOCK_TEACHER, teacherClasses } from "@/lib/school/roles";
import { useVisibleSessions } from "@/lib/school/RoleContext";
import { gapFlags, preferenceStatus } from "@/lib/school/studentInsights";
import type { SessionState } from "@/types";

export default function TeacherDashboardPage() {
  // Scoped by role before anything else touches it — a teacher's screen never
  // has another section's students in hand, even in this simulation.
  const visibleSessions = useVisibleSessions();
  const classes = teacherClasses();
  const [classId, setClassId] = useState<string>(MOCK_TEACHER.homeroom);
  const [toast, setToast] = useState<string | null>(null);
  const [openStudent, setOpenStudent] = useState<SessionState | null>(null);

  const dismiss = useCallback(() => setToast(null), [setToast]);

  // Filtering a handful of rows — the compiler memoizes this well enough that
  // a manual useMemo only gets in its way.
  const sessions = visibleSessions.filter((s) => classIdOf(s) === classId);

  const complete = sessions.filter(isFullyComplete).length;
  const chasing = sessions.filter((s) => sessionStatus(s) !== "completed").length;
  const flagged = sessions.filter(
    (s) => gapFlags(s).some((f) => f.tone === "gap") || preferenceStatus(s)?.dissonant,
  ).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="text-note text-text-secondary">
            Class teacher · {MOCK_TEACHER.name}
          </p>
          <h1 className="mt-1 text-h1 font-semibold text-text">My sections</h1>
        </div>

        <div className="w-full sm:w-56">
          <SelectField
            id="section"
            label="Section"
            options={classes.map((c) => c.id)}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8">
        <ScopeStrip />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Students in this section"
          value={String(sessions.length)}
          detail={`${complete} have finished all four modules`}
        />
        <StatTile
          label="Still to chase"
          value={String(chasing)}
          detail={chasing ? "Use the nudge button on their row" : "Everyone is done"}
        />
        <StatTile
          label="Worth a conversation"
          value={String(flagged)}
          detail="An interest/confidence gap, or a parent expecting something else"
          tone={flagged ? "alert" : "default"}
        />
      </div>

      <div className="mt-8">
        <SectionRoster
          classId={classId}
          sessions={sessions}
          onToast={setToast}
          onOpenStudent={setOpenStudent}
        />
      </div>

      <p className="mt-4 text-note text-text-muted">
        Select a student&apos;s name to open their flashcard, and the PTM
        summary from there.
      </p>

      <StudentFlashcard
        session={openStudent}
        onClose={() => setOpenStudent(null)}
      />

      <Toast message={toast} onDismiss={dismiss} />
    </>
  );
}
