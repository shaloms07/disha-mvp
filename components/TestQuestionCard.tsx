"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { LIKERT_SCALE } from "@/lib/likert";
import { CHOICE_A, CHOICE_B } from "@/lib/scoring";
import type { ModuleItem } from "@/lib/testModules";
import type { ScaleOption } from "@/lib/traitScoring";

export { LIKERT_SCALE };

/** Where each card sits in the deck. 0 is the live one, 1 and 2 peek behind. */
const DEPTH_STYLE = [
  "z-30 translate-x-0 scale-100 opacity-100 shadow-feature",
  "z-20 translate-x-7 scale-[95.5%] opacity-55 shadow-card",
  "z-10 translate-x-13 scale-[91%] opacity-25 shadow-card",
];

interface Props {
  /** A scale item (rated statement) or a forced-choice pair */
  question: ModuleItem;
  number: number;
  total: number;
  value?: number;
  /** Depth 0 is interactive; deeper cards are a visual preview only */
  depth: number;
  onSelect?: (value: number) => void;
  /** Renders the card mid-exit, on top of the deck */
  exiting?: boolean;
  /** Defaults to the interest test's scale; the pilot modules pass their own */
  scale?: readonly ScaleOption[];
  /** The question put to the student, used in the screen-reader legend */
  prompt?: string;
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
    {
      question,
      number,
      total,
      value,
      depth,
      onSelect,
      exiting = false,
      scale = LIKERT_SCALE,
      prompt = "how much would you enjoy this?",
    },
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

        {question.kind === "scale" ? (
          <p className="mt-5 min-h-20 text-h3 leading-snug text-text sm:min-h-24 sm:text-h2">
            {question.text}
          </p>
        ) : question.kind === "multiOption" ? (
          <p className="mt-5 min-h-20 text-h3 leading-snug text-text sm:min-h-24 sm:text-h2">
            {question.prompt}
          </p>
        ) : (
          <p className="mt-5 text-note text-text-muted">
            Which one appeals more?
          </p>
        )}

        {depth === 0 ? (
          <fieldset className="mt-7" disabled={!interactive}>
            <legend className="sr-only">
              Question {number} of {total}: {prompt}{" "}
              {question.kind === "scale"
                ? question.text
                : question.kind === "multiOption"
                  ? `${question.prompt} Options: ${question.options.join(", ")}`
                  : `${question.optionA.text}, or ${question.optionB.text}`}
            </legend>

            {question.kind === "multiOption" ? (
              <div className="space-y-2.5">
                {question.options.map((optionText, i) => {
                  const selected = value === i;
                  return (
                    <label
                      key={i}
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
                        value={i}
                        checked={selected}
                        onChange={() => onSelect?.(i)}
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
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-body">{optionText}</span>
                    </label>
                  );
                })}
              </div>
            ) : question.kind === "scale" ? (
              <div className="space-y-2.5">
                {scale.map((option) => {
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
            ) : (
              <div className="space-y-3">
                {(
                  [
                    [CHOICE_A, question.optionA],
                    [CHOICE_B, question.optionB],
                  ] as const
                ).map(([choiceValue, option]) => {
                  const selected = value === choiceValue;
                  return (
                    <label
                      key={choiceValue}
                      className={cn(
                        "flex min-h-20 cursor-pointer items-center rounded-xl border px-5 text-center transition-colors",
                        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-700",
                        selected
                          ? "border-brand-700 bg-brand-700 text-white"
                          : "border-control-line bg-surface text-text hover:border-brand-700 hover:bg-brand-50",
                      )}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={choiceValue}
                        checked={selected}
                        onChange={() => onSelect?.(choiceValue)}
                        className="sr-only"
                      />
                      <span className="w-full text-body font-medium leading-snug">
                        {option.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        ) : (
          // Preview only — spacer keeps the peeking cards the same shape.
          <div aria-hidden="true" className="mt-7 space-y-2.5">
            {(question.kind === "scale"
              ? scale
              : question.kind === "multiOption"
                ? question.options
                : [0, 1]
            ).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border border-hairline",
                  question.kind === "forcedChoice" ? "min-h-20" : "min-h-13",
                )}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);
