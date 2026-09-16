"use client";

import { Panel, StatTile } from "@/components/school/DashboardUi";
import { ScopeStrip } from "@/components/school/ScopeStrip";
import { StudentFlashcard } from "@/components/school/StudentFlashcard";
import { ButtonLink } from "@/components/ui/Button";
import { useState } from "react";
import { useVisibleSessions } from "@/lib/school/RoleContext";
import { isFullyComplete, overallProgress } from "@/lib/school/aggregates";
import { ALL_MODULES } from "@/lib/testModules";
import { moduleStatus } from "@/lib/school/aggregates";
import {
  preferenceStatus,
  recommendationsFor,
  summariseStudent,
} from "@/lib/school/studentInsights";

/**
 * The narrowest scope in the RBAC matrix — a parent sees one child.
 *
 * This is deliberately thin, and that is the point of showing it. A parent
 * does not get a dashboard: they get their own child's result, which already
 * exists as the consumer product's /results screen. This page exists so the
 * role switcher can demonstrate the third row of the matrix, and so it is
 * obvious that no aggregate view — no class completion, no other student's
 * name, no school-wide figure — is reachable from here.
 */
export default function ParentViewPage() {
  const sessions = useVisibleSessions();
  const child = sessions[0];
  const [openCard, setOpenCard] = useState(false);

  if (!child) {
    return (
      <>
        <ScopeStrip />
        <Panel title="No child linked to this account">
          <p className="text-body text-text-secondary">
            A parent only sees a child whose registration is tagged to this
            school. There is none in the current selection.
          </p>
        </Panel>
      </>
    );
  }

  const summary = summariseStudent(child);
  const recommendations = recommendationsFor(child);
  const preference = preferenceStatus(child);
  const progress = overallProgress(child);
  const complete = isFullyComplete(child);

  return (
    <>
      <div>
        <p className="text-note text-text-secondary">
          Parent · {child.parentName}
        </p>
        <h1 className="mt-1 text-h1 font-semibold text-text">
          {child.childName}&apos;s assessment
        </h1>
      </div>

      <div className="mt-8">
        <ScopeStrip />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Class"
          value={child.classId ?? child.childClass}
          detail={child.childClass}
        />
        <StatTile
          label="Progress"
          value={complete ? "Complete" : `${progress.percent}%`}
          detail={
            complete
              ? "All four modules finished"
              : `${progress.answered} of ${progress.total} questions answered`
          }
        />
        <StatTile
          label="Holland code"
          value={summary.hollandCode ?? "—"}
          detail={summary.topInterests?.join(", ") ?? "Not scored yet"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title={recommendations?.heading ?? "Recommendations"}
          subtitle="The same result the consumer results page shows, nothing more."
        >
          {recommendations ? (
            <ol className="space-y-2.5">
              {recommendations.matches.map((match, i) => (
                <li
                  key={match.career.id}
                  className="flex gap-3 rounded-lg border border-hairline px-4 py-3"
                >
                  <span className="font-mono text-note text-text-muted">
                    {i + 1}
                  </span>
                  <span>
                    <span className="text-body font-medium text-text">
                      {match.career.title}
                    </span>
                    <span className="mt-0.5 block text-note text-text-secondary">
                      {match.career.description}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-body text-text-secondary">
              Not scored yet. Still to finish:{" "}
              {ALL_MODULES.filter((m) => moduleStatus(child, m) !== "completed")
                .map((m) => m.label)
                .join(", ")}
              .
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/results" variant="secondary" size="sm">
              Open the full results page
            </ButtonLink>
            <button
              type="button"
              onClick={() => setOpenCard(true)}
              className="rounded-lg px-3 py-1.5 text-note font-medium text-brand-700 hover:bg-brand-50"
            >
              See everything on file
            </button>
          </div>
        </Panel>

        <Panel
          title="What a parent cannot see here"
          subtitle="The contrast the role switcher exists to show."
        >
          <ul className="space-y-3 text-body text-text-secondary">
            {[
              "Any other student's name, score or progress",
              "Class or school completion figures",
              "The stream demand forecast and cognitive benchmarking",
              "The dissonance index, including their own entry in it",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="text-text-muted">
                  &times;
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {preference && (
            <p className="mt-6 rounded-lg border border-hairline bg-surface-sunk px-4 py-3 text-note text-text-secondary">
              This parent named{" "}
              <strong className="font-medium text-text">
                {preference.stated}
              </strong>{" "}
              at registration. The school&apos;s dissonance index counts that
              answer{preference.dissonant ? ", and flags it as divergent" : ""} —
              the parent is not shown the flag. Whether they should be is a
              product decision, not a technical one, and it is worth settling
              before a pilot rather than after.
            </p>
          )}
        </Panel>
      </div>

      {openCard && (
        <StudentFlashcard session={child} onClose={() => setOpenCard(false)} />
      )}
    </>
  );
}
