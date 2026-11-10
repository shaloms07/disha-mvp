import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { RESULTS_PAGE_LEVELS, TIER_OPTIONS, formatInr, priceAfterCredit, type TierLevel } from "@/lib/pricing";

type PaidLevel = Exclude<TierLevel, 0>;

/**
 * Upgrades for a family that has already bought a plan on /results - in
 * practice the counsellor call on top of the Complete Career Report (it's
 * where the counsellor_offer WhatsApp button lands). Before anything is
 * bought, the page sells through UnlockOffer.tsx instead. Prices are the
 * difference after full credit for what's been paid - exactly what
 * server/routes/checkout.ts charges.
 */
export function OfferCards({
  childName,
  ownedLevel,
  paidAmount,
  busyLevel,
  onSelect,
}: {
  childName?: string;
  ownedLevel: TierLevel;
  /** Rupees already paid - the credit taken off every upgrade */
  paidAmount: number;
  busyLevel: PaidLevel | null;
  onSelect: (level: PaidLevel) => void;
}) {
  const name = childName || "this student";
  const levels = RESULTS_PAGE_LEVELS.filter((level) => level > ownedLevel);
  if (levels.length === 0) return null;

  return (
    <section id="offer" className="mt-16 scroll-mt-6">
      <h2 className="text-h2 font-semibold text-text">Go further for {name}</h2>
      <p className="mt-3 text-body text-text-secondary">
        {formatInr(paidAmount)} already paid is credited in full.
      </p>

      <div className="mt-8 space-y-6">
        {levels.map((level, i) => {
          const option = TIER_OPTIONS.find((t) => t.level === level)!;
          const price = priceAfterCredit(level, paidAmount);
          return (
            <div
              key={level}
              className={cn(
                "relative rounded-xl bg-surface p-5 sm:p-6",
                i === 0 ? "border-2 border-accent-600 shadow-feature" : "border border-hairline",
              )}
            >
              <h3 className="text-h3 font-semibold text-text">{option.name}</h3>
              <p className="mt-1 font-display text-h2 font-semibold text-text">
                {formatInr(price)}
                <span className="ml-2 font-sans text-note font-normal text-text-muted">more</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-body text-text">
                {option.includes.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-2 block size-1.5 shrink-0 rounded-full bg-accent-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                variant={i === 0 ? "accent" : "secondary"}
                size="lg"
                className="mt-5 w-full"
                loading={busyLevel === level}
                loadingText="Opening checkout"
                disabled={busyLevel !== null}
                onClick={() => onSelect(level)}
              >
                Upgrade for {formatInr(price)}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-note text-text-muted">
        Pay by UPI (GPay, PhonePe, Paytm), card or netbanking · secured by Razorpay
      </p>
    </section>
  );
}
