"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RIASEC_COLORS, RiasecRadarChart } from "@/components/RiasecRadarChart";
import { SpectrumRule } from "@/components/ui/Spectrum";
import { DownloadUpsellModal } from "@/components/DownloadUpsellModal";
import { InterestModal } from "@/components/InterestModal";
import { PersonalizedTeaser } from "@/components/PersonalizedTeaser";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UpsellTierCard } from "@/components/UpsellTierCard";
import { useSession } from "@/lib/context/SessionContext";
import {
  createCheckoutOrder,
  registerReportInterest,
  verifyCheckoutPayment,
} from "@/lib/api/realSession";
import { TYPE_SUMMARIES, getHeadline, isFlatProfile } from "@/lib/interpretation";
import { downloadPdfDocument, slugForFilename } from "@/lib/pdf/download";
import { buildInterestReportData } from "@/lib/pdf/interestReportData";
import { InterestReportDocument } from "@/lib/pdf/InterestReportDocument";
import { formatInr, PRICING, TIER_OPTIONS, type TierLevel } from "@/lib/pricing";
import {
  MAX_TYPE_SCORE,
  getAnsweredCount,
  isTestComplete,
  rankTypes,
  scoreResponses,
} from "@/lib/scoring";
import { hasDeepDive, isDeepDiveComplete } from "@/lib/testModules";

/** The Deep-Dive ladder only - the ₹199 Download Report tier has its own
 *  direct-buy button above (handleDownload), so it doesn't belong in this
 *  "tell us you're interested" lead-capture grid too. */
const DEEP_DIVE_TIER_OPTIONS = TIER_OPTIONS.filter((option) => option.level >= 2);

export default function ResultsPage() {
  const router = useRouter();
  const { session, hydrated, updateSession } = useSession();
  const [submittingTier, setSubmittingTier] = useState<TierLevel | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierLevel | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string>();

  async function handleSelectTier(level: Exclude<TierLevel, 0>) {
    if (submittingTier || selectedTier || !session.sessionToken) return;
    setDownloadModalOpen(false);
    setSubmittingTier(level);
    try {
      await registerReportInterest(session.sessionToken, level);
    } catch {
      // The modal still confirms — a parent's click shouldn't hinge on this
      // one request; server/API logs remain the source of truth for follow-up.
    }
    setSubmittingTier(null);
    setSelectedTier(level);
    setModalOpen(true);
  }

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
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14 sm:py-20">
          <h1 className="text-h1 font-semibold text-text">No results yet</h1>
          <p className="mt-4 text-lead text-text-secondary">
            {answered > 0
              ? `The test is ${answered} of 36 questions in. Finish it and the snapshot appears here.`
              : "Once the 36 questions are answered, the interest snapshot appears here."}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/test" size="lg" className="w-full sm:w-auto">
              {answered > 0 ? "Resume the test" : "Go to the test"}
            </ButtonLink>
            <ButtonLink
              href="/register"
              variant="quiet"
              size="lg"
              className="w-full sm:w-auto"
            >
              Start over
            </ButtonLink>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const ranked = rankTypes(scores);
  const flat = isFlatProfile(scores);
  const childName = session.childName;

  // A bought plan changes what this page is for: the snapshot stays, the
  // sales pitch below it becomes a hand-off into what was paid for.
  const purchased = hasDeepDive(session);
  const deepDiveDone = isDeepDiveComplete(session);

  // The complete report PDF is a ₹199 purchase (lib/pricing.ts's level 1) -
  // unless this session already owns it outright or owns the Deep-Dive
  // (which includes it), payment happens first and the download only fires
  // after a verified success. The upsell modal that follows only makes sense
  // for someone who hasn't already bought the Deep-Dive.
  const alreadyOwnsReport = session.selectedTiers.reportPdf || session.selectedTiers.detailedReport;

  async function handleDownload() {
    if (!scores || !session.sessionToken) return;
    const sessionToken = session.sessionToken;

    setCheckoutError(undefined);
    setDownloading(true);
    try {
      let orderIdForReport = session.orderId;
      if (!alreadyOwnsReport) {
        const order = await createCheckoutOrder(sessionToken, 1);
        const Razorpay = window.Razorpay;
        if (!Razorpay) {
          throw new Error("Checkout could not load. Please refresh and try again.");
        }

        const paymentId = await new Promise<string>((resolve, reject) => {
          const checkout = new Razorpay({
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            order_id: order.razorpayOrderId,
            name: "My Life Coach",
            description: "Download Report",
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
          selectedTiers: { ...session.selectedTiers, reportPdf: true },
          orderId: paymentId,
        });
        orderIdForReport = paymentId;
      }

      const data = buildInterestReportData({ childName: childName || "Student", orderId: orderIdForReport, scores });
      await downloadPdfDocument(<InterestReportDocument data={data} />, `${slugForFilename(childName || "my-life-coach")}-interest-report.pdf`);
      if (!purchased) setDownloadModalOpen(true);
    } catch (error) {
      if (!(error instanceof Error && error.message === "dismissed")) {
        setCheckoutError(
          error instanceof Error ? error.message : "Payment failed. Please try again.",
        );
      }
    } finally {
      setDownloading(false);
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
            {childName
              ? `${childName}'s interest snapshot`
              : "Interest snapshot"}
          </h1>

          <p
            aria-hidden="true"
            className="mt-9 flex gap-3 font-display text-display font-semibold leading-none"
          >
            {ranked.slice(0, 3).map((type) => (
              <span key={type} style={{ color: RIASEC_COLORS[type] }}>
                {type}
              </span>
            ))}
          </p>
          <p className="mt-4 text-lead text-on-dark">
            Strongest three, in order, from all 36 picks.
          </p>
        </div>
      </section>

      <main className="relative z-20 mx-auto -mt-20 w-full max-w-2xl flex-1 px-6 pb-16">
        {/* -------- chart: the one place motion happens in this product ---- */}
        <Card className="shadow-feature">
          <RiasecRadarChart scores={scores} animate />
        </Card>

        <Button
          variant="secondary"
          size="lg"
          className="mt-6 w-full sm:w-auto"
          onClick={handleDownload}
          loading={downloading}
          loadingText={alreadyOwnsReport ? "Preparing your PDF" : "Opening checkout"}
        >
          {alreadyOwnsReport
            ? "Download your result"
            : `Download your result · ${formatInr(PRICING.reportPdf)}`}
        </Button>

        {checkoutError && (
          <p role="alert" className="mt-3 text-note text-err-700">
            {checkoutError}
          </p>
        )}

        {/* ------------------------------------------------ what stands out */}
        <section className="mt-16">
          <h2 className="text-h2 font-semibold text-text">
            {getHeadline(scores, childName)}
          </h2>

          {flat && (
            <p className="mt-4 text-body text-text-secondary">
              No single type pulls ahead here, which is common and perfectly
              normal at this age. The three highest are still worth a look, but
              treat them as leanings rather than a clear direction.
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

                  <p className="mt-4 text-lead font-medium text-text">
                    {summary.headline}
                  </p>
                  <p className="mt-3 text-body leading-relaxed text-text-secondary">
                    {summary.blurb}
                  </p>
                  <p className="mt-4 text-note text-text-muted">
                    Shows up as: {summary.examples}
                  </p>
                </article>
              );
            })}
          </div>

          <p className="mt-8 border-l-2 border-hairline pl-5 text-body text-text-secondary">
            This describes what {childName || "your child"} is drawn to — not
            how capable they are, and not a prediction of marks.
          </p>
        </section>

        {/* ------------------------------------------------------------ cta
            Once a plan is bought, this stops being a sales pitch. Re-offering
            "See report options" to someone who has already paid reads as a
            second charge; what they need is the next step in what they bought. */}
        {purchased ? (
          <Card tone="feature" className="mt-16">
            <p className="text-note text-brand-100/75">Plan confirmed</p>
            <h2 className="mt-3 text-h2 font-semibold text-white">
              {deepDiveDone
                ? "Your full report is ready"
                : "Next: the Deep-Dive Assessment"}
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
          // Real paid checkout doesn't exist yet - this is lead capture, not
          // a cart: picking a tier saves the interest (POST
          // /session/:token/interest) for the team to follow up manually,
          // rather than taking payment.
          <section className="mt-16">
            <h2 className="text-h2 font-semibold text-text">
              Interested in more for {childName || "your child"}?
            </h2>
            <p className="mt-4 text-body text-text-secondary">
              Pick the option you&apos;d like to know more about — we&apos;ll
              call within 24 hours.
            </p>

            <div className="mt-8 max-w-md">
              <PersonalizedTeaser scores={scores} childName={childName} />
            </div>

            <div className="mt-9 grid gap-6 sm:grid-cols-3">
              {DEEP_DIVE_TIER_OPTIONS.map((option) => (
                <UpsellTierCard
                  key={option.level}
                  option={option}
                  onSelect={() => handleSelectTier(option.level)}
                  submitting={submittingTier === option.level}
                  disabled={Boolean(selectedTier)}
                />
              ))}
            </div>
          </section>
        )}

        {downloadModalOpen && (
          <DownloadUpsellModal
            scores={scores}
            childName={childName}
            onSelectTier={handleSelectTier}
            submittingTier={submittingTier}
            selectedTier={selectedTier}
            onClose={() => setDownloadModalOpen(false)}
          />
        )}

        {modalOpen && <InterestModal onClose={() => router.push("/wards")} />}
      </main>

      <SiteFooter />
    </>
  );
}
