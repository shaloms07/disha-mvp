import { rankAptitudeMcqDomains } from "@/lib/deepAptitudeScoring";
import { matchCareers } from "@/lib/matching";
import { rankDeepWorkValues } from "@/lib/deepWorkValuesScoring";
import { DEEP_APTITUDE_LABELS, DEEP_WORK_VALUE_LABELS, type RiasecType, type SessionState } from "@/types";

/** Same length and shape as the real text, so a blurred row looks real
 *  without the words being readable in the page source. */
function disguise(text: string): string {
  return text.replace(/[A-Za-z]/g, "x");
}

function BlurredRow({ text, width }: { text: string; width?: string }) {
  return (
    <div className="flex select-none items-center justify-between gap-4 border-b border-hairline py-2.5 last:border-b-0">
      <span className="font-medium text-text blur-[5px]">{disguise(text)}</span>
      <span className="h-1.5 shrink-0 rounded-full bg-accent-600/40 blur-[2px]" style={{ width: width ?? "4rem" }} />
    </div>
  );
}

/**
 * The top of /results once the Deep-Dive is done but its report isn't paid
 * for: the headline, a small real reveal (the top aptitude strength and the
 * #1 career match), then the actual report's sections, blurred - built from
 * this child's real results, so the preview is theirs rather than a generic
 * sample. Nothing readable leaks: blurred text is disguised in the markup too.
 */
export function ResultsReady({
  session,
  scores,
}: {
  session: SessionState;
  scores: Record<RiasecType, number>;
}) {
  const name = session.childName || "This student";
  const possessive = session.childName ? `${session.childName}'s` : "The";
  const aptitude = session.deepAptitudeScores ? rankAptitudeMcqDomains(session.deepAptitudeScores) : [];
  const values = session.deepWorkValuesScores ? rankDeepWorkValues(session.deepWorkValuesScores) : [];
  const careers = matchCareers(scores);
  const [topCareer] = careers;

  return (
    <section aria-labelledby="ready-heading">
      <div className="rounded-xl border border-hairline bg-surface p-5 shadow-feature sm:p-6">
        <p className="text-note font-medium text-ok-700">All 4 tests done ✓</p>
        <h2 id="ready-heading" className="mt-2 text-h2 font-semibold text-text">
          {possessive} full career plan is ready
        </h2>
        <p className="mt-3 text-body text-text-secondary">
          Interests, aptitude, behaviour and motivation are scored and saved. Here&apos;s a first look.
        </p>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          {aptitude[0] && (
            <div className="rounded-lg bg-brand-50 px-4 py-3">
              <dt className="text-note text-text-secondary">Top aptitude strength</dt>
              <dd className="mt-1 text-lead font-semibold text-text">{DEEP_APTITUDE_LABELS[aptitude[0]]} reasoning</dd>
            </div>
          )}
          {topCareer && (
            <div className="rounded-lg bg-brand-50 px-4 py-3">
              <dt className="text-note text-text-secondary">#1 career match</dt>
              <dd className="mt-1 text-lead font-semibold text-text">{topCareer.career.title}</dd>
            </div>
          )}
        </dl>
      </div>

      <h3 className="mt-12 text-h3 font-semibold text-text">Inside {possessive.toLowerCase() === "the" ? "the" : possessive} report</h3>
      <p className="mt-2 text-body text-text-secondary">
        Built from {name === "This student" ? "these" : `${name}'s`} own answers — unlock to read it in full.
      </p>
      <div aria-hidden="true" className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-hairline bg-surface p-4">
          <p className="text-note font-semibold text-text">Career matches</p>
          <div className="mt-2">
            {careers.slice(1, 5).map((match, i) => (
              <BlurredRow key={match.career.id} text={match.career.title} width={`${4.5 - i * 0.6}rem`} />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-hairline bg-surface p-4">
          <p className="text-note font-semibold text-text">Strengths &amp; motivation</p>
          <div className="mt-2">
            {aptitude.slice(1).map((domain) => (
              <BlurredRow key={domain} text={`${DEEP_APTITUDE_LABELS[domain]} reasoning`} width="3rem" />
            ))}
            {values.slice(0, 2).map((value) => (
              <BlurredRow key={value} text={DEEP_WORK_VALUE_LABELS[value]} width="3.5rem" />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-hairline bg-surface p-4">
          <p className="text-note font-semibold text-text">Stream, subjects &amp; roadmap</p>
          <div className="mt-2">
            {["Recommended stream", "Subject choices", "Entrance exams", "Courses and colleges"].map((row) => (
              <BlurredRow key={row} text={row} width="2.5rem" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
