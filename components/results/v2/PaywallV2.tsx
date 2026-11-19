"use client";

import { SupportCallLine } from "@/components/SupportCallLine";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CallbackRequest } from "@/components/results/v2/CallbackRequest";
import { SendToParentButton } from "@/components/results/v2/SendToParentButton";
import { TrustBlock } from "@/components/results/v2/TrustBlock";
import { offerIncludes } from "@/lib/offerCopy";
import {
  BUNDLE_REGULAR_PRICE,
  COMPARE_AT_PRICES,
  TIER_OPTIONS,
  formatInr,
  launchPriceActive,
  offerActive,
  offerEndLabel,
  priceAfterCredit,
} from "@/lib/pricing";
import { REFUND_PROMISE } from "@/lib/resultsPageConfig";

export type PayTapKind = "report" | "report+call" | "bundle";

/**
 * RESULT_PAGE_V2's paywall - only after the 3 tests, under the locked plan
 * (ResultsReady.tsx). In order:
 *   the Complete Career Report (strike-through + "Launch price till 25 Nov"
 *   only before lib/pricing.ts's OFFER_EXPIRY; "₹449 after your ₹49 credit")
 *   the bundle - Report + counsellor call at the offer price - as a second,
 *   quieter card, only before OFFER_EXPIRY; after it, the call goes back to
 *   a +₹999 tick-box on the report card
 *   buttons by viewer: parent - Pay (filled) · bundle (outline); child -
 *   Send to my parent (filled) · Pay (outline)
 *   the ₹49 list as a text link, for anyone who hasn't bought it
 *   the free callback (parent view only), then the trust block
 * Prices all come from lib/pricing.ts; the server re-prices every order.
 */
export function PaywallV2({
  firstName,
  childClass,
  viewer,
  paidAmount,
  ownedLevel,
  busyLevel,
  highlightPay,
  sendToParentHref,
  sessionToken,
  parentMobile,
  onCheckout,
  onPayTap,
  onSendToParent,
  onView,
  onCallbackTap,
  onCareerList,
}: {
  firstName: string;
  childClass?: string;
  viewer: "parent" | "child";
  paidAmount: number;
  ownedLevel: number;
  busyLevel: number | null;
  /** Opened from the parent's ?pay=1 link */
  highlightPay: boolean;
  sendToParentHref?: string;
  sessionToken?: string;
  parentMobile?: string;
  onCheckout: (level: 1 | 3 | 4, options?: { offer?: "bundle" }) => void;
  onPayTap: (kind: PayTapKind) => void;
  onSendToParent: () => void;
  onView: () => void;
  onCallbackTap: () => void;
  onCareerList: () => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const viewed = useRef(false);
  useEffect(() => {
    const element = sectionRef.current;
    if (!element || viewed.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !viewed.current) {
          viewed.current = true;
          onView();
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [onView]);

  const [withCall, setWithCall] = useState(false);
  const child = viewer === "child";
  const possessive = firstName ? `${firstName}'s` : "the";
  const report = TIER_OPTIONS.find((t) => t.level === 3)!;
  const reportPrice = priceAfterCredit(3, paidAmount);
  const bundlePrice = priceAfterCredit(4, paidAmount);
  const bundleActive = offerActive() && ownedLevel < 4;
  // After the offer: the counsellor call is a tick-box add-on (+₹999)
  const addOnPrice = bundlePrice - reportPrice;
  const payLevel: 3 | 4 = !bundleActive && withCall ? 4 : 3;
  const payPrice = payLevel === 4 ? bundlePrice : reportPrice;
  const compareAt = paidAmount === 0 && launchPriceActive() ? COMPARE_AT_PRICES[3] : undefined;
  const endLabel = offerEndLabel();

  function pay() {
    onPayTap(payLevel === 4 ? "report+call" : "report");
    onCheckout(payLevel);
  }
  function payBundle() {
    onPayTap("bundle");
    onCheckout(4, { offer: "bundle" });
  }

  const payButton = (
    <Button
      variant={child ? "secondary" : "accent"}
      size="lg"
      className={`w-full ${highlightPay ? "disha-pay-highlight" : ""}`}
      loading={busyLevel === payLevel}
      loadingText="Opening checkout"
      disabled={busyLevel !== null}
      onClick={pay}
    >
      {child ? `Pay now · ${formatInr(payPrice)}` : `Pay ${formatInr(payPrice)}`}
    </Button>
  );

  const paymentNote = (
    <>
      <p className="mt-3 text-note text-text-secondary">
        {REFUND_PROMISE ? `${REFUND_PROMISE} ` : ""}
        UPI, card or netbanking · secured by Razorpay ·{" "}
        <Link href="/refund-policy" className="underline underline-offset-2 hover:text-text">
          Refund policy
        </Link>
      </p>
      <SupportCallLine />
    </>
  );

  return (
    <section ref={sectionRef} id="offer" className="mt-14 scroll-mt-6" aria-labelledby="offer-heading">
      <h2 id="offer-heading" className="text-h2 font-semibold text-text">
        Unlock {possessive} full plan
      </h2>

      {/* ---------------- the Complete Career Report ------------------- */}
      <div className="mt-6 rounded-xl border-2 border-accent-600 bg-surface p-5 shadow-feature sm:p-6">
        <h3 className="text-h3 font-semibold text-text">{report.name}</h3>
        <p className="mt-1 font-display text-h1 font-semibold text-text">
          {formatInr(payLevel === 4 ? bundlePrice : reportPrice)}
          {compareAt && payLevel === 3 && (
            <s className="ml-2 font-sans text-body font-normal text-text-secondary">{formatInr(compareAt)}</s>
          )}
          <span className="ml-2 font-sans text-note font-normal text-text-secondary">one-time</span>
        </p>
        {paidAmount > 0 ? (
          <p className="mt-1 text-note font-semibold text-ok-700">
            {formatInr(reportPrice)} after your {formatInr(paidAmount)} credit
          </p>
        ) : (
          compareAt && <p className="mt-1 text-note font-semibold text-accent-700">Launch price till {endLabel}</p>
        )}

        <ul className="mt-4 space-y-1.5 text-body text-text">
          {offerIncludes(report.includes, childClass).map((item) => (
            <li key={item} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-2 block size-1.5 shrink-0 rounded-full bg-accent-600" />
              {item}
            </li>
          ))}
        </ul>

        {!bundleActive && ownedLevel < 4 && (
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-hairline bg-surface-sunk/60 px-4 py-3">
            <input
              type="checkbox"
              checked={withCall}
              onChange={(event) => setWithCall(event.target.checked)}
              className="mt-1 size-5 shrink-0 accent-[var(--color-accent-600)]"
            />
            <span className="text-body text-text">
              <span className="font-semibold">Add a 45-min counsellor call for {formatInr(addOnPrice)} more</span>
              <span className="mt-0.5 block text-note text-text-secondary">
                About {possessive} results, plus a written summary after.
              </span>
            </span>
          </label>
        )}

        <div className="mt-5 grid gap-3">
          {child && sendToParentHref ? (
            <>
              <SendToParentButton href={sendToParentHref} onTap={onSendToParent} primary />
              {payButton}
            </>
          ) : (
            payButton
          )}
        </div>
        {paymentNote}
      </div>

      {/* ---------------- the bundle - only while the offer lasts -------- */}
      {bundleActive && (
        <div className="mt-4 rounded-xl border border-hairline bg-surface p-5 sm:p-6">
          <p className="text-note font-semibold text-accent-700">Offer ends {endLabel}</p>
          <h3 className="mt-1 text-lead font-semibold text-text">Report + 45-min counsellor call</h3>
          <p className="mt-1 text-body text-text">
            <span className="font-display text-h2 font-semibold">{formatInr(bundlePrice)}</span>{" "}
            <span className="text-text-secondary">(normally {formatInr(BUNDLE_REGULAR_PRICE - paidAmount)})</span>
          </p>
          {paidAmount > 0 && (
            <p className="text-note font-semibold text-ok-700">After your {formatInr(paidAmount)} credit</p>
          )}
          <p className="mt-2 text-body text-text-secondary">
            Everything in the report, plus a call with a career counsellor about {possessive} results and a written
            summary after.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="mt-4 w-full"
            loading={busyLevel === 4}
            loadingText="Opening checkout"
            disabled={busyLevel !== null}
            onClick={payBundle}
          >
            Get the bundle · {formatInr(bundlePrice)}
          </Button>
        </div>
      )}

      {/* ---------------- the ₹49 downsell -------------------------------- */}
      {ownedLevel === 0 && (
        <p className="mt-5 text-center text-body text-text-secondary">
          Not ready for the full report?{" "}
          <button
            type="button"
            onClick={onCareerList}
            disabled={busyLevel !== null}
            className="min-h-11 font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800"
          >
            Get the ranked career list · {formatInr(priceAfterCredit(1, 0))} →
          </button>
        </p>
      )}

      {/* ---------------- free callback - parent view only --------------- */}
      {!child && sessionToken && (
        <CallbackRequest
          sessionToken={sessionToken}
          parentMobile={parentMobile}
          firstName={firstName}
          payLabel={`Unlock ${possessive} report · ${formatInr(reportPrice)}`}
          onPay={pay}
          onTap={onCallbackTap}
        />
      )}

      <TrustBlock size="full" />
    </section>
  );
}
