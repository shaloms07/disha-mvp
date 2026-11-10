"use client";

import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { RIASEC_COLORS, RiasecRadarChart } from "@/components/RiasecRadarChart";
import { SpectrumRule } from "@/components/ui/Spectrum";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CareerGap } from "@/components/results/CareerGap";
import { DeepDiveFree } from "@/components/results/DeepDiveFree";
import { ConsultationScheduler } from "@/components/ConsultationScheduler";
import { FallbackOffer } from "@/components/results/FallbackOffer";
import { InterestDetails } from "@/components/results/InterestDetails";
import { OfferCards } from "@/components/results/OfferCards";
import { ReportPreview } from "@/components/results/ReportPreview";
import { ResultsReady, type CareerSummaryState } from "@/components/results/ResultsReady";
import { ResultVideo } from "@/components/results/ResultVideo";
import { StickyUnlockBar } from "@/components/results/StickyUnlockBar";
import { TrustSection } from "@/components/results/TrustSection";
import { UnlockOffer } from "@/components/results/UnlockOffer";
import { WebinarSection } from "@/components/results/WebinarSection";
import { useSession } from "@/lib/context/SessionContext";
import {
  createCheckoutOrder,
  fetchCareerSummary,
  fetchSessionByToken,
  registerReportInterest,
  verifyCheckoutPayment,
} from "@/lib/api/realSession";
import { askParentWhatsAppUrl, resultsLinkFor } from "@/lib/askParent";
import { buildCareerFieldSummary } from "@/lib/careerSummary";
import { TYPE_SUMMARIES, describeTopInterests, getHeadline, isFlatProfile } from "@/lib/interpretation";
import { downloadPdfDocument, slugForFilename } from "@/lib/pdf/download";
import { buildInterestReportData } from "@/lib/pdf/interestReportData";
import { InterestReportDocument } from "@/lib/pdf/InterestReportDocument";
import {
  TIER_OPTIONS,
  clampTierLevel,
  formatInr,
  levelForTiers,
  priceAfterCredit,
  tiersForLevel,
  totalForLevel,
  type TierLevel,
} from "@/lib/pricing";
import {
  RESULT_VIDEOS,
  SHOW_TRUST_SECTION,
  SHOW_WEBINAR_SECTION,
  resultVideoKey,
} from "@/lib/resultsPageConfig";
import {
  getAnsweredCount,
  isTestComplete,
  rankInterestTypes,
  scoreResponses,
  topInterestGroups,
} from "@/lib/scoring";
import { hasDeepDive, isDeepDiveComplete } from "@/lib/testModules";
import { moduleFieldsFromServer } from "@/lib/session/sync";
import type { RiasecType, SessionState } from "@/types";

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
  const router = useRouter();
  const { session, hydrated, updateSession } = useSession();
  const [unlockNow, setUnlockNow] = useState(false);
  const [busyLevel, setBusyLevel] = useState<PaidLevel | null>(null);
  const [justBought, setJustBought] = useState<PaidLevel | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string>();
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [careerSummary, setCareerSummary] = useState<CareerSummaryState>("loading");

  /**
   * The results-ready page's career summary - how many careers matched, in
   * which fields, never which careers. The server builds it, so an unpaid
   * family's browser only ever receives the counts. Fetched once, only once
   * the page actually is the results-ready page.
   */
  const summaryRequested = useRef(false);
  const summaryToken = session.sessionToken;
  const readyForSummary = hydrated && Boolean(summaryToken) && !hasDeepDive(session) && isDeepDiveComplete(session);
  useEffect(() => {
    if (!readyForSummary || !summaryToken || summaryRequested.current) return;
    summaryRequested.current = true;

    fetchCareerSummary(summaryToken)
      .then((response) => setCareerSummary(response.paid ? "unavailable" : response.summary))
      .catch((error: unknown) => {
        // Local development with no API running: build the same counts in the
        // browser so the page can still be previewed. Never in production -
        // there, no answer means no career data on the page at all.
        const localScores =
          session.scores ?? (isTestComplete(session.responses) ? scoreResponses(session.responses) : undefined);
        if (process.env.NODE_ENV === "development" && localScores) {
          console.info("[results] career-summary API unavailable - building a local preview");
          setCareerSummary(buildCareerFieldSummary(localScores));
          return;
        }
        console.error("[results] loading the career summary failed", error);
        setCareerSummary("unavailable");
      });
  }, [readyForSummary, summaryToken, session.scores, session.responses]);

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
          referralCode: server.referralCode,
          referralCount: server.referralCount,
          paidAmount: server.paidAmount,
          deepDiveStarted: undefined,
          // Deep-Dive answers and scores, so a link opened on another phone
          // shows the right next step - or the finished report.
          ...moduleFieldsFromServer(server.moduleResponses, server.moduleScores),
        });
      })
      .catch((error: unknown) => {
        console.error("[results] loading the shared result failed", error);
        setLinkInvalid(true);
      });
  }, [hydrated, searchParams, session.sessionToken, updateSession]);

  /**
   * Invite progress lives on the server - the invited parents register on
   * their own phones - so this tab's own result still asks for the latest
   * count, and picks up an unlock by invites that happened while it was
   * closed. Best-effort: offline, the page just shows what it already has.
   */
  const refreshed = useRef(false);
  useEffect(() => {
    if (!hydrated || refreshed.current || !session.sessionToken) return;
    const token = searchParams.get("t");
    if (token && token !== session.sessionToken) return; // the effect above loads that one
    refreshed.current = true;

    fetchSessionByToken(session.sessionToken)
      .then((server) => {
        if (!server) return;
        const serverLevel = clampTierLevel(server.purchasedTierLevel);
        updateSession({
          referralCode: server.referralCode,
          referralCount: server.referralCount,
          ...(server.paidAmount !== undefined ? { paidAmount: server.paidAmount } : {}),
          // A Deep-Dive finished on the child's phone, picked up here
          ...Object.fromEntries(
            Object.entries(moduleFieldsFromServer(server.moduleResponses, server.moduleScores)).filter(
              ([key, value]) => value !== undefined && session[key as keyof SessionState] === undefined,
            ),
          ),
          ...(serverLevel > levelForTiers(session.selectedTiers)
            ? { selectedTiers: tiersForLevel(serverLevel) }
            : {}),
        });
      })
      .catch(() => {});
  }, [hydrated, searchParams, session, updateSession]);

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

  const ranked = rankInterestTypes(scores);
  const topGroups = topInterestGroups(scores, 3);
  const flat = isFlatProfile(scores);
  const childName = session.childName;
  const firstName = childName?.trim().split(/\s+/)[0] || "";
  const name = childName || "this student";
  const Possessive = childName ? `${childName}'s` : "The";

  // What's been paid for decides what this page is:
  //  - nothing (or only the ₹99 career list), Deep-Dive not finished: the
  //    snapshot - one next step, the free Deep-Dive, and no pricing table
  //  - same, Deep-Dive finished: the results-ready page - a partial reveal,
  //    the blurred report and the one ₹999 offer
  //  - the Complete Career Report or above: a hand-off into what was bought
  const ownedLevel = levelForTiers(session.selectedTiers);
  const purchased = hasDeepDive(session);
  const deepDiveDone = isDeepDiveComplete(session);
  const ownsMatchReport = ownedLevel >= 1;
  const view: "snapshot" | "ready" | "purchased" = purchased ? "purchased" : deepDiveDone ? "ready" : "snapshot";
  // The ₹99 career list is a fallback, never shown beside the main offer: only
  // when the follow-up message's link (/results?offer=list) is opened.
  const showFallback = searchParams.get("offer") === "list" && ownedLevel === 0;

  const videoSrc = RESULT_VIDEOS[resultVideoKey([ranked[0], ranked[1]], flat)];
  // What's actually been paid is the upgrade credit; until the server says,
  // the list price of what's owned is the best stand-in.
  const paidAmount = session.paidAmount ?? totalForLevel(ownedLevel);
  const reportPrice = priceAfterCredit(3, paidAmount);
  // Everything below the hydration gate renders only in the browser, so the
  // real origin is available for the share link.
  const sendToParentHref = session.sessionToken
    ? askParentWhatsAppUrl({
        parentMobile: session.parentMobile,
        childName,
        topLabels: [TYPE_SUMMARIES[ranked[0]].label, TYPE_SUMMARIES[ranked[1]].label],
        link: resultsLinkFor(session.sessionToken, window.location.origin),
        priceLabel: formatInr(reportPrice),
      })
    : undefined;

  function startDeepDive() {
    updateSession({ deepDiveStarted: true });
  }

  function openUnlockNow() {
    setUnlockNow(true);
    // After the offer has rendered
    window.setTimeout(() => document.getElementById("offer")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

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
   * Real Razorpay checkout for any plan. The server charges the upgrade
   * difference when something's already been paid (lib/pricing.ts's
   * priceAfterCredit), so the amount comes from the order it creates, never
   * from this page.
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

      // Internal QA testers - already marked paid server-side
      // (server/routes/checkout.ts), nothing to open or verify.
      let paymentId: string;
      if (order.bypassed) {
        paymentId = order.razorpayOrderId;
      } else {
        const Razorpay = window.Razorpay;
        if (!Razorpay) throw new Error("Checkout could not load. Please refresh and try again.");

        paymentId = await new Promise<string>((resolve, reject) => {
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
      }

      updateSession({
        selectedTiers: tiersForLevel(Math.max(level, ownedLevel) as TierLevel),
        orderId: paymentId,
        paidAmount: paidAmount + order.amount / 100,
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

  const checkoutErrorNote = checkoutError && (
    <p role="alert" className="mt-6 text-note text-err-700">
      {checkoutError}
    </p>
  );

  const unlockOffer = (
    <UnlockOffer
      childName={childName}
      paidAmount={paidAmount}
      busyLevel={busyLevel}
      onSelect={handleCheckout}
      sendToParentHref={sendToParentHref}
      headline={
        view === "ready"
          ? `Which stream should ${firstName || "this student"} choose? See ${firstName ? `${firstName}'s` : "the"} full plan.`
          : undefined
      }
    />
  );

  const fallbackOffer = showFallback && (
    <FallbackOffer
      childName={childName}
      busy={busyLevel === 1}
      disabled={busyLevel !== null}
      onSelect={() => handleCheckout(1)}
    />
  );

  const downloadButton = ownsMatchReport && justBought !== 1 && (
    <Button
      variant="secondary"
      size="lg"
      className="mt-6 w-full sm:w-auto"
      loading={downloading}
      loadingText="Preparing the PDF"
      onClick={() => downloadMatchReport(session.orderId)}
    >
      Download the Career Match Report
    </Button>
  );

  /** The interest result in words - the top three, the rest on a toggle */
  const interestSection = (
    <section className="mt-16">
      <h2 className="text-h2 font-semibold text-text">{getHeadline(scores, childName)}</h2>

      {flat && (
        <p className="mt-4 text-body text-text-secondary">
          No single type pulls ahead here, which is common and perfectly normal at this age. The highest are still
          worth a look, but treat them as leanings rather than a clear direction.
        </p>
      )}

      <InterestDetails scores={scores} />

      <p className="mt-8 border-l-2 border-hairline pl-5 text-body text-text-secondary">
        This describes what {name} is drawn to — not ability, and not a prediction of marks.
      </p>
    </section>
  );

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <SiteHeader />

      {/* Dark band: the result gets announced before it gets explained. */}
      <section className="grain relative overflow-hidden bg-ink-deep pb-32 text-white">
        <div className="relative z-10 mx-auto w-full max-w-2xl px-6 pt-14 sm:pt-20">
          <SpectrumRule className="w-24" />
          <p className="mt-8 text-note text-on-dark/70">
            {view === "snapshot" ? "Free interest snapshot" : view === "ready" ? "All tests done" : "Your plan"}
          </p>
          <h1 className="mt-3 text-h1 font-semibold text-white sm:text-display">
            {view === "ready" ? `${Possessive} results` : `${Possessive} interest snapshot`}
          </h1>

          <p aria-hidden="true" className="mt-9 flex flex-wrap items-baseline gap-3 font-display text-display font-semibold leading-none">
            {topGroups.map((group, i) => (
              <span key={i} className="flex items-baseline gap-1.5">
                {group.map((type, j) => (
                  <span key={type} className="flex items-baseline gap-1.5">
                    {j > 0 && <span className="text-h2 text-on-dark/60">=</span>}
                    <span style={{ color: RIASEC_COLORS[type] }}>{type}</span>
                  </span>
                ))}
              </span>
            ))}
          </p>
          <p className="mt-4 text-lead text-on-dark">Strongest interests: {describeTopInterests(scores, 3)}.</p>
        </div>
      </section>

      <main
        className={`relative z-20 mx-auto -mt-20 w-full max-w-2xl flex-1 px-6 ${view !== "purchased" ? "pb-36 sm:pb-16" : "pb-16"}`}
      >
        {/* ------------------------------------------- just paid: confirm */}
        {justBought === 1 && (
          <Card className="mb-6 border-ok-700/30 shadow-feature">
            <p className="text-note font-medium text-ok-700">Payment received</p>
            <h2 className="mt-2 text-h2 font-semibold text-text">{Possessive} career list is ready</h2>
            <p className="mt-2 text-body text-text-secondary">
              The Career Match Report has downloaded to this device, with every career match inside. Stream direction
              is unlocked below.
            </p>
            <Button
              variant="secondary"
              size="md"
              className="mt-5 w-full sm:w-auto"
              loading={downloading}
              loadingText="Preparing the PDF"
              onClick={() => downloadMatchReport(session.orderId)}
            >
              Download again
            </Button>
          </Card>
        )}

        {view === "ready" ? (
          <>
            {/* ---------- results-ready: reveal, blurred report, one offer --- */}
            <ResultsReady
              session={session}
              summary={careerSummary}
              onLockedClick={() => document.getElementById("offer")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
            <ReportPreview compact />
            {checkoutErrorNote}
            {unlockOffer}
            {fallbackOffer}

            <section className="mt-20 border-t border-hairline pt-14">
              <p className="text-note text-text-muted">For reference</p>
              <h2 className="mt-2 text-h2 font-semibold text-text">{Possessive} interest snapshot</h2>
              <Card className="mt-6">
                <RiasecRadarChart scores={scores} />
              </Card>
              {downloadButton}
            </section>
            {interestSection}
            {ownsMatchReport && <CareerGap scores={scores} childName={childName} unlocked />}
          </>
        ) : (
          <>
            {/* -------- chart: the one place motion happens in this product ---- */}
            <Card className="shadow-feature">
              <RiasecRadarChart scores={scores} animate />
            </Card>

            {/* Only appears once a video exists for this result - see
                lib/resultsPageConfig.ts's RESULT_VIDEOS. */}
            {videoSrc && (
              <ResultVideo
                src={videoSrc}
                caption={`${Possessive} result explained — ${TYPE_SUMMARIES[ranked[0]].label} + ${TYPE_SUMMARIES[ranked[1]].label}`}
              />
            )}

            {downloadButton}
            {interestSection}
            <CareerGap scores={scores} childName={childName} unlocked={ownsMatchReport} />

            {view === "snapshot" ? (
              <>
                {/* One main next step - no pricing table on the snapshot. */}
                <DeepDiveFree
                  session={session}
                  onStart={startDeepDive}
                  unlockPriceLabel={formatInr(reportPrice)}
                  onUnlockNow={openUnlockNow}
                />
                {checkoutErrorNote}
                {unlockNow && unlockOffer}
                {fallbackOffer}
              </>
            ) : (
              <>
                {checkoutErrorNote}
                {/* Once the plan is bought, this stops being a sales pitch -
                    what's needed is the next step in what was bought. */}
                <Card tone="feature" className="mt-16">
                  <p className="text-note text-brand-100/75">Plan confirmed</p>
                  <h2 className="mt-3 text-h2 font-semibold text-white">
                    {deepDiveDone ? `${Possessive} full report is ready` : "Next: the Deep-Dive Assessment"}
                  </h2>
                  <p className="mt-4 text-body text-brand-100">
                    {deepDiveDone
                      ? `The report matches ${name}'s full profile — interests, aptitude, behaviour and motivation — against career profiles, with entrance exams, courses and next steps for each.`
                      : `Three more quick tests — aptitude, behaviour and motivation. The full report needs all three before it can rank careers against ${name}'s whole profile, not interests alone.`}
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
                      ? "Included in the plan bought."
                      : "About ten minutes. Answers save as you go, so it's fine to stop and come back."}
                  </p>
                </Card>
                {/* Report + Counsellor, report ready: the counsellor_book WhatsApp
                    button lands here. */}
                {ownedLevel === 4 && deepDiveDone && (
                  <ConsultationScheduler
                    sessionToken={session.sessionToken}
                    parentName={session.parentName}
                    parentMobile={session.parentMobile}
                    childName={childName}
                  />
                )}
                {/* Still on the Complete Career Report: the counsellor upgrade stays
                    here - it's where the counsellor_offer WhatsApp button lands. */}
                {ownedLevel < 4 && (
                  <OfferCards
                    childName={childName}
                    ownedLevel={ownedLevel}
                    paidAmount={paidAmount}
                    busyLevel={busyLevel}
                    onSelect={handleCheckout}
                  />
                )}
              </>
            )}
          </>
        )}

        {SHOW_TRUST_SECTION && <TrustSection />}
        {SHOW_WEBINAR_SECTION && !purchased && <WebinarSection />}
      </main>

      <SiteFooter />

      {view === "snapshot" && (
        <StickyUnlockBar
          lockedSummary={`Next: ${name}'s Deep-Dive · 3 short tests, about 10 min`}
          unlockLabel="Continue to the Deep-Dive · free"
          onUnlock={() => {
            startDeepDive();
            router.push("/test");
          }}
          busy={false}
        />
      )}
      {view === "ready" && (
        <StickyUnlockBar
          lockedSummary={`🔒 ${Possessive} full career plan`}
          unlockLabel={`Unlock ${childName ? `${childName}'s` : "the"} plan · ${formatInr(reportPrice)}`}
          onUnlock={() => handleCheckout(3)}
          busy={busyLevel === 3}
        />
      )}
    </>
  );
}
