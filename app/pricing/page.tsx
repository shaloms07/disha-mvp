"use client";

import Script from "next/script";
import { useState } from "react";
import { PricingTierCard } from "@/components/PricingTierCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SpectrumRule } from "@/components/ui/Spectrum";
import { useSession } from "@/lib/context/SessionContext";
import { createCheckoutOrder, verifyCheckoutPayment } from "@/lib/api/realSession";
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
  const [checkoutError, setCheckoutError] = useState<string>();

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
    if (level === 0 || processing || !session.sessionToken) return;
    const sessionToken = session.sessionToken;
    const selectedTierLevel = level as Exclude<TierLevel, 0>;

    setCheckoutError(undefined);
    setProcessing(true);
    try {
      const order = await createCheckoutOrder(sessionToken, selectedTierLevel);
      const Razorpay = window.Razorpay;
      if (!Razorpay) {
        throw new Error("Checkout could not load. Please refresh and try again.");
      }

      // Resolves only after the backend has verified the payment signature -
      // the handler callback alone is never treated as "paid" (see
      // server/routes/checkout.ts's /verify route and the webhook, which
      // together are the actual source of truth).
      const paymentId = await new Promise<string>((resolve, reject) => {
        const checkout = new Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.razorpayOrderId,
          name: "My Life Coach",
          description: TIER_OPTIONS.find((t) => t.level === selectedTierLevel)?.name,
          prefill: { name: session.parentName, contact: session.parentMobile },
          theme: { color: "#124249" },
          handler: (response) => {
            verifyCheckoutPayment(sessionToken, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
              .then(() => resolve(response.razorpay_payment_id))
              .catch(reject);
          },
          modal: { ondismiss: () => reject(new Error("dismissed")) },
        });
        checkout.open();
      });

      updateSession({ selectedTiers: tiers, orderId: paymentId });
      setConfirmed(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (error instanceof Error && error.message === "dismissed") {
        // Closed the Razorpay modal without paying - not an error, just stop.
      } else {
        setCheckoutError(
          error instanceof Error ? error.message : "Payment failed. Please try again.",
        );
      }
    } finally {
      setProcessing(false);
    }
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
              ? `One more step for ${childName}'s report`
              : "One more step for the report"}
          </h1>
          <p className="mt-4 text-lead text-text-secondary">
            Three quick tests left — Aptitude, Behavioral and Work Values —
            then the full report is ready.
          </p>

          <Card className="mt-10">
            <dl className="flex items-baseline justify-between gap-4 text-note">
              <dt className="text-text-muted">Payment ID</dt>
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
                Your 1:1 consultation is included.
              </span>{" "}
              Finish the Deep-Dive Assessment and you&apos;ll be able to pick a
              slot on the report page.
            </p>
          )}

          <p className="mt-5 border-l-2 border-hairline pl-5 text-note text-text-muted">
            Razorpay sends a payment receipt separately. Keep the payment ID
            above for your records.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href="/test"
              variant="accent"
              size="lg"
              className="w-full sm:w-auto"
            >
              Start the Deep-Dive Assessment
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
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
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
            The interest snapshot stays free. Every option below unlocks the
            Deep-Dive Assessment — three more quick tests — and each one
            builds on the one before it.
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
            loadingText="Opening checkout"
            aria-disabled={level === 0}
          >
            {level === 0 ? "Select an option" : `Checkout · ${formatInr(total)}`}
          </Button>

          {checkoutError && (
            <p role="alert" className="mt-4 text-center text-note text-err-700">
              {checkoutError}
            </p>
          )}

          <p aria-live="polite" className="sr-only">
            {processing ? "Opening secure checkout, please wait." : ""}
          </p>

          <p className="mt-5 text-center text-note text-text-muted">
            Secure checkout by Razorpay. We never see or store your card details.
          </p>
        </Card>
      </main>

      <SiteFooter />
    </>
  );
}
