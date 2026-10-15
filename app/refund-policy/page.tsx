import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Refund Policy — My Life Coach" };

export default function RefundPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
        <h1 className="text-h1 font-semibold text-text">Refund Policy</h1>
        <p className="mt-3 text-note text-text-muted">Last updated 15 October 2026</p>

        <Card className="mt-8 space-y-6 text-body leading-relaxed text-text-secondary">
          <section>
            <p>
              The 36-question interest test and its free snapshot result
              never require payment, so there is nothing to refund for them.
            </p>
          </section>
          <section>
            <p>
              Paid add-ons — the Detailed Report, the Roadmap, and the 1:1
              Consultation — are not yet available for online purchase. Once
              they are, this page will set out exactly when a refund can be
              requested and how, before any payment is accepted.
            </p>
          </section>
          <section>
            <h2 className="text-h3 font-semibold text-text">Questions</h2>
            <p className="mt-2">
              If you believe you were charged in error, contact support (see
              the footer) and we&apos;ll look into it.
            </p>
          </section>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
