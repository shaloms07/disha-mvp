import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TIER_OPTIONS, formatInr, priceAfterCredit } from "@/lib/pricing";

/**
 * The ₹99 career list - a fallback for families who didn't take the main
 * offer, never shown beside it. It appears only when /results is opened with
 * ?offer=list (the link in the follow-up message), so the ₹999 plan doesn't
 * look expensive next to it on a first visit. Whatever's paid here is
 * credited in full towards the Complete Career Report later.
 *
 * `variant="entry"` (SNAPSHOT_V2): the entry tier shown right under the
 * ₹999 card on the paywall - a quieter card and a secondary button, so ₹999
 * still reads as the main plan. The ₹900 upgrade is enforced server-side
 * (server/routes/checkout.ts, scripts/pricing-check.ts).
 */
export function FallbackOffer({
  childName,
  busy,
  disabled,
  onSelect,
  variant = "fallback",
}: {
  childName?: string;
  busy: boolean;
  disabled: boolean;
  onSelect: () => void;
  variant?: "fallback" | "entry";
}) {
  const possessive = childName ? `${childName}'s` : "the";
  const option = TIER_OPTIONS.find((t) => t.level === 1)!;
  const price = priceAfterCredit(1, 0);
  const upgradeLater = priceAfterCredit(3, price);
  const entry = variant === "entry";

  return (
    <section id="career-list" className={`${entry ? "mt-4" : "mt-10"} scroll-mt-6`}>
      <div
        className={
          entry
            ? "rounded-xl border border-hairline bg-surface p-5 sm:p-6"
            : "rounded-xl border-2 border-accent-600 bg-surface p-5 shadow-feature sm:p-6"
        }
      >
        <p className="text-note font-medium text-accent-700">{entry ? "Or start smaller" : "Not ready for the full plan?"}</p>
        <h2 className={`mt-2 ${entry ? "text-h3" : "text-h2"} font-semibold text-text`}>
          {entry ? `See ${possessive} ranked career list` : `Just ${possessive} career list`}
        </h2>
        <p className="mt-1 font-display text-h1 font-semibold text-text">
          {formatInr(price)}
          <span className="ml-2 font-sans text-note font-normal text-text-muted">one-time</span>
        </p>
        <ul className="mt-4 space-y-1.5 text-body text-text">
          {option.includes.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-2 block size-1.5 shrink-0 rounded-full bg-accent-600" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-note text-text-secondary">
          Interest-based only, as a PDF. If you upgrade later, the {formatInr(price)} is credited in full — the
          Complete Career Report would then be {formatInr(upgradeLater)}.
        </p>
        <Button
          variant={entry ? "secondary" : "accent"}
          size="lg"
          className="mt-5 w-full sm:w-auto"
          loading={busy}
          loadingText="Opening checkout"
          disabled={disabled}
          onClick={onSelect}
        >
          Get the career list · {formatInr(price)}
        </Button>
        <p className="mt-4 text-note text-text-muted">
          UPI, card or netbanking · secured by Razorpay ·{" "}
          <Link href="/refund-policy" className="underline underline-offset-2 hover:text-text">
            Refund policy
          </Link>
        </p>
      </div>
    </section>
  );
}
