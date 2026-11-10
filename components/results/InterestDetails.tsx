"use client";

import { useState } from "react";
import { RIASEC_COLORS } from "@/components/RiasecRadarChart";
import { TYPE_SUMMARIES } from "@/lib/interpretation";
import { rankInterestTypes, scoreToPercent, topInterestGroups } from "@/lib/scoring";
import type { RiasecType } from "@/types";

/**
 * The interest types in words: the top three in full, the rest behind a
 * "See all 6 interests" toggle, so the careers and next step aren't pushed
 * far down the page. A tie at third place pulls every tied type into the
 * visible set (lib/scoring.ts's topInterestGroups) rather than hiding one of
 * them arbitrarily. Scores show as a percent of each type's own max - the
 * six maxima differ, so raw tallies aren't comparable across types.
 */
export function InterestDetails({ scores }: { scores: Record<RiasecType, number> }) {
  const [showAll, setShowAll] = useState(false);
  const ranked = rankInterestTypes(scores);
  const topCount = topInterestGroups(scores, 3).flat().length;
  const visible = showAll ? ranked : ranked.slice(0, topCount);
  const hiddenCount = ranked.length - topCount;

  return (
    <>
      <div className="mt-9 space-y-10">
        {visible.map((type) => {
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
                  {scoreToPercent(scores[type], type)}%
                </span>
              </div>

              <p className="mt-4 text-lead font-medium text-text">{summary.headline}</p>
              <p className="mt-3 text-body leading-relaxed text-text-secondary">{summary.blurb}</p>
              <p className="mt-4 text-note text-text-muted">Shows up as: {summary.examples}</p>
            </article>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((open) => !open)}
          aria-expanded={showAll}
          className="mt-8 min-h-11 text-body font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
        >
          {showAll ? "Show the top interests only" : `See all 6 interests`}
        </button>
      )}
    </>
  );
}
