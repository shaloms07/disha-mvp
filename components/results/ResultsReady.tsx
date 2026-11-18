import { BlurredRow, BlurredSection, FAKE_ROWS, LockedRow } from "@/components/results/Locked";
import { careerSummaryTitle, type CareerFieldSummary } from "@/lib/careerSummary";
import { rankAptitudeMcqDomains } from "@/lib/deepAptitudeScoring";
import { lockedStreamRow } from "@/lib/offerCopy";
import { tensionLine } from "@/lib/tension";
import { DEEP_APTITUDE_DOMAINS, DEEP_APTITUDE_LABELS, type SessionState } from "@/types";

/** Where the career summary stands: loading, the server's counts, or no
 *  answer (offline) - in which case no career data is shown at all. */
export type CareerSummaryState = "loading" | "unavailable" | CareerFieldSummary;

/** How many blurred ranks show before "⋯" and the last rank */
const LOCKED_RANKS_SHOWN = 3;

function LockedRank({ rank }: { rank: number }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-8 shrink-0 text-note font-semibold text-text-muted">#{rank}</span>
      <span className="flex-1">
        <BlurredRow text={FAKE_ROWS[(rank - 1) % FAKE_ROWS.length]} />
      </span>
      <span aria-label="locked">🔒</span>
    </li>
  );
}

/**
 * The top of /results once the Deep-Dive is done but its report isn't paid
 * for. Finishing the Deep-Dive lands here directly - there's no separate
 * "well done" screen.
 *
 * SNAPSHOT_V2 (the server sent a `tension` key): the locked plan itself -
 * "{N} careers matched", the one tension line (lib/tension.ts), the ranked
 * list with every rank blurred - then the locked rows. No aptitude, no
 * fields, no career names.
 *
 * Without it: the earlier reveal - top aptitude, careers by field.
 *
 * Careers are never ranked here: everything comes from the server
 * (lib/careerSummary.ts), which sends counts only.
 */
export function ResultsReady({
  session,
  summary,
  onLockedClick,
  hideReportPreview = false,
}: {
  session: SessionState;
  summary: CareerSummaryState;
  /** RESULT_PAGE_V2: leave out the blurred "Inside the report" cards, so
   *  the price starts sooner (its trust block shows a real sample instead) */
  hideReportPreview?: boolean;
  /** A locked row was tapped - takes the family to the offer */
  onLockedClick: () => void;
}) {
  const firstName = session.childName?.trim().split(/\s+/)[0] || "";
  const name = firstName || "this student";
  const possessive = firstName ? `${firstName}'s` : "the";
  const Possessive = firstName ? `${firstName}'s` : "The";
  const v2 = typeof summary === "object" && summary.tension !== undefined;
  const aptitude = !v2 && session.deepAptitudeScores ? rankAptitudeMcqDomains(session.deepAptitudeScores) : [];

  return (
    <section aria-labelledby="ready-heading">
      <div className="rounded-xl border border-hairline bg-surface p-5 shadow-feature sm:p-6">
        <p className="text-note font-medium text-ok-700">All 4 tests done ✓</p>
        <h2 id="ready-heading" className="mt-2 text-h2 font-semibold text-text">
          {Possessive} full career plan is ready
        </h2>

        {summary === "loading" && <div aria-hidden="true" className="mt-6 h-24 animate-pulse rounded-lg bg-surface-sunk" />}

        {typeof summary === "object" && v2 && (
          <>
            <p className="mt-5 text-lead font-semibold text-text">{careerSummaryTitle(summary, name)}</p>
            {summary.tension && (
              <p className="mt-3 rounded-lg border-l-4 border-accent-600 bg-accent-600/5 px-4 py-3 text-body font-medium text-text">
                {tensionLine(summary.tension, name)}
              </p>
            )}
            {summary.matchedCount > 0 && (
              <ol className="mt-5 rounded-lg border border-hairline px-4" aria-label={`${Possessive} careers, ranked - locked`}>
                {Array.from({ length: Math.min(LOCKED_RANKS_SHOWN, summary.matchedCount) }, (_, i) => (
                  <LockedRank key={i} rank={i + 1} />
                ))}
                {summary.matchedCount > LOCKED_RANKS_SHOWN + 1 && (
                  <li aria-hidden="true" className="py-1 pl-11 text-note text-text-muted">
                    ⋯
                  </li>
                )}
                {summary.matchedCount > LOCKED_RANKS_SHOWN && <LockedRank rank={summary.matchedCount} />}
              </ol>
            )}
            {summary.matchedCount > 0 && (
              <p className="mt-2 text-note text-text-secondary">
                All {summary.matchedCount} ranked by fit — unlock to see which careers they are.
              </p>
            )}
          </>
        )}

        {typeof summary === "object" && !v2 && (
          <>
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
            </dl>
          </>
        )}

        <ul className="mt-5 space-y-2">
          {!v2 && <LockedRow label="Which careers, ranked by fit" onClick={onLockedClick} />}
          <LockedRow label={`Why each one fits ${name}: interest + aptitude + personality`} onClick={onLockedClick} />
          <LockedRow label={lockedStreamRow(session.childClass)} onClick={onLockedClick} />
          {!v2 && <LockedRow label={`1 career ${name} may not have considered`} onClick={onLockedClick} />}
        </ul>
      </div>

      {!hideReportPreview && (
        <>
          <h3 className="mt-12 text-h3 font-semibold text-text">Inside {possessive} report</h3>
          <p className="mt-2 text-body text-text-secondary">
            Built from {firstName ? `${firstName}'s` : "these"} own answers — unlock to read it in full.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {["Career matches", "Strengths & motivation", "Stream, subjects & roadmap"].map((section) => (
              <BlurredSection key={section} title={section} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
