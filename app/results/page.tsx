"use client";

import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { RIASEC_COLORS, RiasecRadarChart } from "@/components/RiasecRadarChart";
import { SpectrumRule } from "@/components/ui/Spectrum";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CareerGap } from "@/components/results/CareerGap";
import { OfferCards } from "@/components/results/OfferCards";
import { ReportPreview } from "@/components/results/ReportPreview";
import { ResultVideo } from "@/components/results/ResultVideo";
import { StickyUnlockBar } from "@/components/results/StickyUnlockBar";
import { TrustSection } from "@/components/results/TrustSection";
import { WebinarSection } from "@/components/results/WebinarSection";
import { useSession } from "@/lib/context/SessionContext";
import {
  createCheckoutOrder,
  fetchSessionByToken,
  registerReportInterest,
  verifyCheckoutPayment,
} from "@/lib/api/realSession";
import { askParentWhatsAppUrl, resultsLinkFor } from "@/lib/askParent";
import { TYPE_SUMMARIES, getHeadline, isFlatProfile } from "@/lib/interpretation";
import { matchCareers } from "@/lib/matching";
import { downloadPdfDocument, slugForFilename } from "@/lib/pdf/download";
import { buildInterestReportData } from "@/lib/pdf/interestReportData";
import { InterestReportDocument } from "@/lib/pdf/InterestReportDocument";
import {
  TIER_OPTIONS,
  clampTierLevel,
  formatInr,
  levelForTiers,
  tiersForLevel,
  upgradeCost,
  type TierLevel,
} from "@/lib/pricing";
import {
  RESULT_VIDEOS,
  SHOW_TRUST_SECTION,
  SHOW_WEBINAR_SECTION,
  resultVideoKey,
} from "@/lib/resultsPageConfig";
import {
  MAX_TYPE_SCORE,
  getAnsweredCount,
  isTestComplete,
  rankTypes,
  scoreResponses,
} from "@/lib/scoring";
import { hasDeepDive, isDeepDiveComplete } from "@/lib/testModules";
import type { RiasecType } from "@/types";

type PaidLevel = Exclude<TierLevel, 0>;

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsPageInner />
    </Suspense>
  );
}

function ResultsPageInner() {
  const searchParams = useSearchParams();
  const { session, hydrated, updateSession } = useSession();
  const [busyLevel, setBusyLevel] = useState<PaidLevel | null>(null);
  const [justBought, setJustBought] = useState<PaidLevel | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string>();
  const [linkInvalid, setLinkInvalid] = useState(false);

  /**
   * "Ask a parent" sends the parent /results?t=<token>. On their phone this
   * tab may hold nothing, or a different child entirely - so the server's copy
   * replaces the result fields rather than merging into them, which would mix
   * two children's answers.
   */
  const rehydrated = useRef(false);
  useEffect(() => {
    if (!hydrated || rehydrated.current) return;
    const token = searchParams.get("t");
    if (!token || token === session.sessionToken) return;
    rehydrated.current = true;

    fetchSessionByToken(token)
      .then((server) => {
        if (!server) {
          setLinkInvalid(true);
          return;
        }
        updateSession({
          sessionToken: server.sessionToken,
          parentName: server.parentName,
          parentMobile: server.parentMobile,
          childName: server.childName,
          childClass: server.childClass,
          childClassOther: server.childClassOther,
          consentGiven: server.consentGiven,
          otpVerified: server.otpVerified,
          schoolCode: server.schoolCode,
          schoolId: server.schoolId,
          classId: server.classId,
          parentStatedPreference: server.parentStatedPreference,
          responses: server.responses,
          scores: server.scores as Record<RiasecType, number> | undefined,
          completedAt: server.completedAt,
          orderId: undefined,
          selectedTiers: tiersForLevel(clampTierLevel(server.purchasedTierLevel)),
        });
      })
      .catch((error: unknown) => {
        console.error("[results] loading the shared result failed", error);
        setLinkInvalid(true);
      });
  }, [hydrated, searchParams, session.sessionToken, updateSession]);

  if (!hydrated) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:py-20">
          <div aria-hidden="true" className="animate-pulse space-y-6">
            <div className="h-3 w-28 rounded-full bg-surface-sunk" />
            <div className="h-9 w-3/4 rounded-lg bg-surface-sunk" />
            <div className="h-96 rounded-xl bg-surface-sunk" />
          </div>
          <p className="sr-only">Loading results.</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  // Prefer the stored totals; recompute if the test is finished but they're
  // missing (e.g. storage written before scoring completed).
  const scores =
    session.scores ??
    (isTestComplete(session.responses)
      ? scoreResponses(session.responses)
      : undefined);

  if (!scores) {
    const answered = getAnsweredCount(session.responses);
    const waitingForLink = Boolean(searchParams.get("t")) && !linkInvalid;
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14 sm:py-20">
          <h1 className="text-h1 font-semibold text-text">
            {waitingForLink ? "Opening the result…" : linkInvalid ? "This link isn't valid" : "No results yet"}
          </h1>
          <p className="mt-4 text-lead text-text-secondary">
            {waitingForLink
              ? "One moment."
              : linkInvalid
                ? "The result link may be incomplete. Ask for it to be sent again."
                : answered > 0
                  ? `The test is ${answered} of 36 questions in. Finish it and the snapshot appears here.`
                  : "Once the 36 questions are answered, the interest snapshot appears here."}
          </p>
          {!waitingForLink && (
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/test" size="lg" className="w-full sm:w-auto">
                {answered > 0 ? "Resume the test" : "Go to the test"}
              </ButtonLink>
              <ButtonLink href="/register" variant="quiet" size="lg" className="w-full sm:w-auto">
                Start over
              </ButtonLink>
            </div>
          )}
        </main>
        <SiteFooter />
      </>
    );
  }

  const ranked = rankTypes(scores);
  const flat = isFlatProfile(scores);
  const childName = session.childName;
  const possessive = childName ? `${childName}'s` : "your child's";

  // What's been paid for decides what this page is: a sales page (nothing),
  // a report + upgrade page (Career Match Report), or a hand-off into the
  // Deep-Dive (Complete Career Report and above).
  const ownedLevel = levelForTiers(session.selectedTiers);
  const purchased = hasDeepDive(session);
  const deepDiveDone = isDeepDiveComplete(session);
  const ownsMatchReport = ownedLevel >= 1;

  const videoSrc = RESULT_VIDEOS[resultVideoKey([ranked[0], ranked[1]], flat)];
  const matchCount = matchCareers(scores).length;
  // Everything below the hydration gate renders only in the browser, so the
  // real origin is available for the share link.
  const askParentHref =
    session.sessionToken
      ? askParentWhatsAppUrl({
          parentMobile: session.parentMobile,
          childName,
          topLabels: [TYPE_SUMMARIES[ranked[0]].label, TYPE_SUMMARIES[ranked[1]].label],
          link: resultsLinkFor(session.sessionToken, window.location.origin),
        })
      : undefined;

  async function downloadMatchReport(orderId?: string) {
    if (!scores) return;
    setDownloading(true);
    try {
      const data = buildInterestReportData({ childName: childName || "Student", orderId, scores });
      await downloadPdfDocument(
        <InterestReportDocument data={data} />,
        `${slugForFilename(childName || "my-life-coach")}-career-match-report.pdf`,
      );
    } finally {
      setDownloading(false);
    }
  }

  /**
   * Real Razorpay checkout for any of the three options. The server charges
   * the upgrade difference when a lower tier is already owned
   * (lib/pricing.ts's upgradeCost), so the amount comes from the order it
   * creates, never from this page.
   */
  async function handleCheckout(level: PaidLevel) {
    if (busyLevel || !session.sessionToken) return;
    const sessionToken = session.sessionToken;
    const option = TIER_OPTIONS.find((t) => t.level === level)!;

    setCheckoutError(undefined);
    setBusyLevel(level);
    // Records the intent in the admin dashboard even if checkout is abandoned.
    registerReportInterest(sessionToken, level).catch(() => {});
    try {
      const order = await createCheckoutOrder(sessionToken, level);
      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error("Checkout could not load. Please refresh and try again.");

      const paymentId = await new Promise<string>((resolve, reject) => {
        const checkout = new Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.razorpayOrderId,
          name: "My Life Coach",
          description: option.name,
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

      updateSession({
        selectedTiers: tiersForLevel(Math.max(level, ownedLevel) as TierLevel),
        orderId: paymentId,
      });
      (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq?.("track", "Purchase", {
        value: order.amount / 100,
        currency: order.currency,
        content_name: option.name,
      });
      setJustBought(level);
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (level === 1) await downloadMatchReport(paymentId);
    } catch (error) {
      if (!(error instanceof Error && error.message === "dismissed")) {
        setCheckoutError(error instanceof Error ? error.message : "Payment failed. Please try again.");
      }
    } finally {
      setBusyLevel(null);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <SiteHeader />

      {/* Dark band: the result gets announced before it gets explained. */}
      <section className="grain relative overflow-hidden bg-ink-deep pb-32 text-white">
        <div className="relative z-10 mx-auto w-full max-w-2xl px-6 pt-14 sm:pt-20">
          <SpectrumRule className="w-24" />
          <p className="mt-8 text-note text-on-dark/70">Your free snapshot</p>
          <h1 className="mt-3 text-h1 font-semibold text-white sm:text-display">
            {childName ? `${childName}'s interest snapshot` : "Interest snapshot"}
          </h1>

          <p aria-hidden="true" className="mt-9 flex gap-3 font-display text-display font-semibold leading-none">
            {ranked.slice(0, 3).map((type) => (
              <span key={type} style={{ color: RIASEC_COLORS[type] }}>
                {type}
              </span>
            ))}
          </p>
          <p className="mt-4 text-lead text-on-dark">Strongest three, in order, from all 36 picks.</p>
        </div>
      </section>

      <main
        className={`relative z-20 mx-auto -mt-20 w-full max-w-2xl flex-1 px-6 ${ownedLevel === 0 ? "pb-36 sm:pb-16" : "pb-16"}`}
      >
        {/* ------------------------------------------- just paid: confirm */}
        {justBought === 1 && (
          <Card className="mb-6 border-ok-700/30 shadow-feature">
            <p className="text-note font-medium text-ok-700">Payment received</p>
            <h2 className="mt-2 text-h2 font-semibold text-text">
              {possessive.replace(/^./, (c) => c.toUpperCase())} Career Match Report is ready
            </h2>
            <p className="mt-2 text-body text-text-secondary">
              It has downloaded to this device, with every career match inside. Stream direction is unlocked below.
            </p>
            <Button
              variant="secondary"
              size="md"
              className="mt-5 w-full sm:w-auto"
              loading={downloading}
              loadingText="Preparing your PDF"
              onClick={() => downloadMatchReport(session.orderId)}
            >
              Download again
            </Button>
          </Card>
        )}

        {/* -------- chart: the one place motion happens in this product ---- */}
        <Card className="shadow-feature">
          <RiasecRadarChart scores={scores} animate />
        </Card>

        {/* Only appears once a video exists for this result - see
            lib/resultsPageConfig.ts's RESULT_VIDEOS. */}
        {videoSrc && (
          <ResultVideo
            src={videoSrc}
            caption={`${possessive.replace(/^./, (c) => c.toUpperCase())} result explained — ${TYPE_SUMMARIES[ranked[0]].label} + ${TYPE_SUMMARIES[ranked[1]].label}`}
          />
        )}

        {ownsMatchReport && justBought !== 1 && (
          <Button
            variant="secondary"
            size="lg"
            className="mt-6 w-full sm:w-auto"
            loading={downloading}
            loadingText="Preparing your PDF"
            onClick={() => downloadMatchReport(session.orderId)}
          >
            Download the Career Match Report
          </Button>
        )}

        {/* ------------------------------------------------ what stands out */}
        <section className="mt-16">
          <h2 className="text-h2 font-semibold text-text">{getHeadline(scores, childName)}</h2>

          {flat && (
            <p className="mt-4 text-body text-text-secondary">
              No single type pulls ahead here, which is common and perfectly normal at this age. The three highest
              are still worth a look, but treat them as leanings rather than a clear direction.
            </p>
          )}

          {/* Every type, highest to lowest, so the lower scores are as visible
              as the top ones - not just the two or three that stand out. */}
          <div className="mt-9 space-y-10">
            {ranked.map((type) => {
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
                      {scores[type]}/{MAX_TYPE_SCORE[type]}
                    </span>
                  </div>

                  <p className="mt-4 text-lead font-medium text-text">{summary.headline}</p>
                  <p className="mt-3 text-body leading-relaxed text-text-secondary">{summary.blurb}</p>
                  <p className="mt-4 text-note text-text-muted">Shows up as: {summary.examples}</p>
                </article>
              );
            })}
          </div>

          <p className="mt-8 border-l-2 border-hairline pl-5 text-body text-text-secondary">
            This describes what {childName || "your child"} is drawn to — not how capable they are, and not a
            prediction of marks.
          </p>
        </section>

        {/* ------------------------------- the gap, then the paid options */}
        <CareerGap scores={scores} childName={childName} unlocked={ownsMatchReport} />

        {checkoutError && (
          <p role="alert" className="mt-6 text-note text-err-700">
            {checkoutError}
          </p>
        )}

        {/* Once the Deep-Dive is bought, this stops being a sales pitch - what
            the parent needs is the next step in what they bought. */}
        {purchased ? (
          <Card tone="feature" className="mt-16">
            <p className="text-note text-brand-100/75">Plan confirmed</p>
            <h2 className="mt-3 text-h2 font-semibold text-white">
              {deepDiveDone ? "Your full report is ready" : "Next: the Deep-Dive Assessment"}
            </h2>
            <p className="mt-4 text-body text-brand-100">
              {deepDiveDone
                ? `The report matches ${childName || "your child"}'s full profile — interests, aptitude, behaviour and work values — against career profiles, with entrance exams, courses and next steps for each.`
                : `Three more quick tests — Aptitude, Behavioral and Work Values. The full report needs all three before it can rank careers against ${childName || "your child"}'s whole profile, not interests alone.`}
            </p>
            <ButtonLink
              href={deepDiveDone ? "/report-preview" : "/test"}
              variant="accent"
              size="lg"
              className="mt-9 w-full sm:w-auto"
            >
              {deepDiveDone ? "Open the full report" : "Continue to the Deep-Dive"}
            </ButtonLink>
            <p className="mt-5 text-note text-brand-100/75">
              {deepDiveDone
                ? "Included in the plan you bought."
                : "About ten minutes. Answers save as you go, so you can stop and come back."}
            </p>
          </Card>
        ) : (
          <>
            <OfferCards
              childName={childName}
              ownedLevel={ownedLevel}
              busyLevel={busyLevel}
              onSelect={handleCheckout}
              askParentHref={ownedLevel === 0 ? askParentHref : undefined}
            />
            {ownedLevel === 0 && <ReportPreview />}
          </>
        )}

        {SHOW_TRUST_SECTION && <TrustSection />}
        {SHOW_WEBINAR_SECTION && !purchased && <WebinarSection />}
      </main>

      <SiteFooter />

      {ownedLevel === 0 && (
        <StickyUnlockBar
          lockedSummary={`${possessive.replace(/^./, (c) => c.toUpperCase())} ${matchCount} career matches & stream advice`}
          unlockLabel={`Unlock · ${formatInr(upgradeCost(1, 0))}`}
          onUnlock={() => handleCheckout(1)}
          busy={busyLevel === 1}
          askParentHref={askParentHref}
        />
      )}
    </>
  );
}
