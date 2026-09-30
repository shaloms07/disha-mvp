"use client";

import { cn } from "@/lib/cn";
import { formatInr, type TierOption } from "@/lib/pricing";
import { Button } from "@/components/ui/Button";

/**
 * One column of the results page's upsell picker (app/results/page.tsx) -
 * lead-capture, not checkout: clicking "I'm interested" saves the pick
 * (POST /session/:token/interest) and shows a confirmation, it doesn't take
 * payment. Visually similar to components/PricingTierCard.tsx's ladder, but
 * laid out as three equal side-by-side columns rather than a stacked list
 * with one enlarged "recommended" card, since there's no cart/total context
 * to make one option read as the obvious default here.
 */
export function UpsellTierCard({
  option,
  onSelect,
  submitting,
  disabled,
}: {
  option: TierOption;
  onSelect: () => void;
  submitting: boolean;
  /** true once any tier has been picked - every card's button locks */
  disabled: boolean;
}) {
  const feature = Boolean(option.recommended);

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border p-6",
        feature ? "border-brand-700 bg-brand-800 text-white shadow-feature" : "border-hairline bg-surface shadow-card",
      )}
    >
      {feature && (
        <span className="mb-4 inline-block w-fit rounded-full bg-accent-600 px-3 py-1 text-note font-medium text-white">
          Most parents choose this
        </span>
      )}

      <h3 className={cn("font-display text-h3 font-semibold", feature ? "text-white" : "text-text")}>
        {option.name}
      </h3>

      <p className={cn("mt-3 font-mono text-h2 tabular-nums", feature ? "text-white" : "text-text")}>
        {formatInr(option.total)}
      </p>

      <p className={cn("mt-4 text-body", feature ? "text-brand-100" : "text-text-secondary")}>
        {option.summary}
      </p>

      <ul className={cn("mt-6 flex-1 space-y-3", feature ? "text-body text-white" : "text-body text-text")}>
        {option.includes.map((item) => (
          <li key={item} className="flex gap-3">
            <span
              aria-hidden="true"
              className={cn("mt-2 block size-1 shrink-0 rounded-full", feature ? "bg-accent-600" : "bg-brand-700")}
            />
            {item}
          </li>
        ))}
      </ul>

      <Button
        variant={feature ? "accentOnDark" : "secondary"}
        size="lg"
        className="mt-7 w-full"
        onClick={onSelect}
        loading={submitting}
        loadingText="Saving"
        disabled={disabled}
      >
        I&apos;m interested
      </Button>
    </div>
  );
}
