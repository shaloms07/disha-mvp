import { matchCareers, matchPercent } from "@/lib/matching";
import { CAREER_STREAM, STREAM_TITLES, matchStreams } from "@/lib/school/streams";
import { rankInterestTypes } from "@/lib/scoring";
import { RIASEC_LABELS, type CareerMatch, type RiasecType } from "@/types";

/** How many matches show (blurred) under the one free match, before "+N more" */
const BLURRED_PREVIEW = 3;

/** A second stream counts as a co-lean when it's within this many match points */
const CO_LEAN_GAP = 5;

/** A stream "draws on" an interest it rates at least this high (1-10 scale) */
const STREAM_USES = 6;

function matchLabel(stars: number): string {
  if (stars >= 8) return "Strong match";
  if (stars >= 6) return "Good match";
  return "Possible match";
}

/** Same length and shape as the real title, so the blurred row looks real
 *  without the name being readable in the page source. */
function disguise(title: string): string {
  return title.replace(/[A-Za-z]/g, "x");
}

function joinWithAnd(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * The one-line reason under the stream lean: which of the child's three
 * strongest interests that stream actually draws on. Streams are matched on
 * the whole interest shape (lib/matching.ts), so a stream can lean ahead
 * without using the #2 interest - saying which interests it does use keeps
 * the lean from reading as if it contradicts the top-three list.
 */
function streamReason(stream: CareerMatch, scores: Record<RiasecType, number>): string {
  const used = rankInterestTypes(scores)
    .slice(0, 3)
    .filter((type) => stream.career.profile[type] >= STREAM_USES)
    .map((type) => RIASEC_LABELS[type]);
  return used.length > 0
    ? `It draws on ${joinWithAnd(used)} — among the strongest interests here.`
    : "Its overall mix of interests is the closest to this profile.";
}

/**
 * "What this means for <name>" - the stream lean (with why), one real career
 * match, the next few blurred and a count of the rest. Unlocked (any paid
 * tier): stream direction only - the career list lives in the Career Match
 * Report PDF, not on the page.
 *
 * Careers come from lib/matching.ts and streams from the stream profiles the
 * school dashboards use (lib/school/streams.ts) - the same data the Career
 * Match Report PDF is built from, so the page and the PDF always agree.
 */
export function CareerGap({
  scores,
  childName,
  unlocked,
}: {
  scores: Record<RiasecType, number>;
  childName?: string;
  unlocked: boolean;
}) {
  const name = childName || "this student";
  const possessive = childName ? `${childName}'s` : "these";
  const matches = matchCareers(scores);
  const streams = matchStreams(scores);
  const [free] = matches;
  const hiddenCount = Math.max(0, matches.length - 1 - BLURRED_PREVIEW);

  if (unlocked) {
    return (
      <section className="mt-16">
        <h2 className="text-h2 font-semibold text-text">Stream direction for {name}</h2>
        <p className="mt-3 text-body text-text-secondary">
          How each stream lines up with {possessive} interests.
        </p>

        <div className="mt-6 rounded-xl border border-hairline bg-surface p-5 sm:p-6">
          <ul className="space-y-3">
            {streams.map((stream) => (
              <li key={stream.career.id}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium text-text">{stream.career.title}</span>
                  <span className="font-mono text-note text-text-secondary">{matchPercent(stream.matchScore)}%</span>
                </div>
                <p className="mt-0.5 text-note text-text-muted">{stream.career.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  const [lean, runnerUp] = streams;
  const leans =
    runnerUp && matchPercent(lean.matchScore) - matchPercent(runnerUp.matchScore) <= CO_LEAN_GAP
      ? [lean, runnerUp]
      : [lean];
  // The free career can sit in a different stream from the lean (Architect is
  // reached through Science even for a hands-on, creative profile) - say so
  // instead of leaving the two to look contradictory.
  const freeStreamId = free ? CAREER_STREAM[free.career.id] : undefined;
  const freeStreamTitle =
    freeStreamId && !leans.some((s) => s.career.id === freeStreamId) ? STREAM_TITLES[freeStreamId] : undefined;

  return (
    <section className="mt-16">
      <h2 className="text-h2 font-semibold text-text">What this means for {name}</h2>

      <div className="mt-6 rounded-xl border border-accent-600/25 bg-accent-100/40 p-5 sm:p-6">
        <h3 className="text-body font-semibold text-text">Stream lean</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {leans.map((stream) => (
            <span key={stream.career.id} className="rounded-full bg-brand-50 px-3 py-1 text-note font-medium text-brand-800">
              {stream.career.title}
            </span>
          ))}
          <span className="rounded-full bg-surface-sunk px-3 py-1 text-note text-text-muted">
            🔒 Full stream &amp; subject advice
          </span>
        </div>
        <p className="mt-2 text-note text-text-secondary">{streamReason(lean, scores)}</p>

        <h3 className="mt-6 text-body font-semibold text-text">Careers that match {possessive} interests</h3>
        {free && (
          <div className="mt-3 rounded-lg border border-hairline bg-surface px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-note font-semibold uppercase tracking-wide text-accent-700">Free</p>
                <p className="font-semibold text-text">{free.career.title}</p>
              </div>
              <span className="shrink-0 rounded-full bg-ok-700/10 px-2.5 py-0.5 text-note font-medium text-ok-700">
                {matchLabel(free.stars)}
              </span>
            </div>
            {freeStreamTitle && (
              <p className="mt-1.5 text-note text-text-muted">Usually reached through {freeStreamTitle}.</p>
            )}
          </div>
        )}
        <div aria-hidden="true">
          {matches.slice(1, 1 + BLURRED_PREVIEW).map((match) => (
            <div
              key={match.career.id}
              className="mt-2.5 flex select-none items-center justify-between gap-4 rounded-lg border border-hairline bg-surface px-4 py-3"
            >
              <span className="font-semibold text-text blur-[5px]">{disguise(match.career.title)}</span>
              <span className="shrink-0 rounded-full bg-ok-700/10 px-2.5 py-0.5 text-note text-ok-700 blur-[5px]">
                xxxxxx xxxxx
              </span>
            </div>
          ))}
        </div>
        {hiddenCount > 0 && (
          <p className="mt-3 text-center text-note text-text-secondary">
            🔒 <span className="font-semibold">+{hiddenCount} more careers</span> ranked for {name}
          </p>
        )}
      </div>

      <p className="mt-6 border-l-2 border-accent-600 pl-4 text-body text-text">
        <span className="font-semibold">Interest shows what {name} enjoys.</span> Aptitude and personality show where{" "}
        {name}&apos;s strengths lie — that&apos;s what the Deep-Dive measures.
      </p>
    </section>
  );
}
