"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

const BATCH_SIZE = 10;
const TOTAL_PAGES = Math.ceil(TOTAL_QUESTIONS / BATCH_SIZE);

/** Short pause after the last answer so the jump to results isn't abrupt. */
const SCORING_PAUSE_MS = 800;

function batchFor(page: number) {
  return QUESTIONS.slice(page * BATCH_SIZE, (page + 1) * BATCH_SIZE);
}

/** Resume on the first page that still has a gap, so a refresh lands correctly. */
function firstIncompletePage(responses: Record<number, number>) {
  for (let page = 0; page < TOTAL_PAGES; page++) {
    if (batchFor(page).some((q) => responses[q.id] === undefined)) return page;
  }
  return TOTAL_PAGES - 1;
}

export default function TestPage() {
  const router = useRouter();
  const { session, hydrated, setResponse, setScores } = useSession();

  const [page, setPage] = useState(0);
  const [showGaps, setShowGaps] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [resumed, setResumed] = useState(false);

  // Once storage is read, jump to wherever the child left off.
  if (hydrated && !resumed) {
    setResumed(true);
    const target = firstIncompletePage(session.responses);
    if (target !== 0) setPage(target);
  }

  const batch = batchFor(page);
  const answeredInBatch = batch.filter(
    (q) => session.responses[q.id] !== undefined,
  ).length;
  const batchComplete = answeredInBatch === batch.length;
  const answeredTotal = getAnsweredCount(session.responses);
  const isLastPage = page === TOTAL_PAGES - 1;

  function goToPage(next: number) {
    setPage(next);
    setShowGaps(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNext() {
    if (!batchComplete) {
      // Point at the first gap rather than silently doing nothing.
      setShowGaps(true);
      const firstGap = batch.find((q) => session.responses[q.id] === undefined);
      if (firstGap) {
        document
          .getElementById(`question-${firstGap.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    if (!isLastPage) {
      goToPage(page + 1);
      return;
    }

    setScoring(true);
    const scores = scoreResponses(session.responses);
    setTimeout(() => {
      setScores(scores);
      router.push("/results");
    }, SCORING_PAUSE_MS);
  }

  if (!hydrated) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
          <div aria-hidden="true" className="animate-pulse space-y-6">
            <div className="h-3 w-44 rounded-full bg-surface-sunk" />
            <div className="h-1 w-full rounded-full bg-surface-sunk" />
            <div className="h-28 rounded-lg bg-surface-sunk" />
            <div className="h-28 rounded-lg bg-surface-sunk" />
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

  const firstInBatch = page * BATCH_SIZE + 1;
  const lastInBatch = Math.min((page + 1) * BATCH_SIZE, TOTAL_QUESTIONS);

  return (
    <>
      <SiteHeader />

      {/* Progress stays visible while scrolling through the batch */}
      <div className="sticky top-0 z-10 border-b border-hairline bg-bone/95 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-2xl px-6 py-4">
          <div className="flex items-baseline justify-between text-note">
            <span className="text-text">
              Questions {firstInBatch}–{lastInBatch} of {TOTAL_QUESTIONS}
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

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        {/* The heading stays on every page — each batch needs its own h1. */}
        <h1 className="text-h2 font-semibold text-text">
          How much would you enjoy doing each of these?
        </h1>
        {page === 0 && (
          <p className="mt-4 max-w-xl text-body text-text-secondary">
            There are no right answers — pick what is true for you, not what
            sounds impressive. 1 means you would strongly dislike it, 5 means
            you would strongly like it.
          </p>
        )}

        <div className="mt-10">
          {batch.map((question, i) => (
            <TestQuestionCard
              key={question.id}
              question={question}
              number={firstInBatch + i}
              value={session.responses[question.id]}
              onChange={(value) => setResponse(question.id, value)}
              highlightUnanswered={showGaps}
            />
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            variant={isLastPage ? "accent" : "primary"}
            size="lg"
            onClick={handleNext}
            aria-disabled={!batchComplete}
            className="w-full sm:w-auto sm:min-w-48"
          >
            {isLastPage ? "See results" : "Next 10 questions"}
          </Button>

          {page > 0 && (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => goToPage(page - 1)}
              className="w-full sm:w-auto"
            >
              Back
            </Button>
          )}
        </div>

        <p aria-live="polite" className="mt-5 text-center text-note text-text-muted">
          {batchComplete
            ? `Page ${page + 1} of ${TOTAL_PAGES} complete.`
            : `${answeredInBatch} of ${batch.length} answered on this page.`}
        </p>

        <p className="mt-10 text-center text-note text-text-muted">
          Answers save as you go — it is fine to stop and come back.
        </p>
      </main>
    </>
  );
}
