"use client";

import { useState } from "react";
import { PricingTierCard } from "@/components/PricingTierCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SpectrumRule } from "@/components/ui/Spectrum";
import { useSession } from "@/lib/context/SessionContext";
import { mockCheckout } from "@/lib/mockApi";
import {
  TIER_OPTIONS,
  calculateTotal,
  formatInr,
  levelForTiers,
  lineItems,
  tiersForLevel,
  type TierLevel,
} from "@/lib/pricing";

export default function PricingPage() {
  const { session, hydrated, updateSession } = useSession();

  const [level, setLevel] = useState<TierLevel>(0);
  const [restored, setRestored] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Pick the selection back up after a refresh.
  if (hydrated && !restored) {
    setRestored(true);
    const stored = levelForTiers(session.selectedTiers);
    if (stored !== 0) setLevel(stored);
    if (session.orderId) setConfirmed(true);
  }

  const tiers = tiersForLevel(level);
  const total = calculateTotal(tiers);
  const items = lineItems(tiers);
  const childName = session.childName;

  function handleSelect(next: TierLevel) {
    setLevel(next);
    updateSession({ selectedTiers: tiersForLevel(next) });
  }

  async function handleCheckout() {
    if (level === 0 || processing) return;

    setProcessing(true);
    const { orderId } = await mockCheckout(tiers);
    updateSession({ selectedTiers: tiers, orderId });
    setProcessing(false);
    setConfirmed(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!hydrated) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
          <div aria-hidden="true" className="animate-pulse space-y-6">
            <div className="h-3 w-28 rounded-full bg-surface-sunk" />
            <div className="h-9 w-3/4 rounded-lg bg-surface-sunk" />
            <div className="h-56 rounded-xl bg-surface-sunk" />
            <div className="h-56 rounded-xl bg-surface-sunk" />
          </div>
          <p className="sr-only">Loading options.</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  /* ------------------------------------------------------- confirmation */

  if (confirmed) {
    const confirmedItems = lineItems(session.selectedTiers);
    const confirmedTotal = calculateTotal(session.selectedTiers);

    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14 sm:py-20">
          <p className="text-note text-ok-700">Order confirmed</p>
          <h1 className="mt-3 text-h1 font-semibold text-text">
            {childName
              ? `${childName}'s report is being prepared`
              : "Your report is being prepared"}
          </h1>

          <Card className="mt-10">
            <dl className="flex items-baseline justify-between gap-4 text-note">
              <dt className="text-text-muted">Order ID</dt>
              <dd className="font-mono text-text">{session.orderId}</dd>
            </dl>

            <ul className="mt-7 space-y-3 border-t border-hairline pt-6 text-body">
              {confirmedItems.map((item) => (
                <li key={item.name} className="flex justify-between gap-5">
                  <span className="text-text">{item.name}</span>
                  <span className="font-mono tabular-nums text-text-secondary">
                    {formatInr(item.amount)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-baseline justify-between border-t border-hairline pt-6">
              <span className="text-body font-medium text-text">Total paid</span>
              <span className="font-mono text-h3 tabular-nums text-text">
                {formatInr(confirmedTotal)}
              </span>
            </div>
          </Card>

          {session.selectedTiers.consultation && (
            <p className="mt-6 border-l-2 border-hairline pl-5 text-body text-text-secondary">
              <span className="font-medium text-text">
                Consultation scheduling is coming soon.
              </span>{" "}
              Booking a slot is not available yet — in the live product you would
              pick a time here.
            </p>
          )}

          <p className="mt-5 border-l-2 border-hairline pl-5 text-note text-text-muted">
            <span className="font-medium text-text">Demo build:</span> no payment
            was taken and no order was created. This confirmation is generated in
            your browser.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href="/report-preview"
              variant="accent"
              size="lg"
              className="w-full sm:w-auto"
            >
              View the report
            </ButtonLink>
            <ButtonLink
              href="/results"
              variant="quiet"
              size="lg"
              className="w-full sm:w-auto"
            >
              Back to the snapshot
            </ButtonLink>
          </div>

          <Button
            variant="quiet"
            size="sm"
            onClick={() => setConfirmed(false)}
            className="mt-6"
          >
            Change selection
          </Button>
        </main>
        <SiteFooter />
      </>
    );
  }

  /* ------------------------------------------------------------ selection */

  return (
    <>
      <SiteHeader />

      <section className="grain relative overflow-hidden bg-ink-deep pb-28 text-white">
        <div className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-14 sm:pt-20">
          <SpectrumRule className="w-24" />
          <p className="mt-8 text-note text-on-dark/70">Optional add-ons</p>
          <h1 className="mt-3 text-h1 font-semibold text-white sm:text-display">
            {childName
              ? `Go deeper into ${childName}'s results`
              : "Go deeper into the results"}
          </h1>
          <p className="mt-6 max-w-xl text-lead text-on-dark">
            The interest snapshot stays free. Each option below builds on the
            one before it.
          </p>
        </div>
      </section>

      <main className="relative z-20 mx-auto -mt-16 w-full max-w-3xl flex-1 px-6 pb-16">
        <fieldset
          className="space-y-6"
          disabled={processing}
          aria-describedby="order-total"
        >
          <legend className="sr-only">Choose a report option</legend>
          {TIER_OPTIONS.map((option) => (
            <PricingTierCard
              key={option.level}
              option={option}
              isFirst={option.level === 1}
              selected={level === option.level}
              onSelect={() => handleSelect(option.level)}
            />
          ))}
        </fieldset>

        <Card tone="quiet" className="mt-12">
          <h2 className="text-h3 font-semibold text-text">Order summary</h2>

          {items.length === 0 ? (
            <p className="mt-4 text-body text-text-secondary">
              Nothing selected yet — pick an option above.
            </p>
          ) : (
            <ul className="mt-5 space-y-3 text-body">
              {items.map((item) => (
                <li key={item.name} className="flex justify-between gap-5">
                  <span className="text-text">{item.name}</span>
                  <span className="font-mono tabular-nums text-text-secondary">
                    {formatInr(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div
            id="order-total"
            className="mt-6 flex items-baseline justify-between border-t border-hairline pt-6"
          >
            <span className="text-body font-medium text-text">Total</span>
            <span className="font-mono text-h2 tabular-nums text-text">
              {formatInr(total)}
            </span>
          </div>

          <Button
            variant="accent"
            size="lg"
            className="mt-8 w-full"
            onClick={handleCheckout}
            loading={processing}
            loadingText="Processing payment"
            aria-disabled={level === 0}
          >
            {level === 0 ? "Select an option" : `Checkout · ${formatInr(total)}`}
          </Button>

          <p aria-live="polite" className="sr-only">
            {processing ? "Processing your order, please wait." : ""}
          </p>

          <p className="mt-5 text-center text-note text-text-muted">
            Demo build — no payment is taken and no card details are collected.
          </p>
        </Card>
      </main>

      <SiteFooter />
    </>
  );
}
