"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SpectrumRule } from "@/components/ui/Spectrum";
import { APTITUDE_MAX_SCORE } from "@/lib/aptitudeScoring";
import { SCHOOL } from "@/lib/school/schoolCode";
import { sessionsForRole } from "@/lib/school/roles";
import {
  isFullyComplete,
  moduleStatus,
  overallProgress,
} from "@/lib/school/aggregates";
import {
  gapFlags,
  matchPercent,
  preferenceStatus,
  recommendationsFor,
  summariseStudent,
} from "@/lib/school/studentInsights";
import { ALL_MODULES } from "@/lib/testModules";
import { APTITUDE_LABELS, type SessionState } from "@/types";

/* -------------------------------------------------------------------------
   A single page built to be printed.

   No PDF library: the spec scopes real PDF generation out, and a page laid
   out for A4 with browser print-to-PDF is both honest about that and the
   thing a school would actually use in a PTM. Everything that is chrome —
   the dashboard bar, the back link, the print button — is print:hidden, so
   what comes out of the printer is the sheet and nothing else.
   ------------------------------------------------------------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-note text-text-secondary">{label}</dt>
      <dd className="mt-0.5 text-body font-medium text-text">{children}</dd>
    </div>
  );
}

function Sheet({ session }: { session: SessionState }) {
  const summary = summariseStudent(session);
  const recommendations = recommendationsFor(session);
  const preference = preferenceStatus(session);
  const flags = gapFlags(session);
  const progress = overallProgress(session);
  const complete = isFullyComplete(session);

  return (
    <article className="mx-auto max-w-3xl rounded-xl border border-hairline bg-surface px-8 py-9 shadow-card print:max-w-none print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-5">
        <div>
          <p className="font-display text-h3 font-semibold text-brand-800">
            DISHA
          </p>
          <p className="mt-0.5 text-note text-text-secondary">
            Parent-teacher meeting summary
          </p>
        </div>
        <div className="text-right text-note text-text-secondary">
          <p className="font-medium text-text">{SCHOOL.name}</p>
          <p>
            {SCHOOL.board} · {session.childClass}
            {session.classId ? ` · ${session.classId}` : ""}
          </p>
        </div>
      </header>

      <SpectrumRule className="mt-5" />

      <h1 className="mt-6 text-h1 font-semibold text-text">
        {session.childName}
      </h1>
      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <Field label="Parent / guardian">{session.parentName}</Field>
        <Field label="Holland code">
          <span className="font-mono">{summary.hollandCode ?? "—"}</span>
        </Field>
        <Field label="Assessment status">
          {complete
            ? "All four modules complete"
            : `${progress.answered} of ${progress.total} answered`}
        </Field>
      </dl>

      {!complete && (
        <p className="mt-5 rounded-lg border border-hairline bg-surface-sunk px-4 py-3 text-note text-text-secondary">
          This student has not finished every module. Still outstanding:{" "}
          {ALL_MODULES.filter((m) => moduleStatus(session, m) !== "completed")
            .map((m) => m.label)
            .join(", ")}
          . Everything below is based only on what has been scored.
        </p>
      )}

      {/* ---- the recommendation, which is what the meeting is about ---- */}
      {recommendations && (
        <section className="mt-8">
          <h2 className="text-h3 font-semibold text-text">
            {recommendations.heading}
          </h2>
          <p className="mt-1 text-note text-text-secondary">
            {recommendations.kind === "stream"
              ? "Streams rather than job titles — this is the choice actually in front of a student at this stage."
              : "Careers within reach of the stream already chosen."}
          </p>
          <ol className="mt-3 space-y-2.5">
            {recommendations.matches.map((match, i) => (
              <li key={match.career.id} className="flex gap-3">
                <span className="font-mono text-note text-text-muted">
                  {i + 1}
                </span>
                <span className="flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="text-body font-medium text-text">
                      {match.career.title}
                    </span>
                    <span className="text-note text-text-secondary tabular-nums">
                      {matchPercent(match.matchScore)}% match
                    </span>
                  </span>
                  <span className="mt-0.5 block text-note text-text-secondary">
                    {match.career.description}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ---- the four modules, side by side ---- */}
      <section className="mt-8">
        <h2 className="text-h3 font-semibold text-text">What the modules say</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Strongest interests">
            {summary.topInterests?.join(", ") ?? "Not scored"}
          </Field>
          <Field label="Best-fit stream">{summary.bestStream ?? "Not scored"}</Field>
          <Field label="Rates easiest (self-rated)">
            {summary.easiestDomains?.join(", ") ?? "Not scored"}
          </Field>
          <Field label="Rates hardest (self-rated)">
            {summary.hardestDomain ?? "Not scored"}
          </Field>
          <Field label="Personality">
            {summary.topTraits?.join(", ") ?? "Not scored"}
          </Field>
          <Field label="Values most in a job">
            {summary.topValues?.join(", ") ?? "Not scored"}
          </Field>
        </dl>

        {session.aptitudeScores && (
          <p className="mt-4 text-note text-text-muted">
            Aptitude, out of {APTITUDE_MAX_SCORE} per domain:{" "}
            {Object.entries(session.aptitudeScores)
              .map(
                ([d, v]) =>
                  `${APTITUDE_LABELS[d as keyof typeof APTITUDE_LABELS]} ${v}`,
              )
              .join(", ")}
            . These items ask how easy a task <em>feels</em>, so they record
            self-rated confidence rather than tested ability.
          </p>
        )}
      </section>

      {/* ---- the things to actually say out loud ---- */}
      {(flags.length > 0 || preference) && (
        <section className="mt-8 break-inside-avoid">
          <h2 className="text-h3 font-semibold text-text">Points to discuss</h2>
          <ul className="mt-3 space-y-3">
            {preference && (
              <li className="border-l-2 border-hairline pl-4">
                <p className="text-body font-medium text-text">
                  {preference.dissonant
                    ? `You mentioned ${preference.stated} — it is not among the top three here`
                    : `You mentioned ${preference.stated}, which matches the assessment`}
                </p>
                <p className="mt-1 text-note text-text-secondary">
                  {preference.dissonant
                    ? `The three strongest matches are ${preference.topMatches.join(", ")}. This is a prompt to widen the list, not to rule anything out — a strong interest fit is one input among several.`
                    : "Worth saying so plainly; agreement between a parent's instinct and the assessment is itself useful information."}
                </p>
              </li>
            )}
            {flags.map((flag) => (
              <li key={flag.headline} className="border-l-2 border-hairline pl-4">
                <p className="text-body font-medium text-text">
                  {flag.headline}
                </p>
                <p className="mt-1 text-note text-text-secondary">
                  {flag.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8 break-inside-avoid">
        <h2 className="text-h3 font-semibold text-text">Agreed next steps</h2>
        <div className="mt-3 space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border-b border-dashed border-hairline pb-1">
              <span className="sr-only">Blank line {i + 1} for notes</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-8 border-t border-hairline pt-4 text-note text-text-muted">
        Generated from a frontend-only demo build using sample data. Interest
        results come from a RIASEC inventory; the aptitude, personality and work
        values modules are simplified pilot instruments and are not clinically
        validated. Not a diagnosis, and not a prediction.
      </footer>
    </article>
  );
}

function PtmContent() {
  const params = useSearchParams();
  const token = params.get("s");

  // Scoped through the same role filter as the roster, so a link to a student
  // outside this teacher's sections resolves to nothing rather than to data.
  const session = sessionsForRole("teacher").find(
    (s) => s.sessionToken === token,
  );

  if (!session) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-h2 font-semibold text-text">Student not found</h1>
        <p className="mt-3 text-body text-text-secondary">
          {token
            ? "That student is not in one of your sections, so there is no summary to show."
            : "Open a summary from a student's flashcard on the roster."}
        </p>
        <ButtonLink href="/school/teacher" className="mt-6" variant="secondary">
          Back to my sections
        </ButtonLink>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/school/teacher"
          className="text-note font-medium text-brand-700 hover:underline"
        >
          &larr; Back to my sections
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          Print / save as PDF
        </Button>
      </div>

      <p className="mb-6 rounded-lg border border-accent-100 bg-accent-100/50 px-3.5 py-2.5 text-note text-text-secondary print:hidden">
        <span className="font-semibold text-accent-700">Demo</span> — no PDF is
        generated. This page is laid out for A4; use the browser&apos;s print
        dialogue to save it.
      </p>

      <Sheet session={session} />
    </>
  );
}

export default function PtmSummaryPage() {
  return (
    <Suspense
      fallback={
        <p className="py-16 text-center text-body text-text-secondary">
          Loading the summary…
        </p>
      }
    >
      <PtmContent />
    </Suspense>
  );
}
