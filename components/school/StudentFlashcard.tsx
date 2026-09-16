"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { APTITUDE_MAX_SCORE } from "@/lib/aptitudeScoring";
import { moduleStatus, overallProgress } from "@/lib/school/aggregates";
import {
  gapFlags,
  matchPercent,
  preferenceStatus,
  recommendationsFor,
  summariseStudent,
} from "@/lib/school/studentInsights";
import { ALL_MODULES } from "@/lib/testModules";
import { APTITUDE_LABELS, type SessionState } from "@/types";
import { Modal, Pill } from "./DashboardUi";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-hairline py-2.5 last:border-0">
      <dt className="text-note text-text-secondary">{label}</dt>
      <dd className="text-body text-text">{children}</dd>
    </div>
  );
}

/**
 * Everything a teacher needs about one student in a single glance, for the
 * thirty seconds before a parent sits down.
 *
 * Ordered by what leads the conversation rather than by module: the
 * recommendation first, then the one thing that needs raising (a gap, or a
 * parent expecting something different), then the supporting detail.
 */
export function StudentFlashcard({
  session,
  onClose,
}: {
  session: SessionState | null;
  onClose: () => void;
}) {
  // Nothing selected: render nothing rather than an empty dialog.
  if (!session) return null;

  const summary = summariseStudent(session);
  const recommendations = recommendationsFor(session);
  const flags = gapFlags(session);
  const preference = preferenceStatus(session);
  const progress = overallProgress(session);
  const incomplete = ALL_MODULES.filter(
    (m) => moduleStatus(session, m) !== "completed",
  );

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={session.childName}
      subtitle={`${session.childClass}${session.classId ? ` · ${session.classId}` : ""} · parent ${session.parentName}`}
      footer={
        <ButtonLink
          href={`/school/teacher/ptm?s=${session.sessionToken ?? ""}`}
          variant="secondary"
          size="sm"
        >
          Open PTM summary
        </ButtonLink>
      }
    >
      {incomplete.length > 0 && (
        <p className="mb-5 rounded-lg border border-hairline bg-surface-sunk px-4 py-3 text-note text-text-secondary">
          <strong className="font-medium text-text">
            {progress.answered} of {progress.total} questions answered.
          </strong>{" "}
          Still to finish: {incomplete.map((m) => m.label).join(", ")}. What
          follows is based only on the modules already scored.
        </p>
      )}

      {recommendations ? (
        <>
          <h3 className="text-body font-semibold text-text">
            {recommendations.heading}
          </h3>
          <p className="mt-1 text-note text-text-secondary">
            {recommendations.kind === "stream"
              ? "Class 10 and below get streams rather than job titles — the choice actually in front of them."
              : "Class 11 and 12 have chosen a stream, so this ranks careers within reach of it."}
          </p>
          <ol className="mt-3 space-y-2">
            {recommendations.matches.map((match, i) => (
              <li
                key={match.career.id}
                className="flex items-baseline gap-3 rounded-lg border border-hairline px-4 py-3"
              >
                <span className="font-mono text-note text-text-muted">
                  {i + 1}
                </span>
                <span className="flex-1">
                  <span className="text-body font-medium text-text">
                    {match.career.title}
                  </span>
                  <span className="mt-0.5 block text-note text-text-secondary">
                    {match.career.description}
                  </span>
                </span>
                <span className="text-note text-text-secondary tabular-nums">
                  {matchPercent(match.matchScore)}%
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="text-body text-text-secondary">
          No interest score yet, so there is nothing to recommend. The student
          has not finished the first module.
        </p>
      )}

      {preference && (
        <div className="mt-6">
          <h3 className="text-body font-semibold text-text">
            What the parent has in mind
          </h3>
          <div
            className={`mt-2 rounded-lg border px-4 py-3 ${
              preference.dissonant
                ? "border-err-700/30 bg-err-700/5"
                : "border-hairline bg-brand-50"
            }`}
          >
            <p className="flex flex-wrap items-center gap-2 text-body text-text">
              <strong className="font-medium">{preference.stated}</strong>
              <Pill tone={preference.dissonant ? "alert" : "good"}>
                {preference.dissonant ? "Not in top 3" : "Matches the fit"}
              </Pill>
            </p>
            {preference.dissonant && (
              <p className="mt-2 text-note text-text-secondary">
                Their child&apos;s top three are{" "}
                {preference.topMatches.join(", ")}. Worth raising gently — the
                point is to widen the list, not to rule the parent&apos;s choice
                out.
              </p>
            )}
          </div>
        </div>
      )}

      {flags.length > 0 && (
        <div className="mt-6">
          <h3 className="text-body font-semibold text-text">
            Interest and confidence
          </h3>
          <ul className="mt-2 space-y-2">
            {flags.map((flag) => (
              <li
                key={flag.headline}
                className={`rounded-lg border px-4 py-3 ${
                  flag.tone === "gap"
                    ? "border-accent-100 bg-accent-100/40"
                    : "border-hairline bg-surface-sunk"
                }`}
              >
                <p className="flex items-start gap-2 text-body font-medium text-text">
                  <Pill tone={flag.tone === "gap" ? "progress" : "good"}>
                    {flag.tone === "gap" ? "Gap" : "Strength"}
                  </Pill>
                  <span>{flag.headline}</span>
                </p>
                <p className="mt-1.5 text-note text-text-secondary">
                  {flag.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-body font-semibold text-text">The four modules</h3>
        <dl className="mt-1">
          <Row label="Holland code">
            {summary.hollandCode ? (
              <span className="font-mono">{summary.hollandCode}</span>
            ) : (
              <span className="text-text-muted">Not scored</span>
            )}
          </Row>
          <Row label="Strongest interests">
            {summary.topInterests?.join(", ") ?? (
              <span className="text-text-muted">Not scored</span>
            )}
          </Row>
          <Row label="Rates easiest">
            {summary.easiestDomains?.join(", ") ?? (
              <span className="text-text-muted">Not scored</span>
            )}
          </Row>
          <Row label="Rates hardest">
            {summary.hardestDomain ?? (
              <span className="text-text-muted">Not scored</span>
            )}
          </Row>
          <Row label="Personality">
            {summary.topTraits?.join(", ") ?? (
              <span className="text-text-muted">Not scored</span>
            )}
          </Row>
          <Row label="Values most">
            {summary.topValues?.join(", ") ?? (
              <span className="text-text-muted">Not scored</span>
            )}
          </Row>
        </dl>
      </div>

      {session.aptitudeScores && (
        <p className="mt-5 text-note text-text-muted">
          Aptitude is self-rated out of {APTITUDE_MAX_SCORE} —{" "}
          {Object.entries(session.aptitudeScores)
            .map(
              ([domain, score]) =>
                `${APTITUDE_LABELS[domain as keyof typeof APTITUDE_LABELS]} ${score}`,
            )
            .join(", ")}
          . It measures how easy the student believes these tasks are, not
          whether they get them right.
        </p>
      )}

      <p className="mt-4 text-note text-text-muted">
        The parent sees the same interest results on their own{" "}
        <Link href="/results" className="text-brand-700 underline">
          results page
        </Link>
        .
      </p>
    </Modal>
  );
}
