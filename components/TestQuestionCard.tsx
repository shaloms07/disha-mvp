"use client";

import { cn } from "@/lib/cn";
import type { Question } from "@/types";

/** 1-5 Likert scale. The full wording is what screen readers announce. */
export const LIKERT_SCALE = [
  { value: 1, label: "Strongly dislike" },
  { value: 2, label: "Dislike" },
  { value: 3, label: "Not sure" },
  { value: 4, label: "Like" },
  { value: 5, label: "Strongly like" },
] as const;

/**
 * One question with its 1-5 scale.
 *
 * Real radio inputs inside a fieldset, so arrow keys move between options and
 * the question is announced with each one. The visible pills are labels over
 * visually-hidden inputs.
 */
export function TestQuestionCard({
  question,
  number,
  value,
  onChange,
  highlightUnanswered,
}: {
  question: Question;
  number: number;
  value?: number;
  onChange: (value: number) => void;
  highlightUnanswered?: boolean;
}) {
  const unanswered = value === undefined;
  const flagged = unanswered && highlightUnanswered;

  return (
    <fieldset
      id={`question-${question.id}`}
      className={cn(
        "scroll-mt-28 border-b py-7 first:pt-0",
        flagged ? "border-err-700" : "border-hairline",
      )}
    >
      <legend className="sr-only">
        Question {number}: How much would you enjoy this? {question.text}
      </legend>

      <p aria-hidden="true" className="flex gap-4 text-lead text-text">
        <span className="mt-0.5 shrink-0 font-mono text-note text-text-muted">
          {String(number).padStart(2, "0")}
        </span>
        <span>{question.text}</span>
      </p>

      <div className="mt-5 grid grid-cols-5 gap-2 sm:gap-2.5">
        {LIKERT_SCALE.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-center rounded-lg border font-medium transition-colors",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-700",
                selected
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-control-line bg-surface text-text-secondary hover:border-brand-700 hover:text-text",
              )}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                aria-label={`${option.value} — ${option.label}`}
                className="sr-only"
              />
              <span aria-hidden="true">{option.value}</span>
            </label>
          );
        })}
      </div>

      <div
        aria-hidden="true"
        className="mt-2.5 flex justify-between text-note text-text-muted"
      >
        <span>Dislike</span>
        <span>Not sure</span>
        <span>Like</span>
      </div>

      {flagged && (
        <p role="alert" className="mt-3 text-note text-err-700">
          Please answer this one to continue.
        </p>
      )}
    </fieldset>
  );
}
