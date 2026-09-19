"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { RadialMeter } from "@/components/RadialMeter";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import {
  APTITUDE_MCQ_MAX_SCORE,
  rankAptitudeMcqDomains,
} from "@/lib/deepAptitudeScoring";
import {
  DEEP_WORK_VALUES_MAX_SCORE,
  rankDeepWorkValues,
} from "@/lib/deepWorkValuesScoring";
import { rankSjtTraits, sjtScoreToPercent } from "@/lib/sjtScoring";
import {
  DEEP_APTITUDE_LABELS,
  DEEP_WORK_VALUE_LABELS,
  SJT_TRAIT_LABELS,
  type DeepAptitudeDomain,
  type DeepWorkValue,
  type SjtTrait,
} from "@/types";

/**
 * The three paid assessments, one at a time.
 *
 * Stacked, they were three-quarters of the report's remaining length and were
 * read as one long scroll. They are three separate tests with nothing to
 * compare across them, so showing all three at once buys nothing — a tab strip
 * keeps the section to the height of its tallest panel and makes the reader
 * choose what they want to look at.
 *
 * Standard ARIA tabs: roving tabindex, arrow keys move between tabs, Home and
 * End jump to the ends.
 */

type TabId = "aptitude" | "behavioral" | "values";

const TABS: { id: TabId; label: string }[] = [
  { id: "aptitude", label: "Aptitude" },
  { id: "behavioral", label: "Behavioral" },
  { id: "values", label: "Work values" },
];

/** A labelled bar on a sunk track — the shared mark for the two ranked panels */
function ScoreBar({
  label,
  value,
  percent,
}: {
  label: string;
  value: string;
  percent: number;
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-note text-text">{label}</span>
        <span className="font-mono text-note tabular-nums text-text-secondary">
          {value}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunk"
      >
        <div
          className="h-full rounded-full bg-brand-700"
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>
    </li>
  );
}

export function DeepDiveTabs({
  aptitudeScores,
  sjtScores,
  workValueScores,
  childName,
  attentionOk,
}: {
  aptitudeScores: Record<DeepAptitudeDomain, number>;
  sjtScores: Record<SjtTrait, number>;
  workValueScores: Record<DeepWorkValue, number>;
  childName?: string;
  /** False when the SJT attention-check item was missed */
  attentionOk?: boolean;
}) {
  const [active, setActive] = useState<TabId>("aptitude");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = TABS.findIndex((t) => t.id === active);
    let next = current;

    if (event.key === "ArrowRight") next = (current + 1) % TABS.length;
    else if (event.key === "ArrowLeft")
      next = (current - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;

    event.preventDefault();
    setActive(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  const who = childName || "your child";

  return (
    <Card flush className="overflow-hidden">
      <div
        role="tablist"
        aria-label="Deep-Dive Assessment sections"
        onKeyDown={onKeyDown}
        className="flex gap-1 border-b border-hairline px-2 pt-2 sm:px-3"
      >
        {TABS.map((tab, i) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`deepdive-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`deepdive-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={cn(
                "-mb-px min-h-11 rounded-t-lg border-b-2 px-3.5 text-body transition-colors sm:px-5",
                selected
                  ? "border-brand-700 font-semibold text-brand-800"
                  : "border-transparent text-text-secondary hover:bg-brand-50 hover:text-text",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* A floor on the panel so switching tabs doesn't jump the page. */}
      <div className="min-h-[19rem] px-5 py-6 sm:px-7 sm:py-7">
        {active === "aptitude" && (
          <div
            role="tabpanel"
            id="deepdive-panel-aptitude"
            aria-labelledby="deepdive-tab-aptitude"
            tabIndex={0}
            className="disha-fade-in outline-none"
          >
            <p className="text-note text-text-muted">
              Correct answers per domain — this one is marked, not self-rated.
            </p>
            {/* Rings, not slices: three separate scores against three
                different ceilings, which never add up to a whole. */}
            <div className="mt-7 flex flex-wrap justify-around gap-x-6 gap-y-7">
              {rankAptitudeMcqDomains(aptitudeScores).map((domain) => (
                <RadialMeter
                  key={domain}
                  value={aptitudeScores[domain]}
                  max={APTITUDE_MCQ_MAX_SCORE[domain]}
                  label={DEEP_APTITUDE_LABELS[domain]}
                  size={92}
                />
              ))}
            </div>
          </div>
        )}

        {active === "behavioral" && (
          <div
            role="tabpanel"
            id="deepdive-panel-behavioral"
            aria-labelledby="deepdive-tab-behavioral"
            tabIndex={0}
            className="disha-fade-in outline-none"
          >
            <p className="text-note text-text-muted">
              Drawn from how {who} said they&apos;d handle everyday situations.
            </p>
            <ul className="mt-6 space-y-4">
              {rankSjtTraits(sjtScores).map((trait) => (
                <ScoreBar
                  key={trait}
                  label={SJT_TRAIT_LABELS[trait]}
                  value={`${sjtScoreToPercent(sjtScores[trait], trait)}%`}
                  percent={sjtScoreToPercent(sjtScores[trait], trait)}
                />
              ))}
            </ul>
            {attentionOk === false && (
              <p className="mt-6 border-l-2 border-hairline pl-4 text-note text-text-muted">
                This section missed its attention-check question — read these
                results as a rough read rather than a firm one.
              </p>
            )}
          </div>
        )}

        {active === "values" && (
          <div
            role="tabpanel"
            id="deepdive-panel-values"
            aria-labelledby="deepdive-tab-values"
            tabIndex={0}
            className="disha-fade-in outline-none"
          >
            <p className="text-note text-text-muted">
              What {who} said matters most in a future job, strongest first.
            </p>
            <ul className="mt-6 space-y-4">
              {rankDeepWorkValues(workValueScores)
                .slice(0, 6)
                .map((value) => (
                  <ScoreBar
                    key={value}
                    label={DEEP_WORK_VALUE_LABELS[value]}
                    value={`${workValueScores[value]}/${DEEP_WORK_VALUES_MAX_SCORE}`}
                    percent={
                      (workValueScores[value] / DEEP_WORK_VALUES_MAX_SCORE) * 100
                    }
                  />
                ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
