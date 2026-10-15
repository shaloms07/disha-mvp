import Link from "next/link";
import { RiasecRadarChart } from "@/components/RiasecRadarChart";
import { SiteFooter } from "@/components/SiteFooter";
import { StickyStartTestBar } from "@/components/StickyStartTestBar";
import { Wordmark } from "@/components/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { Card, SectionHeading } from "@/components/ui/Card";
import { SpectrumLetters, SpectrumRule } from "@/components/ui/Spectrum";
import { TOTAL_QUESTIONS } from "@/lib/scoring";
import type { RiasecType } from "@/types";

/** A plausible finished profile, used only to show what a result looks like. */
const SAMPLE_SCORES: Record<RiasecType, number> = {
  R: 3,
  I: 5,
  A: 10,
  S: 9,
  E: 7,
  C: 4,
};

const STEPS = [
  {
    title: "You register",
    body: "Your name, your child's name, and which class they're in. About a minute.",
  },
  {
    title: "Your child gets a link",
    body: "Open it on their phone or yours, whenever suits them. Nothing is timed.",
  },
  {
    title: "They answer 36 questions",
    body: "Pairs of everyday activities — pick whichever one appeals more.",
  },
  {
    title: "You get the snapshot",
    body: "Six interest scores, and a plain-language read on the two that stand out.",
  },
];

const TYPE_GLOSS: { letter: RiasecType; name: string; gloss: string }[] = [
  {
    letter: "R",
    name: "Realistic",
    gloss: "Builds, fixes, works with real things",
  },
  {
    letter: "I",
    name: "Investigative",
    gloss: "Digs into how and why things work",
  },
  {
    letter: "A",
    name: "Artistic",
    gloss: "Makes things, and makes them their own way",
  },
  { letter: "S", name: "Social", gloss: "Teaches, helps, listens" },
  {
    letter: "E",
    name: "Enterprising",
    gloss: "Leads, persuades, takes the chance",
  },
  {
    letter: "C",
    name: "Conventional",
    gloss: "Orders, plans, gets it exactly right",
  },
];

const REPORT_TEASERS = [
  "Top career matches, each with a match rating",
  "What all six scores mean for your child",
  "Entrance exams, courses and next steps per career",
];

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "How long does it take?",
    a: "About 5 minutes. Each question is a quick pick between two activities, one at a time, and progress is saved as they go, so it is fine to stop and come back.",
  },
  {
    q: "Is my child's information safe?",
    a: "Only our team can see it. It is stored securely to run the test and send you the results, never sold, and you can ask us to delete it at any time by contacting support.",
  },
  {
    q: "What is free and what is paid?",
    a: "The 36 questions and the interest snapshot are free. A detailed report, a step-by-step roadmap, and a 1:1 consultation are available afterwards as optional paid add-ons.",
  },
  {
    q: "What happens to what I enter?",
    a: (
      <>
        We store your details and your child&apos;s answers securely, only
        to run the test and send you the report. We do not sell your data.
        Read our{" "}
        <Link href="/privacy" className="font-medium text-brand-700 underline">
          Privacy Policy
        </Link>
        .
      </>
    ),
  },
  {
    q: "What is RIASEC?",
    a: "A widely used model of career interests developed by psychologist John Holland. It sorts what people enjoy doing into six types — Realistic, Investigative, Artistic, Social, Enterprising and Conventional. Most people are a blend of two or three.",
  },
  {
    q: "Who takes the test — me or my child?",
    a: "Your child does. You register and receive the link, but the 36 questions are written for them to answer directly. Answers are most useful when they are your child's own, not what they think you want to hear.",
  },
  {
    q: "Is this a test my child can fail?",
    a: "No. There are no right answers and no score to beat. It measures what your child is drawn to, not how capable they are. Nothing here predicts marks or ranks students against each other.",
  },
  {
    q: "What does the paid report include, and what does the counsellor call cover?",
    a: "The Detailed Report adds Aptitude, Behavioral and Work Values tests, with top career matches and what every score means. The 1:1 Consultation is a 45-minute call with a counsellor to discuss your child's actual result and answer your questions.",
  },
];

export default function Home() {
  return (
    <>
      <main className="flex-1">
        {/* ------------------------------------------------------------ hero
            Full-bleed dark field. The chart panel below overlaps its lower
            edge, so the page opens on two planes rather than one flat colour. */}
        <section className="grain relative overflow-hidden bg-ink-deep pb-40 text-white sm:pb-52">
          <div className="relative z-10">
            <div className="mx-auto w-full max-w-6xl px-6">
              <div className="flex items-center justify-between gap-4 py-6">
                <Wordmark onDark />
                <ButtonLink href="/register" variant="accentOnDark" size="md">
                  Start free test
                </ButtonLink>
              </div>
            </div>

            <div className="mx-auto w-full max-w-6xl px-6 pt-8 sm:pt-24">
              <SpectrumRule className="w-28" />
              <p className="mt-6 text-note font-medium uppercase tracking-wide text-on-dark/70 sm:mt-9">
                Free career test for Class 8 to 12
              </p>
              <h1 className="mt-4 max-w-4xl text-hero font-semibold text-white">
                What career will suit your child?
              </h1>
              <p className="mt-5 max-w-xl text-lead text-on-dark sm:mt-8">
                Your child answers {TOTAL_QUESTIONS} quick questions on a
                phone. You get a simple report on what they like most, well
                before stream and subject choices.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:mt-11 sm:flex-row sm:items-center">
                <ButtonLink
                  href="/register"
                  variant="accentOnDark"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Start free test
                </ButtonLink>
                <ButtonLink
                  href="#sample"
                  variant="quietOnDark"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  See a sample report
                </ButtonLink>
              </div>

              <p className="mt-6 hidden text-note text-on-dark/70 sm:mt-9 sm:block">
                Free · 5 minutes · Works on any phone · No pass or fail
              </p>
              <p className="hidden text-note text-on-dark/50 sm:mt-2 sm:block">
                Built on Holland&apos;s RIASEC model, used by career
                counsellors worldwide.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------- sample, overlapping the hero */}
        <section
          id="sample"
          className="relative z-20 mx-auto -mt-28 w-full max-w-6xl scroll-mt-6 px-6 sm:-mt-36"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Card className="shadow-feature">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-h3 font-semibold text-text">
                  A sample snapshot
                </h2>
                <span className="rounded-full bg-surface-sunk px-3 py-1 text-note text-text-muted">
                  Example
                </span>
              </div>
              <RiasecRadarChart scores={SAMPLE_SCORES} className="mt-6" />
              <p className="mt-8 border-t border-hairline pt-6 text-body leading-relaxed text-text-secondary">
                <span className="font-medium text-text">
                  Strongest types: Artistic and Social.
                </span>{" "}
                This child is drawn to creating things and to working with
                people — expression and design on one side, teaching, helping
                and listening on the other.
              </p>
            </Card>

            <Card tone="feature" className="flex flex-col justify-between">
              <div>
                <h2 className="text-h2 font-semibold text-white">
                  In the detailed report
                </h2>
                <ul className="mt-8 space-y-5 text-body text-white">
                  {REPORT_TEASERS.map((item) => (
                    <li key={item} className="flex gap-4">
                      <span
                        aria-hidden="true"
                        className="mt-2 block size-1.5 shrink-0 rounded-full bg-accent-400"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div
                aria-hidden="true"
                className="mt-10 select-none space-y-3 blur-[3px]"
              >
                <div className="h-2.5 w-11/12 rounded-full bg-white/20" />
                <div className="h-2.5 w-9/12 rounded-full bg-white/15" />
                <div className="h-2.5 w-10/12 rounded-full bg-white/20" />
                <div className="h-2.5 w-7/12 rounded-full bg-white/15" />
              </div>

              <p className="mt-8 text-note text-on-dark/70">
                Unlocks after your child finishes the test.
              </p>
            </Card>
          </div>
        </section>

        {/* ------------------------------------------------------ six types */}
        <section className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
          <SectionHeading
            title="Six kinds of interest"
            intro="Holland's model sorts what people enjoy into six types. Most children are a blend of two or three — the test finds which."
          />
          <ul className="mt-14 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {TYPE_GLOSS.map(({ letter, name, gloss }) => (
              <li key={letter} className="flex gap-5">
                <span
                  aria-hidden="true"
                  className="font-display text-h1 font-semibold leading-none"
                  style={{
                    color: `var(--color-riasec-${letter.toLowerCase()})`,
                  }}
                >
                  {letter}
                </span>
                <span>
                  <span className="block text-h3 font-semibold text-text">
                    {name}
                  </span>
                  <span className="mt-1.5 block text-body text-text-secondary">
                    {gloss}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* --------------------------------------------------- how it works */}
        <section className="grain relative overflow-hidden bg-ink-band text-white">
          <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
            <h2 className="max-w-2xl text-h2 font-semibold text-white sm:text-display">
              Four steps, about 5 minutes
            </h2>
            <ol className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="border-t border-white/20 pt-6">
                  <span className="font-display text-h1 font-semibold text-accent-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-h3 font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-body text-on-dark/80">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------ faq */}
        <section className="mx-auto w-full max-w-3xl px-6 py-24 sm:py-32">
          <SectionHeading title="Questions parents ask" />
          <div className="mt-12 divide-y divide-hairline border-y border-hairline">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group">
                <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-6 text-left text-h3 font-medium text-text">
                  {faq.q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-lead leading-none text-accent-600 transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pb-7 text-body leading-relaxed text-text-secondary">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------------- closing cta */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-28">
          <Card tone="feature" className="text-center sm:py-16">
            <SpectrumLetters className="justify-center" size="text-h1" />
            <h2 className="mx-auto mt-9 max-w-xl text-h2 font-semibold text-white sm:text-display">
              Start with what your child enjoys.
            </h2>
            <p className="mx-auto mt-6 max-w-md text-lead text-on-dark">
              The snapshot is free, and it takes about 5 minutes of your
              child&apos;s time.
            </p>
            <ButtonLink
              href="/register"
              variant="accentOnDark"
              size="lg"
              className="mt-10 w-full sm:w-auto"
            >
              Start free test
            </ButtonLink>
          </Card>
        </section>
      </main>

      <StickyStartTestBar />
      <SiteFooter />
    </>
  );
}
