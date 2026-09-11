"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { TestQuestionCard } from "@/components/TestQuestionCard";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useSession } from "@/lib/context/SessionContext";
import {
  QUESTIONS,
  TOTAL_QUESTIONS,
  getAnsweredCount,
  scoreResponses,
} from "@/lib/scoring";
import type { Question } from "@/types";

/** Matches the card-exit animation in globals.css */
const EXIT_MS = 420;
/** Beat after the final answer so the selection registers before scoring */
const FINAL_BEAT_MS = 260;
const SCORING_PAUSE_MS = 800;

/** Resume on the first unanswered question, so a refresh lands correctly. */
function firstUnansweredIndex(responses: Record<number, number>) {
  const i = QUESTIONS.findIndex((q) => responses[q.id] === undefined);
  return i === -1 ? TOTAL_QUESTIONS - 1 : i;
}

export default function TestPage() {
  const router = useRouter();
  const { session, hydrated, setResponse, setScores } = useSession();

  const [index, setIndex] = useState(0);
  const [resumed, setResumed] = useState(false);
  const [scoring, setScoring] = useState(false);
  /** The just-answered card, animating out over the deck */
  const [leaving, setLeaving] = useState<{
    question: Question;
    number: number;
    value: number;
  } | null>(null);

  const topCard = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Once storage is read, jump to wherever the child left off.
  if (hydrated && !resumed) {
    setResumed(true);
    const target = firstUnansweredIndex(session.responses);
    if (target !== 0) setIndex(target);
  }

  // Focus follows the deck, so keyboard users aren't stranded when a card goes.
  useEffect(() => {
    topCard.current?.focus();
  }, [index]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function later(fn: () => void, ms: number) {
    timers.current.push(setTimeout(fn, ms));
  }

  const answeredTotal = getAnsweredCount(session.responses);
  const question = QUESTIONS[index];

  /**
   * Takes the responses explicitly: the final answer is set in the same tick
   * this runs from, so the `session` captured by the closure is one answer
   * behind and would score the last question as unanswered.
   */
  function finish(responses: Record<number, number>) {
    setScoring(true);
    const scores = scoreResponses(responses);
    later(() => {
      setScores(scores);
      router.push("/results");
    }, SCORING_PAUSE_MS);
  }

  function handleSelect(value: number) {
    if (leaving || scoring || !question) return;

    const nextResponses = { ...session.responses, [question.id]: value };
    setResponse(question.id, value);

    const isLast = index === TOTAL_QUESTIONS - 1;
    if (isLast) {
      // Let the choice land visibly, then score.
      later(() => finish(nextResponses), FINAL_BEAT_MS);
      return;
    }

    // The answered card peels off while the deck slides forward underneath.
    setLeaving({ question, number: index + 1, value });
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
            Working out the six interest scores.
          </p>
        </main>
      </>
    );
  }

  // The live card plus the two peeking behind it.
  const deck = [0, 1, 2]
    .map((offset) => ({ offset, question: QUESTIONS[index + offset] }))
    .filter((entry) => entry.question !== undefined);

  return (
    <>
      <SiteHeader />

      <div className="sticky top-0 z-10 border-b border-hairline bg-bone/95 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-xl px-6 py-4">
          <div className="flex items-baseline justify-between text-note">
            <span className="text-text">
              Question {index + 1} of {TOTAL_QUESTIONS}
            </span>
            <span className="text-text-muted">{answeredTotal} answered</span>
          </div>
          <ProgressBar
            value={answeredTotal}
            max={TOTAL_QUESTIONS}
            label={`${answeredTotal} of ${TOTAL_QUESTIONS} questions answered`}
            className="mt-3"
          />
        </div>
      </div>

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
        <h1 className="text-h3 font-semibold text-text">
          How much would you enjoy doing this?
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          There are no right answers. Pick one and the next card comes up.
        </p>

        {/* The deck. Cards are absolutely positioned, so the wrapper holds the
            height and nothing jumps as they move. */}
        <div className="relative mt-8 min-h-[30rem] sm:min-h-[32rem]">
          {/* Deepest first, so the live card paints last. */}
          {[...deck].reverse().map(({ offset, question: q }) => (
            <TestQuestionCard
              key={q!.id}
              ref={offset === 0 ? topCard : undefined}
              question={q!}
              number={index + offset + 1}
              total={TOTAL_QUESTIONS}
              depth={offset}
              value={session.responses[q!.id]}
              onSelect={offset === 0 ? handleSelect : undefined}
            />
          ))}

          {leaving && (
            <TestQuestionCard
              key={`leaving-${leaving.question.id}`}
              question={leaving.question}
              number={leaving.number}
              total={TOTAL_QUESTIONS}
              depth={0}
              value={leaving.value}
              exiting
            />
          )}
        </div>

        <p aria-live="polite" className="sr-only">
          Question {index + 1} of {TOTAL_QUESTIONS}.
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
          <p className="text-note text-text-muted">
            Answers save as you go.
          </p>
        </div>
      </main>
    </>
  );
}
