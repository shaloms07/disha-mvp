"use client";

import { ConsultationScheduler } from "@/components/ConsultationScheduler";
import { RIASEC_COLORS, RiasecRadarChart } from "@/components/RiasecRadarChart";
import { SiteFooter } from "@/components/SiteFooter";
import { UpgradeCart } from "@/components/UpgradeCart";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SpectrumRule } from "@/components/ui/Spectrum";
import { StarRating } from "@/components/ui/StarRating";
import { useSession } from "@/lib/context/SessionContext";
import {
  APTITUDE_MCQ_MAX_SCORE,
  aptitudeMcqScoreToPercent,
  rankAptitudeMcqDomains,
} from "@/lib/deepAptitudeScoring";
import {
  DEEP_WORK_VALUES_MAX_SCORE,
  rankDeepWorkValues,
} from "@/lib/deepWorkValuesScoring";
import { TYPE_SUMMARIES } from "@/lib/interpretation";
import { getTopMatches, matchPercent } from "@/lib/matching";
import {
  MAX_TYPE_SCORE,
  getHollandCode,
  isTestComplete,
  rankTypes,
  scoreResponses,
} from "@/lib/scoring";
import { attentionCheckPassed, rankSjtTraits, sjtScoreToPercent } from "@/lib/sjtScoring";
import {
  DEEP_APTITUDE_LABELS,
  DEEP_WORK_VALUE_LABELS,
  RIASEC_LABELS,
  SJT_TRAIT_LABELS,
  type RiasecType,
} from "@/types";

/** Stand-in profile so the report is viewable before anyone takes the test. */
const SAMPLE_SCORES: Record<RiasecType, number> = {
  R: 3,
  I: 5,
  A: 10,
  S: 9,
  E: 7,
  C: 4,
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

  const deepDiveDone = Boolean(
    session.deepAptitudeScores && session.sjtScores && session.deepWorkValuesScores,
  );

  // Paid but hasn't finished the three Deep-Dive tests yet — there's no full
  // report to show without them, so send the student back to /test instead
  // of quietly rendering a report that's missing three-quarters of what was
  // paid for.
  if (purchased && !deepDiveDone) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14 sm:py-20">
          <p className="text-note text-ok-700">Order confirmed</p>
          <h1 className="mt-3 text-h1 font-semibold text-text">
            One more step before the report&apos;s ready
          </h1>
          <p className="mt-4 text-lead text-text-secondary">
            The Deep-Dive Assessment — Aptitude, Behavioral and Work Values —
            isn&apos;t finished yet. Finish it and this page fills in.
          </p>
          <ButtonLink href="/test" variant="accent" size="lg" className="mt-9 w-full sm:w-auto">
            Start the Deep-Dive Assessment
          </ButtonLink>
        </main>
        <SiteFooter />
      </>
    );
  }

  // The sample report is a sales pitch shown before anyone's paid for
  // anything — it shows the roadmap in full rather than teasing a paywall a
  // visitor hasn't even been offered yet. A real session gates on what was
  // actually bought.
  const showRoadmap = usingSample || session.selectedTiers.roadmap;

  const aptitudeScores = session.deepAptitudeScores;
  const sjtScores = session.sjtScores;
  const workValueScores = session.deepWorkValuesScores;
  const attentionOk = attentionCheckPassed(session.sjtResponses ?? {});

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
              : `Built from all 36 answers. Interest code ${getHollandCode(scores)}.`}
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
            Strongest first — how many times each type was picked, out of how
            often it appeared.
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
                      {scores[type]}/{MAX_TYPE_SCORE[type]}
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

                    {career.roadmap && showRoadmap && (
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

                    {career.roadmap && !showRoadmap && (
                      <p className="mt-7 border-t border-hairline pt-6 text-note text-text-muted">
                        Entrance exams, courses and next steps for this career
                        are part of the Roadmap add-on — see below to unlock
                        it.
                      </p>
                    )}
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ----------------------------------------------- deep-dive results */}
        {deepDiveDone && aptitudeScores && sjtScores && workValueScores && (
          <section className="mt-20">
            <h2 className="text-h2 font-semibold text-text">
              The Deep-Dive Assessment
            </h2>
            <p className="mt-3 text-body text-text-secondary">
              Aptitude, Behavioral and Work Values — the three tests that came
              with this report.
            </p>

            <div className="mt-9 space-y-10">
              <div>
                <h3 className="text-h3 font-semibold text-text">Aptitude</h3>
                <p className="mt-2 text-note text-text-muted">
                  Correct answers per domain, not a self-rating.
                </p>
                <ul className="mt-5 space-y-3.5">
                  {rankAptitudeMcqDomains(aptitudeScores).map((domain) => (
                    <li key={domain} className="flex items-center gap-4">
                      <span className="w-24 shrink-0 text-note text-text-secondary">
                        {DEEP_APTITUDE_LABELS[domain]}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunk">
                        <span
                          className="block h-full rounded-full bg-brand-700"
                          style={{
                            width: `${Math.max(aptitudeMcqScoreToPercent(aptitudeScores[domain], domain), 2)}%`,
                          }}
                        />
                      </span>
                      <span className="w-12 shrink-0 text-right font-mono text-note tabular-nums text-text">
                        {aptitudeScores[domain]}/{APTITUDE_MCQ_MAX_SCORE[domain]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-h3 font-semibold text-text">Behavioral</h3>
                <p className="mt-2 text-note text-text-muted">
                  Strongest traits from how {childName || "your child"} said
                  they&apos;d handle everyday situations.
                </p>
                <ul className="mt-5 space-y-3.5">
                  {rankSjtTraits(sjtScores)
                    .slice(0, 3)
                    .map((trait) => (
                      <li key={trait} className="flex items-center gap-4">
                        <span className="w-32 shrink-0 text-note text-text-secondary">
                          {SJT_TRAIT_LABELS[trait]}
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunk">
                          <span
                            className="block h-full rounded-full bg-brand-700"
                            style={{
                              width: `${Math.max(sjtScoreToPercent(sjtScores[trait], trait), 2)}%`,
                            }}
                          />
                        </span>
                      </li>
                    ))}
                </ul>
                {attentionOk === false && (
                  <p className="mt-4 border-l-2 border-hairline pl-5 text-note text-text-muted">
                    This section missed its attention-check question — read
                    these results as a rough read rather than a firm one.
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-h3 font-semibold text-text">Work values</h3>
                <p className="mt-2 text-note text-text-muted">
                  What {childName || "your child"} said matters most in a
                  future job.
                </p>
                <ul className="mt-5 space-y-3.5">
                  {rankDeepWorkValues(workValueScores)
                    .slice(0, 5)
                    .map((value) => (
                      <li key={value} className="flex items-center gap-4">
                        <span className="w-40 shrink-0 text-note text-text-secondary">
                          {DEEP_WORK_VALUE_LABELS[value]}
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunk">
                          <span
                            className="block h-full rounded-full bg-brand-700"
                            style={{
                              width: `${Math.max((workValueScores[value] / DEEP_WORK_VALUES_MAX_SCORE) * 100, 2)}%`,
                            }}
                          />
                        </span>
                        <span className="w-6 shrink-0 text-right font-mono text-note tabular-nums text-text">
                          {workValueScores[value]}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ------------------------------------------------- upgrade cart */}
        {!usingSample && <UpgradeCart tiers={session.selectedTiers} />}

        {/* --------------------------------------------------- consultation */}
        {deepDiveDone && session.selectedTiers.consultation && (
          <ConsultationScheduler childName={childName} />
        )}

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
