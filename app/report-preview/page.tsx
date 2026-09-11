"use client";

import { RIASEC_COLORS, RiasecRadarChart } from "@/components/RiasecRadarChart";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SpectrumRule } from "@/components/ui/Spectrum";
import { StarRating } from "@/components/ui/StarRating";
import { useSession } from "@/lib/context/SessionContext";
import { TYPE_SUMMARIES } from "@/lib/interpretation";
import { getTopMatches, matchPercent } from "@/lib/matching";
import {
  MAX_TYPE_SCORE,
  getHollandCode,
  isTestComplete,
  rankTypes,
  scoreResponses,
} from "@/lib/scoring";
import { RIASEC_LABELS, type RiasecType } from "@/types";

/** Stand-in profile so the report is viewable before anyone takes the test. */
const SAMPLE_SCORES: Record<RiasecType, number> = {
  R: 18,
  I: 27,
  A: 44,
  S: 41,
  E: 33,
  C: 24,
};

const TOP_N = 4;

export default function ReportPreviewPage() {
  const { session, hydrated } = useSession();

  if (!hydrated) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:py-20">
          <div aria-hidden="true" className="animate-pulse space-y-6">
            <div className="h-3 w-28 rounded-full bg-surface-sunk" />
            <div className="h-9 w-3/4 rounded-lg bg-surface-sunk" />
            <div className="h-96 rounded-xl bg-surface-sunk" />
          </div>
          <p className="sr-only">Loading the report.</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const ownScores =
    session.scores ??
    (isTestComplete(session.responses)
      ? scoreResponses(session.responses)
      : undefined);

  const usingSample = !ownScores;
  const scores = ownScores ?? SAMPLE_SCORES;
  const purchased = Boolean(session.orderId);
  const childName = usingSample ? "" : session.childName;

  const matches = getTopMatches(scores, TOP_N);
  const ranked = rankTypes(scores);
  const [first, second] = ranked;

  return (
    <>
      <SiteHeader />

      <section className="grain relative overflow-hidden bg-ink-deep pb-32 text-white">
        <div className="relative z-10 mx-auto w-full max-w-2xl px-6 pt-14 sm:pt-20">
          <SpectrumRule className="w-24" />
          <p className="mt-8 text-note text-on-dark/70">
            {purchased && !usingSample
              ? "Your detailed report"
              : "Sample report"}
          </p>
          <h1 className="mt-3 text-h1 font-semibold text-white sm:text-display">
            {childName ? `${childName}'s career report` : "Career report"}
          </h1>
          <p className="mt-6 text-lead text-on-dark">
            {usingSample
              ? "An example of the full report, built from a sample profile. Take the test and this fills with your child's own results."
              : `Built from all 60 answers. Interest code ${getHollandCode(scores)}.`}
          </p>
        </div>
      </section>

      <main className="relative z-20 mx-auto -mt-20 w-full max-w-2xl flex-1 px-6 pb-16">
        {/* --------------------------------------------------------- chart */}
        <Card className="shadow-feature">
          <h2 className="text-h3 font-semibold text-text">
            The interest profile
          </h2>
          <RiasecRadarChart scores={scores} className="mt-6" />
        </Card>

        {/* ------------------------------------------------ all six scores */}
        <section className="mt-16">
          <h2 className="text-h2 font-semibold text-text">
            What each of the six scores means
          </h2>
          <p className="mt-3 text-body text-text-secondary">
            Strongest first. Each is out of {MAX_TYPE_SCORE}.
          </p>

          <ol className="mt-9 space-y-8">
            {ranked.map((type) => {
              const summary = TYPE_SUMMARIES[type];
              const isTop = type === first || type === second;
              return (
                <li key={type}>
                  <div className="flex items-baseline justify-between gap-5 border-b border-hairline pb-3">
                    <h3 className="flex items-baseline gap-3 text-h3 font-semibold text-text">
                      <span
                        aria-hidden="true"
                        className="block size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: RIASEC_COLORS[type] }}
                      />
                      {summary.label}
                      {isTop && (
                        <span className="text-note font-normal text-text-muted">
                          strongest
                        </span>
                      )}
                    </h3>
                    <span className="shrink-0 font-mono text-note tabular-nums text-text-secondary">
                      {scores[type]}/{MAX_TYPE_SCORE}
                    </span>
                  </div>
                  <p className="mt-3 text-body leading-relaxed text-text-secondary">
                    {summary.blurb}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ----------------------------------------------- career matches */}
        <section className="mt-20">
          <h2 className="text-h2 font-semibold text-text">
            Top {TOP_N} career matches
          </h2>
          <p className="mt-3 text-body text-text-secondary">
            Ranked by how closely each career&apos;s interest profile matches{" "}
            {childName ? `${childName}'s` : "this"} one.
          </p>

          <ol className="mt-9 space-y-6">
            {matches.map((match, i) => {
              const { career } = match;
              const careerTop = rankTypes(career.profile).slice(0, 2);

              return (
                <li key={career.id}>
                  <Card>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
                      <h3 className="flex items-baseline gap-3 text-h3 font-semibold text-text">
                        <span className="font-mono text-note text-text-muted">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {career.title}
                      </h3>
                      <span className="font-mono text-body tabular-nums text-text">
                        {matchPercent(match.matchScore)}%
                      </span>
                    </div>

                    <StarRating stars={match.stars} className="mt-3" />

                    <p className="mt-5 text-body leading-relaxed text-text-secondary">
                      {career.description}
                    </p>

                    <p className="mt-5 border-l-2 border-brand-700 pl-5 text-body text-text">
                      <span className="font-medium">Why it fits:</span> this
                      career leans{" "}
                      {careerTop.map((t) => RIASEC_LABELS[t]).join(" and ")},
                      which lines up with{" "}
                      {childName ? `${childName}'s` : "this profile's"}{" "}
                      strongest interests.
                    </p>

                    {career.roadmap && (
                      <div className="mt-7 border-t border-hairline pt-6">
                        <h4 className="text-body font-medium text-text">
                          Roadmap
                        </h4>

                        <dl className="mt-5 space-y-5 text-body">
                          <div className="sm:grid sm:grid-cols-[10rem_1fr] sm:gap-6">
                            <dt className="text-text-muted">Entrance exams</dt>
                            <dd className="mt-1 text-text sm:mt-0">
                              {career.roadmap.exams.join(", ")}
                            </dd>
                          </div>
                          <div className="sm:grid sm:grid-cols-[10rem_1fr] sm:gap-6">
                            <dt className="text-text-muted">
                              Courses and paths
                            </dt>
                            <dd className="mt-1 text-text sm:mt-0">
                              {career.roadmap.collegesOrPaths.join(", ")}
                            </dd>
                          </div>
                          <div className="sm:grid sm:grid-cols-[10rem_1fr] sm:gap-6">
                            <dt className="text-text-muted">Next steps</dt>
                            <dd className="mt-2 sm:mt-0">
                              <ol className="space-y-2.5 text-text">
                                {career.roadmap.steps.map((step, s) => (
                                  <li key={step} className="flex gap-3.5">
                                    <span
                                      aria-hidden="true"
                                      className="font-mono text-note text-text-muted"
                                    >
                                      {s + 1}
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ----------------------------------------------------------- cta */}
        {usingSample ? (
          <Card tone="feature" className="mt-20">
            <h2 className="text-h2 font-semibold text-white">
              See this for your own child
            </h2>
            <p className="mt-4 text-body text-brand-100">
              The test takes about ten minutes, and the interest snapshot is
              free.
            </p>
            <ButtonLink
              href="/register"
              variant="accent"
              size="lg"
              className="mt-9 w-full sm:w-auto"
            >
              Register Now
            </ButtonLink>
          </Card>
        ) : (
          <Card tone="quiet" className="mt-20">
            <h2 className="text-h3 font-semibold text-text">
              {purchased ? "Your report" : "This is a preview"}
            </h2>
            <p className="mt-3 text-body text-text-secondary">
              {purchased
                ? "Demo build — this report is generated in your browser from your answers. Nothing was emailed or stored."
                : "Built from your real answers, shown here as a preview of the paid report."}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink
                href="/results"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Back to the snapshot
              </ButtonLink>
              {!purchased && (
                <ButtonLink
                  href="/pricing"
                  variant="accent"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  See report options
                </ButtonLink>
              )}
            </div>
          </Card>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
