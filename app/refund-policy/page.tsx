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
        <p className="mt-3 text-note text-text-muted">Last updated 24 October 2026</p>

        <Card className="mt-8 space-y-6 text-body leading-relaxed text-text-secondary">
          <section>
            <p>
              The 36-question interest test and its free snapshot result never
              require payment, so there is nothing to refund for them.
            </p>
          </section>
          <section>
            <h2 className="text-h3 font-semibold text-text">Paid add-ons</h2>
            <p className="mt-2">
              If you request a refund before your child has started the
              Deep-Dive Assessment (Aptitude, Behavioral and Work Values), we
              will refund the full amount paid.
            </p>
            <p className="mt-2">
              Once the Deep-Dive Assessment has been started, the purchase is
              non-refundable, since the paid content has already been
              delivered.
            </p>
            <p className="mt-2">
              If a 1:1 Consultation call was purchased and has not yet taken
              place, that portion can be refunded separately on request, even
              if the Deep-Dive Assessment itself has already been completed.
            </p>
          </section>
          <section>
            <h2 className="text-h3 font-semibold text-text">How to request one</h2>
            <p className="mt-2">
              Contact support (see the footer) with your payment ID, shown on
              your confirmation screen after checkout. Approved refunds are
              processed back to your original payment method and can take a
              few business days to appear, depending on your bank.
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
