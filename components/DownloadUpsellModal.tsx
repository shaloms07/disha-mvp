"use client";

import { useEffect, useRef } from "react";
import { PersonalizedTeaser } from "@/components/PersonalizedTeaser";
import { Spinner } from "@/components/ui/Spinner";
import { formatInr, TIER_OPTIONS, type TierLevel } from "@/lib/pricing";
import type { RiasecType } from "@/types";

/** Deep-Dive ladder only - whoever sees this modal just paid for (or already
 *  owns) the Download Report tier, so re-offering that same tier here would
 *  be redundant. */
const DEEP_DIVE_TIER_OPTIONS = TIER_OPTIONS.filter((option) => option.level >= 2);

/**
 * Shown the moment the free snapshot's PDF download fires (app/results/page.tsx)
 * - the one deliberate action a parent takes on this whole page, so it's a
 * better moment to show the upsell than a passive scroll-past. The download
 * itself is never gated behind this - it starts first, this is layered on top.
 * Deliberately more compact than the inline upsell section further down the
 * page (that one keeps the full UpsellTierCard treatment); this is the quick,
 * one-glance version.
 */
export function DownloadUpsellModal({
  scores,
  childName,
  onSelectTier,
  submittingTier,
  selectedTier,
  onClose,
}: {
  scores: Record<RiasecType, number>;
  childName?: string;
  onSelectTier: (level: Exclude<TierLevel, 0>) => void;
  submittingTier: TierLevel | null;
  selectedTier: TierLevel | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="download-upsell-title"
      className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-hairline bg-surface p-0 text-text shadow-feature backdrop:bg-ink-deep/55"
    >
      <div className="px-6 py-7 sm:px-8 sm:py-8">
        <h2 id="download-upsell-title" className="text-h2 font-semibold text-text">
          Your snapshot is downloading
        </h2>
        <p className="mt-2 text-body text-text-secondary">
          While that saves, here&apos;s a peek at what the full report adds.
        </p>

        <div className="mt-6">
          <PersonalizedTeaser scores={scores} childName={childName} />
        </div>

        <div className="mt-6 space-y-3">
          {DEEP_DIVE_TIER_OPTIONS.map((option) => (
            <button
              key={option.level}
              type="button"
              disabled={Boolean(selectedTier) || submittingTier === option.level}
              onClick={() => onSelectTier(option.level)}
              className="flex w-full items-center justify-between rounded-lg border border-control-line bg-surface px-4 py-3 text-left transition-colors hover:border-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>
                <span className="block text-body font-medium text-text">
                  {option.name}
                  {option.recommended && (
                    <span className="ml-2 rounded-full bg-accent-600 px-2 py-0.5 text-note font-medium text-white">
                      Best value
                    </span>
                  )}
                </span>
                <span className="block text-note text-text-muted">{formatInr(option.total)}</span>
              </span>
              {submittingTier === option.level ? (
                <Spinner />
              ) : (
                <span aria-hidden="true" className="text-lead text-brand-700">
                  →
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="mt-6 w-full text-center text-note text-text-muted underline-offset-2 hover:underline"
        >
          Maybe later
        </button>
      </div>
    </dialog>
  );
}
