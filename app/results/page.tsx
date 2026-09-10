"use client";

import { RIASEC_COLORS, RiasecRadarChart } from "@/components/RiasecRadarChart";
import { SpectrumRule } from "@/components/ui/Spectrum";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useSession } from "@/lib/context/SessionContext";
import { TYPE_SUMMARIES, getHeadline, isFlatProfile } from "@/lib/interpretation";
import {
  MAX_TYPE_SCORE,
  getAnsweredCount,
  isTestComplete,
  rankTypes,
  scoreResponses,
} from "@/lib/scoring";
import { RIASEC_LABELS } from "@/types";

const REPORT_INCLUDES = [
  "Top career matches, each with a match rating",
  "What all six scores mean, not just the top two",
  "A step-by-step roadmap, and an optional 1:1 consultation",
];

export default function ResultsPage() {
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
          <p className="sr-only">Loading results.</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  // Prefer the stored totals; recompute if the test is finished but they're
  // missing (e.g. storage written before scoring completed).
  const scores =
    session.scores ??
    (isTestComplete(session.responses)
      ? scoreResponses(session.responses)
      : undefined);

  if (!scores) {
    const answered = getAnsweredCount(session.responses);
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14 sm:py-20">
          <h1 className="text-h1 font-semibold text-text">No results yet</h1>
          <p className="mt-4 text-lead text-text-secondary">
            {answered > 0
              ? `The test is ${answered} of 60 questions in. Finish it and the snapshot appears here.`
              : "Once the 60 questions are answered, the interest snapshot appears here."}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/test" size="lg" className="w-full sm:w-auto">
              {answered > 0 ? "Resume the test" : "Go to the test"}
            </ButtonLink>
            <ButtonLink
              href="/register"
              variant="quiet"
              size="lg"
              className="w-full sm:w-auto"
            >
              Start over
            </ButtonLink>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const ranked = rankTypes(scores);
  const [first, second, third] = ranked;
  const flat = isFlatProfile(scores);
  const childName = session.childName;
  const highlighted = flat ? ranked.slice(0, 3) : [first, second];

  return (
    <>
      <SiteHeader />

      {/* Dark band: the result gets announced before it gets explained. */}
      <section className="grain relative overflow-hidden bg-ink-deep pb-32 text-white">
        <div className="relative z-10 mx-auto w-full max-w-2xl px-6 pt-14 sm:pt-20">
          <SpectrumRule className="w-24" />
          <p className="mt-8 text-note text-on-dark/70">Your free snapshot</p>
          <h1 className="mt-3 text-h1 font-semibold text-white sm:text-display">
            {childName
              ? `${childName}'s interest snapshot`
              : "Interest snapshot"}
          </h1>

          <p
            aria-hidden="true"
            className="mt-9 flex gap-3 font-display text-display font-semibold leading-none"
          >
            {ranked.slice(0, 3).map((type) => (
              <span key={type} style={{ color: RIASEC_COLORS[type] }}>
                {type}
              </span>
            ))}
          </p>
          <p className="mt-4 text-lead text-on-dark">
            Strongest three, in order. Each type is scored out of{" "}
            {MAX_TYPE_SCORE}, from all 60 answers.
          </p>
        </div>
      </section>

      <main className="relative z-20 mx-auto -mt-20 w-full max-w-2xl flex-1 px-6 pb-16">
        {/* -------- chart: the one place motion happens in this product ---- */}
        <Card className="shadow-feature">
          <RiasecRadarChart scores={scores} animate />
        </Card>

        {/* ------------------------------------------------ what stands out */}
        <section className="mt-16">
          <h2 className="text-h2 font-semibold text-text">
            {getHeadline(scores, childName)}
          </h2>

          {flat && (
            <p className="mt-4 text-body text-text-secondary">
              No single type pulls ahead here, which is common and perfectly
              normal at this age. The three highest are still worth a look, but
              treat them as leanings rather than a clear direction.
            </p>
          )}

          <div className="mt-9 space-y-10">
            {highlighted.map((type) => {
              const summary = TYPE_SUMMARIES[type];
              return (
                <article key={type}>
                  <div className="flex items-baseline justify-between gap-5 border-b border-hairline pb-3">
                    <h3 className="flex items-baseline gap-3 text-h3 font-semibold text-text">
                      <span
                        aria-hidden="true"
                        className="block size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: RIASEC_COLORS[type] }}
                      />
                      {summary.label}
                    </h3>
                    <span className="shrink-0 font-mono text-note tabular-nums text-text-secondary">
                      {scores[type]}/{MAX_TYPE_SCORE}
                    </span>
                  </div>

                  <p className="mt-4 text-lead font-medium text-text">
                    {summary.headline}
                  </p>
                  <p className="mt-3 text-body leading-relaxed text-text-secondary">
                    {summary.blurb}
                  </p>
                  <p className="mt-4 text-note text-text-muted">
                    Shows up as: {summary.examples}
                  </p>
                </article>
              );
            })}
          </div>

          {!flat && (
            <p className="mt-10 text-body text-text-secondary">
              {RIASEC_LABELS[third]} comes next, at {scores[third]}. Most people
              are a blend of two or three types rather than one.
            </p>
          )}

          <p className="mt-8 border-l-2 border-hairline pl-5 text-body text-text-secondary">
            This describes what {childName || "your child"} is drawn to — not
            how capable they are, and not a prediction of marks.
          </p>
        </section>

        {/* ------------------------------------------------------------ cta */}
        <Card tone="feature" className="mt-16">
          <h2 className="text-h2 font-semibold text-white">
            What careers actually fit this profile?
          </h2>
          <p className="mt-4 text-body text-brand-100">
            The detailed report matches {childName || "your child"}&apos;s six
            scores against career profiles and ranks them, with entrance exams,
            courses and next steps for each.
          </p>
          <ul className="mt-7 space-y-3.5 text-body text-white">
            {REPORT_INCLUDES.map((item) => (
              <li key={item} className="flex gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-2 block size-1 shrink-0 rounded-full bg-accent-600"
                />
                {item}
              </li>
            ))}
          </ul>
          <ButtonLink
            href="/pricing"
            variant="accent"
            size="lg"
            className="mt-9 w-full sm:w-auto"
          >
            See report options
          </ButtonLink>
          <p className="mt-5 text-note text-brand-100/75">
            The snapshot above stays free — these are optional add-ons.
          </p>
        </Card>
      </main>

      <SiteFooter />
    </>
  );
}
