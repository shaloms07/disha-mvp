"use client";

import { cn } from "@/lib/cn";
import { formatInr, type TierOption } from "@/lib/pricing";

/**
 * One rung of the pricing ladder, rendered as a radio because the tiers are
 * cumulative — you pick a level, you don't tick a basket.
 *
 * The recommended tier is the single bold moment on the screen: dark petrol,
 * deeply raised, more internal air, an accent badge and a larger price.
 * Everything else is a quiet hairline card that stays out of its way.
 */
export function PricingTierCard({
  option,
  selected,
  onSelect,
  isFirst,
}: {
  option: TierOption;
  selected: boolean;
  onSelect: () => void;
  isFirst: boolean;
}) {
  const feature = Boolean(option.recommended);

  return (
    <label
      className={cn(
        "relative block cursor-pointer transition-shadow",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-700",
        feature
          ? "rounded-2xl bg-brand-800 p-7 text-white shadow-feature sm:p-9"
          : "rounded-xl border bg-surface p-6 shadow-card " +
              (selected
                ? "border-brand-700 ring-1 ring-brand-700"
                : "border-hairline hover:border-control-line"),
      )}
    >
      {feature && (
        <span className="absolute -top-3 left-7 rounded-full bg-accent-600 px-3.5 py-1 text-note font-medium text-white">
          Most parents choose this
        </span>
      )}

      <div className="flex items-start gap-4">
        <input
          type="radio"
          name="tier"
          checked={selected}
          onChange={onSelect}
          // Without this the accessible name would be the card's entire text.
          aria-label={`${option.name}, ${formatInr(option.total)} total`}
          className={cn(
            "mt-1.5 size-5 shrink-0",
            feature ? "accent-accent-600" : "accent-brand-700",
          )}
        />

        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "font-display font-semibold",
              feature ? "text-h2 text-white" : "text-h3 text-text",
            )}
          >
            {option.name}
          </h3>

          <p className="mt-2 flex flex-wrap items-baseline gap-x-3">
            <span
              className={cn(
                "font-mono tabular-nums",
                feature ? "text-h1 text-white" : "text-h3 text-text",
              )}
            >
              {formatInr(option.total)}
            </span>
            {!isFirst && (
              <span
                className={cn(
                  "text-note",
                  feature ? "text-brand-100" : "text-text-muted",
                )}
              >
                {formatInr(option.increment)} more than the tier above
              </span>
            )}
          </p>

          <p
            className={cn(
              "mt-4 text-body",
              feature ? "text-brand-100" : "text-text-secondary",
            )}
          >
            {option.summary}
          </p>

          <ul
            className={cn(
              "mt-6 space-y-3",
              feature ? "text-body text-white" : "text-body text-text",
            )}
          >
            {option.includes.map((item) => (
              <li key={item} className="flex gap-3.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-2 block size-1 shrink-0 rounded-full",
                    feature ? "bg-accent-600" : "bg-brand-700",
                  )}
                />
                {item}
              </li>
            ))}
          </ul>

          {option.note && (
            <p
              className={cn(
                "mt-6 border-l-2 pl-4 text-note",
                feature
                  ? "border-white/20 text-brand-100/80"
                  : "border-hairline text-text-muted",
              )}
            >
              {option.note}
            </p>
          )}
        </div>
      </div>
    </label>
  );
}
