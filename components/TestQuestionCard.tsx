"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import type { Question } from "@/types";

/** 1-5 Likert scale. With one question on screen the full wording fits. */
export const LIKERT_SCALE = [
  { value: 1, label: "Strongly dislike" },
  { value: 2, label: "Dislike" },
  { value: 3, label: "Not sure" },
  { value: 4, label: "Like" },
  { value: 5, label: "Strongly like" },
] as const;

/** Where each card sits in the deck. 0 is the live one, 1 and 2 peek behind. */
const DEPTH_STYLE = [
  "z-30 translate-x-0 scale-100 opacity-100 shadow-feature",
  "z-20 translate-x-7 scale-[95.5%] opacity-55 shadow-card",
  "z-10 translate-x-13 scale-[91%] opacity-25 shadow-card",
];

interface Props {
  question: Question;
  number: number;
  total: number;
  value?: number;
  /** Depth 0 is interactive; deeper cards are a visual preview only */
  depth: number;
  onSelect?: (value: number) => void;
  /** Renders the card mid-exit, on top of the deck */
  exiting?: boolean;
}

/**
 * One question as a card in a deck.
 *
 * Only the top card carries real inputs — the cards behind are decorative
 * previews, so there are no duplicate radio groups and nothing hidden can take
 * keyboard focus.
 */
export const TestQuestionCard = forwardRef<HTMLDivElement, Props>(
  function TestQuestionCard(
    { question, number, total, value, depth, onSelect, exiting = false },
    ref,
  ) {
    const interactive = depth === 0 && !exiting && Boolean(onSelect);

    return (
      <div
        ref={ref}
        tabIndex={interactive ? -1 : undefined}
        aria-hidden={interactive ? undefined : true}
        className={cn(
          "absolute inset-x-0 top-0 rounded-2xl border border-hairline bg-surface p-6 outline-none sm:p-8",
          exiting
            ? "disha-card-out z-40 shadow-feature"
            : cn("disha-card-stack", DEPTH_STYLE[depth] ?? DEPTH_STYLE[2]),
        )}
      >
        <p className="font-mono text-note text-text-muted">
          {String(number).padStart(2, "0")}
          <span className="text-text-muted/60"> / {total}</span>
        </p>

        <p className="mt-5 min-h-20 text-h3 leading-snug text-text sm:min-h-24 sm:text-h2">
          {question.text}
        </p>

        {depth === 0 ? (
          <fieldset className="mt-7" disabled={!interactive}>
            <legend className="sr-only">
              Question {number} of {total}: how much would you enjoy this?{" "}
              {question.text}
            </legend>

            <div className="space-y-2.5">
              {LIKERT_SCALE.map((option) => {
                const selected = value === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex min-h-13 cursor-pointer items-center gap-4 rounded-lg border px-4 transition-colors",
                      "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-700",
                      selected
                        ? "border-brand-700 bg-brand-700 text-white"
                        : "border-control-line bg-surface text-text hover:border-brand-700 hover:bg-brand-50",
                    )}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option.value}
                      checked={selected}
                      onChange={() => onSelect?.(option.value)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-note",
                        selected
                          ? "bg-white/20 text-white"
                          : "bg-surface-sunk text-text-secondary",
                      )}
                    >
                      {option.value}
                    </span>
                    <span className="text-body">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          // Preview only — spacer keeps the peeking cards the same shape.
          <div aria-hidden="true" className="mt-7 space-y-2.5">
            {LIKERT_SCALE.map((option) => (
              <div
                key={option.value}
                className="min-h-13 rounded-lg border border-hairline"
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);
