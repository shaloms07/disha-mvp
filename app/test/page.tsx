"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { TestQuestionCard } from "@/components/TestQuestionCard";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useSession } from "@/lib/context/SessionContext";
import {
  hasDeepDive,
  isSchoolSession,
  modulesForSession,
  responsesFor,
  type ModuleItem,
  type TestModule,
} from "@/lib/testModules";
import type { SessionState } from "@/types";

/** Matches the card-exit animation in globals.css */
const EXIT_MS = 420;
/** Beat after the final answer so the selection registers before scoring */
const FINAL_BEAT_MS = 260;
const SCORING_PAUSE_MS = 800;

/**
 * One question in the flattened run.
 *
 * A non-school session has a single module, so `steps` is just the 36 interest
 * questions and everything below behaves exactly as it did before the school
 * modules existed. A school session strings all four modules together into one
 * continuous sequence, with a hand-off screen at each boundary.
 */
interface Step {
  module: TestModule;
  moduleIndex: number;
  item: ModuleItem;
  indexInModule: number;
}

function buildSteps(modules: TestModule[]): Step[] {
  return modules.flatMap((module, moduleIndex) =>
    module.items.map((item, indexInModule) => ({
      module,
      moduleIndex,
      item,
      indexInModule,
    })),
  );
}

/** Resume on the first unanswered question, so a refresh lands correctly. */
function firstUnansweredIndex(steps: Step[], session: SessionState) {
  const i = steps.findIndex(
    (step) => responsesFor(session, step.module)[step.item.id] === undefined,
  );
  return i === -1 ? steps.length - 1 : i;
}

export default function TestPage() {
  const router = useRouter();
  const { session, hydrated, setModuleResponse, setModuleScores, markCompleted } =
    useSession();

  const modules = useMemo(
    () => modulesForSession({ schoolId: session.schoolId, orderId: session.orderId }),
    [session.schoolId, session.orderId],
  );
  const steps = useMemo(() => buildSteps(modules), [modules]);
  const totalQuestions = steps.length;
  const multiModule = modules.length > 1;

  const [index, setIndex] = useState(0);
  const [resumed, setResumed] = useState(false);
  const [scoring, setScoring] = useState(false);
  /** Set when a module has just finished, so the next one gets a hand-off screen */
  const [handingOver, setHandingOver] = useState(false);
  /** The just-answered card, animating out over the deck */
  const [leaving, setLeaving] = useState<{
    step: Step;
    value: number;
  } | null>(null);

  const topCard = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Once storage is read, jump to wherever the child left off.
  if (hydrated && !resumed) {
    setResumed(true);
    const target = firstUnansweredIndex(steps, session);
    if (target !== 0) setIndex(target);
  }

  // Focus follows the deck, so keyboard users aren't stranded when a card goes.
  useEffect(() => {
    topCard.current?.focus();
  }, [index, handingOver]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function later(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms));
  }

  const step = steps[index];
  const currentModule = step.module;

  /** Progress counts every module the session is running, not just this one. */
  const answeredTotal = modules.reduce(
    (sum, module) => sum + module.answeredCount(responsesFor(session, module)),
    0,
  );

  /**
   * Takes the responses explicitly: the final answer is set in the same tick
   * this runs from, so the `session` captured by the closure is one answer
   * behind and would score the last question as unanswered.
   */
  function finish(module: TestModule, responses: Record<number, number>) {
    setScoring(true);
    const scores = module.score(responses);
    // A purchased (non-school) session finishing here just finished the paid
    // Deep-Dive modules, not the free RIASEC-only run — the snapshot at
    // /results was already shown before checkout, so this goes straight to
    // the full report instead.
    const destination =
      !isSchoolSession(session) && hasDeepDive(session)
        ? "/report-preview"
        : "/results";
    later(() => {
      setModuleScores(module.scoresKey, scores);
      markCompleted();
      router.push(destination);
    }, SCORING_PAUSE_MS);
  }

  function handleSelect(value: number) {
    if (leaving || scoring || handingOver || !step) return;

    const answering = step.module;
    const nextResponses = {
      ...responsesFor(session, answering),
      [step.item.id]: value,
    };
    setModuleResponse(answering.responsesKey, step.item.id, value);

    const isLastOverall = index === totalQuestions - 1;
    if (isLastOverall) {
      // Let the choice land visibly, then score.
      later(() => finish(answering, nextResponses), FINAL_BEAT_MS);
      return;
    }

    const isLastInModule = step.indexInModule === answering.items.length - 1;
    if (isLastInModule) {
      // Bank this module's scores before moving on, so a refresh part-way
      // through module three doesn't lose modules one and two.
      later(() => {
        setModuleScores(answering.scoresKey, answering.score(nextResponses));
        setIndex(index + 1);
        setHandingOver(true);
      }, FINAL_BEAT_MS);
      return;
    }

    // The answered card peels off while the deck slides forward underneath.
    setLeaving({ step, value });
    setIndex(index + 1);
    later(() => setLeaving(null), EXIT_MS);
  }

  if (!hydrated) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
          <div aria-hidden="true" className="animate-pulse space-y-6">
            <div className="h-3 w-44 rounded-full bg-surface-sunk" />
            <div className="h-1 w-full rounded-full bg-surface-sunk" />
            <div className="h-96 rounded-2xl bg-surface-sunk" />
          </div>
          <p className="sr-only">Loading the test.</p>
        </main>
      </>
    );
  }

  if (scoring) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <span
            aria-hidden="true"
            className="size-7 animate-spin rounded-full border-2 border-brand-700 border-t-transparent"
          />
          <p aria-live="polite" className="mt-7 text-h3 font-semibold text-text">
            Scoring {session.childName || "your child"}&apos;s answers
          </p>
          <p className="mt-2 text-body text-text-secondary">
            {multiModule
              ? "Putting all four modules together."
              : "Working out the six interest scores."}
          </p>
        </main>
      </>
    );
  }

  // Between modules on a school session: name what is coming next rather than
  // switching the wording and the answer scale under the student mid-deck.
  if (handingOver && step) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-24">
          <p className="font-mono text-note text-text-muted">
            Part {step.moduleIndex + 1} of {modules.length}
          </p>
          <h1 className="mt-4 text-h1 font-semibold text-text">
            {currentModule.label}
          </h1>
          <p className="mt-4 text-lead text-text-secondary">
            {currentModule.intro}
          </p>
          <Button
            variant="accent"
            size="lg"
            className="mt-9 w-full"
            onClick={() => setHandingOver(false)}
          >
            Start {currentModule.label.toLowerCase()}
          </Button>
          <p className="mt-6 text-note text-text-muted">
            {answeredTotal} of {totalQuestions} questions answered so far.
          </p>
        </main>
      </>
    );
  }

  // The live card plus the two peeking behind it. Cards are only previewed
  // within the current module, so the deck never shows another module's items.
  const deck = [0, 1, 2]
    .map((offset) => ({ offset, step: steps[index + offset] }))
    .filter(
      (entry) =>
        entry.step !== undefined &&
        entry.step.moduleIndex === step.moduleIndex,
    );

  const moduleResponses = responsesFor(session, currentModule);
  const moduleTotal = currentModule.items.length;

  return (
    <>
      <SiteHeader />

      <div className="sticky top-0 z-10 border-b border-hairline bg-bone/95 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-xl px-6 py-4">
          <div className="flex items-baseline justify-between text-note">
            <span className="text-text">
              {multiModule && (
                <span className="text-text-muted">
                  {currentModule.label} &middot;{" "}
                </span>
              )}
              Question {index + 1} of {totalQuestions}
            </span>
            <span className="text-text-muted">{answeredTotal} answered</span>
          </div>
          <ProgressBar
            value={answeredTotal}
            max={totalQuestions}
            label={`${answeredTotal} of ${totalQuestions} questions answered`}
            className="mt-3"
          />
        </div>
      </div>

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
        <h1 className="text-h3 font-semibold text-text">
          {currentModule.heading}
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          {currentModule.subhead}
        </p>

        {/* The deck. Cards are absolutely positioned, so the wrapper holds the
            height and nothing jumps as they move. */}
        <div className="relative mt-8 min-h-[30rem] sm:min-h-[32rem]">
          {/* Deepest first, so the live card paints last. */}
          {[...deck].reverse().map(({ offset, step: s }) => (
            <TestQuestionCard
              key={s!.item.id}
              ref={offset === 0 ? topCard : undefined}
              question={s!.item}
              number={s!.indexInModule + 1}
              total={moduleTotal}
              depth={offset}
              scale={currentModule.scale}
              prompt={currentModule.heading}
              value={moduleResponses[s!.item.id]}
              onSelect={offset === 0 ? handleSelect : undefined}
            />
          ))}

          {leaving && (
            <TestQuestionCard
              key={`leaving-${leaving.step.item.id}`}
              question={leaving.step.item}
              number={leaving.step.indexInModule + 1}
              total={leaving.step.module.items.length}
              depth={0}
              scale={leaving.step.module.scale}
              prompt={leaving.step.module.heading}
              value={leaving.value}
              exiting
            />
          )}
        </div>

        <p aria-live="polite" className="sr-only">
          Question {index + 1} of {totalQuestions}.
        </p>

        <div className="mt-8 flex items-center justify-between gap-4">
          <Button
            variant="quiet"
            onClick={() => setIndex(Math.max(0, index - 1))}
            aria-disabled={index === 0}
            className={index === 0 ? "invisible" : undefined}
          >
            Back
          </Button>
          <p className="text-note text-text-muted">Answers save as you go.</p>
        </div>
      </main>
    </>
  );
}
