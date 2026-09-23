"use client";

import { useState } from "react";
import { CareerRoadmapModal } from "@/components/CareerRoadmapModal";
import { ConsultationScheduler } from "@/components/ConsultationScheduler";
import { DeepDiveTabs } from "@/components/DeepDiveTabs";
import { DownloadReportButtons } from "@/components/DownloadReportButtons";
import { RIASEC_COLORS, RiasecRadarChart } from "@/components/RiasecRadarChart";
import { SiteFooter } from "@/components/SiteFooter";
import { UpgradeCart } from "@/components/UpgradeCart";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SpectrumRule } from "@/components/ui/Spectrum";
import { StarRating } from "@/components/ui/StarRating";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/context/SessionContext";
import { isDeepDiveComplete } from "@/lib/testModules";
import { TYPE_SUMMARIES } from "@/lib/interpretation";
import { getTopMatches, matchPercent } from "@/lib/matching";
import {
  MAX_TYPE_SCORE,
  getHollandCode,
  isTestComplete,
  rankTypes,
  scoreResponses,
} from "@/lib/scoring";
import { attentionCheckPassed } from "@/lib/sjtScoring";
import type { RiasecType } from "@/types";

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
  /** Which career's detail is open, by id. Null closes the modal. */
  const [openCareer, setOpenCareer] = useState<string | null>(null);

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

  // Shared with /results, so the two screens can't disagree about whether the
  // Deep-Dive is finished.
  const deepDiveDone = isDeepDiveComplete(session);

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
  const activeMatch = matches.find((m) => m.career.id === openCareer) ?? null;

  return (
    <>
      <SiteHeader />

      <section className="grain relative overflow-hidden bg-ink-deep pb-32 text-white">
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pt-14 sm:pt-20">
          <SpectrumRule className="w-24" />
          <p className="mt-8 text-note text-on-dark/70">
            {purchased && !usingSample
              ? "Your detailed report"
              : "Sample report"}
          </p>
          <h1 className="mt-3 text-h1 font-semibold text-white sm:text-display">
            {childName ? `${childName}'s career report` : "Career report"}
          </h1>
          <p className="mt-6 max-w-2xl text-lead text-on-dark">
            {usingSample
              ? "An example of the full report, built from a sample profile. Take the test and this fills with your child's own results."
              : `Built from all 36 answers. Interest code ${getHollandCode(scores)}.`}
          </p>
        </div>
      </section>

      <main className="relative z-20 mx-auto -mt-20 w-full max-w-4xl flex-1 px-6 pb-16">
        {/* --------------------------------------------------------- chart */}
        <Card className="shadow-feature">
          <h2 className="text-h3 font-semibold text-text">
            The interest profile
          </h2>
          <RiasecRadarChart scores={scores} className="mt-6" />
        </Card>

        {/* ------------------------------------------------ all six scores */}
        <section className="mt-14">
          <h2 className="text-h2 font-semibold text-text">
            What each of the six scores means
          </h2>
          <p className="mt-3 max-w-2xl text-body text-text-secondary">
            Strongest first — how many times each type was picked, out of how
            often it appeared.
          </p>

          {/* Six cards read as six comparable things; stacked full-width they
              read as six sections to work through. Two up on a phone as well —
              three rows of two scans better than six full-width blocks. */}
          <ol className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
            {ranked.map((type) => {
              const summary = TYPE_SUMMARIES[type];
              const isTop = type === first || type === second;
              const pct = Math.round((scores[type] / MAX_TYPE_SCORE[type]) * 100);

              return (
                <li key={type}>
                  {/* flush + explicit padding: cn() is a plain join, so a
                      className of p-4 would sit alongside the tone's p-6
                      rather than replacing it. Two to a row on a phone is a
                      ~160px card, which wants less padding than a full-width
                      one, and a smaller heading. */}
                  <Card
                    flush
                    className={cn(
                      "h-full p-4 sm:p-5",
                      isTop && "border-brand-700/35 bg-brand-50/40",
                    )}
                  >
                    {/* Wraps rather than squeezing the label and the score
                        onto one cramped line on a narrow card. */}
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h3 className="flex items-baseline gap-2 text-body font-semibold text-text sm:gap-2.5 sm:text-h3">
                        <span
                          aria-hidden="true"
                          className="block size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: RIASEC_COLORS[type] }}
                        />
                        {summary.label}
                      </h3>
                      <span className="shrink-0 font-mono text-note tabular-nums text-text-secondary">
                        {scores[type]}/{MAX_TYPE_SCORE[type]}
                      </span>
                    </div>

                    {/* The type's own colour, since the six are identity here
                        and the radar above uses exactly these hues. */}
                    <div
                      aria-hidden="true"
                      className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-surface-sunk"
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          backgroundColor: RIASEC_COLORS[type],
                        }}
                      />
                    </div>

                    {isTop && (
                      <p className="mt-2.5 text-note font-medium text-brand-700">
                        One of the two strongest
                      </p>
                    )}

                    <p className="mt-3.5 text-note leading-relaxed text-text-secondary">
                      {summary.blurb}
                    </p>
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ----------------------------------------------- deep-dive results */}
        {deepDiveDone && aptitudeScores && sjtScores && workValueScores && (
          <section className="mt-16">
            <h2 className="text-h2 font-semibold text-text">
              The Deep-Dive Assessment
            </h2>
            <p className="mt-3 max-w-2xl text-body text-text-secondary">
              Aptitude, Behavioral and Work Values — the three tests that came
              with this report. Pick one to look at.
            </p>

            <div className="mt-8">
              <DeepDiveTabs
                aptitudeScores={aptitudeScores}
                sjtScores={sjtScores}
                workValueScores={workValueScores}
                childName={childName}
                attentionOk={attentionOk}
              />
            </div>

            {!usingSample && (
              <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-hairline pt-8">
                <div>
                  <p className="text-body font-semibold text-text">
                    Take this report with you
                  </p>
                  <p className="mt-1 text-note text-text-secondary">
                    A print-ready PDF of your full assessment report, built for sharing.
                  </p>
                </div>
                <DownloadReportButtons
                  childName={childName}
                  childClass={session.childClass}
                  orderId={session.orderId}
                  scores={scores}
                  aptitudeScores={aptitudeScores}
                  sjtScores={sjtScores}
                  workValueScores={workValueScores}
                  attentionOk={attentionOk}
                  hasRoadmap={session.selectedTiers.roadmap}
                />
              </div>
            )}
          </section>
        )}

        {/* ----------------------------------------------- career matches */}
        <section className="mt-16">
          <h2 className="text-h2 font-semibold text-text">
            Top {TOP_N} career matches
          </h2>
          <p className="mt-3 max-w-2xl text-body text-text-secondary">
            Ranked by how closely each career&apos;s interest profile matches{" "}
            {childName ? `${childName}'s` : "this"} one. Open any one for the
            full roadmap.
          </p>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {matches.map((match, i) => {
              const { career } = match;
              const hasRoadmap = Boolean(career.roadmap) && showRoadmap;

              return (
                <li key={career.id}>
                  <Card className="flex h-full flex-col">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="flex items-baseline gap-2.5 text-h3 font-semibold text-text">
                        <span className="font-mono text-note text-text-muted">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {career.title}
                      </h3>
                      <span className="shrink-0 font-mono text-note tabular-nums text-text">
                        {matchPercent(match.matchScore)}%
                      </span>
                    </div>

                    <StarRating stars={match.stars} className="mt-3" />

                    {/* Clamped: the full description is a click away, and four
                        cards of equal height scan far better than four of
                        whatever height their prose happens to need. */}
                    <p className="mt-4 line-clamp-3 text-note leading-relaxed text-text-secondary">
                      {career.description}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setOpenCareer(career.id)}
                      >
                        {hasRoadmap ? "View roadmap" : "Why it fits"}
                      </Button>
                      {career.roadmap && !showRoadmap && (
                        <span className="text-note text-text-muted">
                          Roadmap is an add-on
                        </span>
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>

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

      {activeMatch && (
        <CareerRoadmapModal
          match={activeMatch}
          childName={childName}
          showRoadmap={showRoadmap}
          onClose={() => setOpenCareer(null)}
        />
      )}

      <SiteFooter />
    </>
  );
}
