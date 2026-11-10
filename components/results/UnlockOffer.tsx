"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { COMPARE_AT_PRICES, TIER_OPTIONS, formatInr, priceAfterCredit, type TierLevel } from "@/lib/pricing";

type PaidLevel = Exclude<TierLevel, 0>;

/**
 * The one offer on the results-ready page: the Complete Career Report as the
 * main card, with the counsellor call as an add-on line under it rather than
 * a competing card ("add a counsellor call for ₹1,000 more"). Upgrades get
 * full credit for what's already been paid (lib/pricing.ts's
 * priceAfterCredit) - the same amount server/routes/checkout.ts charges.
 *
 * "Send to parent on WhatsApp" sits beside the pay button: the same phone is
 * often shared, and when it's the child holding it, this hands the payment
 * step to the parent with the result link.
 */
export function UnlockOffer({
  id = "offer",
  childName,
  paidAmount,
  busyLevel,
  onSelect,
  sendToParentHref,
  headline,
  onShowCareerList,
}: {
  id?: string;
  childName?: string;
  /** Rupees already paid - credited in full */
  paidAmount: number;
  busyLevel: PaidLevel | null;
  onSelect: (level: PaidLevel) => void;
  sendToParentHref?: string;
  /** Optional heading above the card */
  headline?: string;
  /** Shows the ₹99 career list (FallbackOffer.tsx). Kept to one small text
   *  link under the card, so ₹99 never sits beside ₹999 as an equal choice;
   *  omitted once anything has been bought. */
  onShowCareerList?: () => void;
}) {
  const [withCounsellor, setWithCounsellor] = useState(false);
  const possessive = childName ? `${childName}'s` : "the";
  const report = TIER_OPTIONS.find((t) => t.level === 3)!;
  const reportPrice = priceAfterCredit(3, paidAmount);
  const bundlePrice = priceAfterCredit(4, paidAmount);
  const addOnPrice = bundlePrice - reportPrice;
  const level: PaidLevel = withCounsellor ? 4 : 3;
  const price = withCounsellor ? bundlePrice : reportPrice;
  const compareAt = paidAmount > 0 ? undefined : COMPARE_AT_PRICES[level];

  return (
    <section id={id} className="mt-16 scroll-mt-6">
      {headline && <h2 className="mb-8 text-h2 font-semibold text-text">{headline}</h2>}
      <div className="relative rounded-xl border-2 border-accent-600 bg-surface p-5 shadow-feature sm:p-6">
        <span className="absolute -top-3 left-5 rounded-full bg-brand-800 px-3 py-0.5 text-note font-semibold text-white">
          {possessive.replace(/^./, (c) => c.toUpperCase())} full plan
        </span>
        <h2 className="text-h3 font-semibold text-text">{report.name}</h2>
        <p className="mt-1 font-display text-h1 font-semibold text-text">
          {formatInr(price)}
          {compareAt && (
            <s className="ml-2 font-sans text-body font-normal text-text-muted">{formatInr(compareAt)}</s>
          )}
          <span className="ml-2 font-sans text-note font-normal text-text-muted">one-time</span>
        </p>
        {paidAmount > 0 ? (
          <p className="mt-1 text-note font-medium text-ok-700">
            {formatInr(paidAmount)} already paid is credited in full
          </p>
        ) : (
          compareAt && (
            <p className="mt-1 text-note font-medium text-accent-700">
              Launch price · save {formatInr(compareAt - price)}
            </p>
          )
        )}

        <ul className="mt-5 space-y-1.5 text-body text-text">
          {report.includes.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-2 block size-1.5 shrink-0 rounded-full bg-accent-600" />
              {item}
            </li>
          ))}
        </ul>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-hairline bg-surface-sunk/60 px-4 py-3">
          <input
            type="checkbox"
            checked={withCounsellor}
            onChange={(event) => setWithCounsellor(event.target.checked)}
            className="mt-1 size-5 shrink-0 accent-[var(--color-accent-600)]"
          />
          <span className="text-body text-text">
            <span className="font-semibold">Add a counsellor call for {formatInr(addOnPrice)} more</span>
            <span className="mt-0.5 block text-note text-text-secondary">
              45 minutes with a career counsellor about {possessive} results, plus a written summary after.
            </span>
          </span>
        </label>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button
            variant="accent"
            size="lg"
            className="w-full"
            loading={busyLevel === level}
            loadingText="Opening checkout"
            disabled={busyLevel !== null}
            onClick={() => onSelect(level)}
          >
            Unlock {possessive} plan · {formatInr(price)}
          </Button>
          {sendToParentHref && (
            <a
              href={sendToParentHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-ok-700 px-5 text-body font-semibold text-ok-700 hover:bg-ok-700/10"
            >
              Send to parent on WhatsApp
            </a>
          )}
        </div>

        <p className="mt-4 text-note text-text-muted">
          One-time payment by UPI (GPay, PhonePe, Paytm), card or netbanking · secured by Razorpay ·{" "}
          <Link href="/refund-policy" className="underline underline-offset-2 hover:text-text">
            Refund policy
          </Link>
        </p>
      </div>

      {onShowCareerList && (
        <p className="mt-4 text-center text-note text-text-secondary">
          Just want the career list?{" "}
          <button
            type="button"
            onClick={onShowCareerList}
            className="min-h-11 font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
          >
            Get it for {formatInr(priceAfterCredit(1, paidAmount))}
          </button>
        </p>
      )}

      <ul className="mt-6 grid gap-2 text-note text-text-secondary sm:grid-cols-3">
        <li className="flex gap-2">
          <span aria-hidden="true">✓</span> Based on Holland&apos;s RIASEC interest model
        </li>
        <li className="flex gap-2">
          <span aria-hidden="true">✓</span> Results saved — open them anytime
        </li>
        <li className="flex gap-2">
          <span aria-hidden="true">✓</span> Secure payment via Razorpay
        </li>
      </ul>
    </section>
  );
}
