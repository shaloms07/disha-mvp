import { careerSummaryTitle, type CareerFieldSummary } from "@/lib/careerSummary";
import { rankAptitudeMcqDomains } from "@/lib/deepAptitudeScoring";
import { DEEP_APTITUDE_DOMAINS, DEEP_APTITUDE_LABELS, type SessionState } from "@/types";

/** Where the career summary stands: loading, the server's counts, or no
 *  answer (offline) - in which case no career data is shown at all. */
export type CareerSummaryState = "loading" | "unavailable" | CareerFieldSummary;

/** Fixed placeholder text - never a real value hidden with CSS, so nothing
 *  locked is in the page, even blurred. */
const FAKE_ROWS = ["xxxx xxxxxx", "xxxxxxx xxxx", "xxxxx xxxxxxxx", "xxxxxx xxxxx"];

function BlurredRow({ text }: { text: string }) {
  return (
    <div className="flex select-none items-center justify-between gap-4 border-b border-hairline py-2.5 last:border-b-0">
      <span className="font-medium text-text blur-[5px]">{text}</span>
      <span className="h-1.5 w-12 shrink-0 rounded-full bg-accent-600/40 blur-[2px]" />
    </div>
  );
}

function LockedRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-hairline bg-surface-sunk/60 px-4 py-3 text-left text-body text-text-secondary hover:bg-surface-sunk"
      >
        <span aria-hidden="true">🔒</span>
        <span>{label}</span>
      </button>
    </li>
  );
}

/**
 * The top of /results once the Deep-Dive is done but its report isn't paid
 * for: the headline, a small free reveal - the top aptitude strength, and how
 * many careers matched across which fields - then what's locked, and the
 * report's sections as blurred placeholders.
 *
 * No career is named anywhere here: the summary comes from the server as
 * counts and field names only (lib/careerSummary.ts), and this component
 * never ranks careers itself.
 */
export function ResultsReady({
  session,
  summary,
  onLockedClick,
}: {
  session: SessionState;
  summary: CareerSummaryState;
  /** A locked row was tapped - takes the family to the offer */
  onLockedClick: () => void;
}) {
  const firstName = session.childName?.trim().split(/\s+/)[0] || "";
  const name = firstName || "this student";
  const possessive = firstName ? `${firstName}'s` : "the";
  const Possessive = firstName ? `${firstName}'s` : "The";
  const aptitude = session.deepAptitudeScores ? rankAptitudeMcqDomains(session.deepAptitudeScores) : [];

  return (
    <section aria-labelledby="ready-heading">
      <div className="rounded-xl border border-hairline bg-surface p-5 shadow-feature sm:p-6">
        <p className="text-note font-medium text-ok-700">All 4 tests done ✓</p>
        <h2 id="ready-heading" className="mt-2 text-h2 font-semibold text-text">
          {Possessive} full career plan is ready
        </h2>
        <p className="mt-3 text-body text-text-secondary">
          Interests, aptitude, behaviour and motivation are scored and saved. Here&apos;s a first look.
        </p>

        <dl className="mt-6 space-y-3">
          {aptitude[0] && (
            <div className="rounded-lg bg-brand-50 px-4 py-3">
              <dt className="text-note text-text-secondary">Top aptitude strength</dt>
              <dd className="mt-1 text-lead font-semibold text-text">{DEEP_APTITUDE_LABELS[aptitude[0]]} reasoning</dd>
              <dd className="mt-1 text-note text-text-secondary">
                {Possessive} strongest of {DEEP_APTITUDE_DOMAINS.length} aptitudes. See how it shapes {possessive}{" "}
                career options.
              </dd>
            </div>
          )}

          {summary === "loading" && <div aria-hidden="true" className="h-24 animate-pulse rounded-lg bg-surface-sunk" />}

          {typeof summary === "object" && (
            <div className="rounded-lg bg-brand-50 px-4 py-3">
              <dt className="text-lead font-semibold text-text">{careerSummaryTitle(summary, name)}</dt>
              {summary.fields.length > 0 && (
                <dd className="mt-3">
                  <ul className="flex flex-wrap gap-2" aria-label="Matched careers by field">
                    {summary.fields.map((field) => (
                      <li
                        key={field.name}
                        className="max-w-full rounded-full border border-brand-800/15 bg-surface px-3 py-1 text-note font-medium text-brand-800"
                      >
                        {field.name} · {field.count}
                      </li>
                    ))}
                  </ul>
                </dd>
              )}
            </div>
          )}
        </dl>

        <ul className="mt-4 space-y-2">
          <LockedRow label="Which careers, ranked by fit" onClick={onLockedClick} />
          <LockedRow label={`Why each one fits ${name}: interest + aptitude + personality`} onClick={onLockedClick} />
          <LockedRow label="Which stream to choose, and which subjects" onClick={onLockedClick} />
          <LockedRow label={`1 career ${name} may not have considered`} onClick={onLockedClick} />
        </ul>
      </div>

      <h3 className="mt-12 text-h3 font-semibold text-text">Inside {possessive} report</h3>
      <p className="mt-2 text-body text-text-secondary">
        Built from {firstName ? `${firstName}'s` : "these"} own answers — unlock to read it in full.
      </p>
      <div aria-hidden="true" className="mt-5 grid gap-4 sm:grid-cols-3">
        {["Career matches", "Strengths & motivation", "Stream, subjects & roadmap"].map((section) => (
          <div key={section} className="rounded-lg border border-hairline bg-surface p-4">
            <p className="text-note font-semibold text-text">{section}</p>
            <div className="mt-2">
              {FAKE_ROWS.map((row, i) => (
                <BlurredRow key={i} text={row} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
