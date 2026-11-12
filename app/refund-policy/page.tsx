import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/Card";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata = { title: "Refund Policy — My Life Coach" };

// DRAFT (12 Nov 2026) - pending team/legal review before it's final. The
// landing FAQ (app/page.tsx) repeats it in one line - change both together.
export default function RefundPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
        <h1 className="text-h1 font-semibold text-text">Refund Policy</h1>
        <p className="mt-3 text-note text-text-muted">Last updated 12 November 2026</p>

        <Card className="mt-8 space-y-6 text-body leading-relaxed text-text-secondary">
          <section>
            <p>
              The interest test, its snapshot and the Deep-Dive tests are free
              to take, so there is nothing to refund for them. Only reports and
              counsellor calls are paid.
            </p>
          </section>
          <section>
            <h2 className="text-h3 font-semibold text-text">Reports</h2>
            <p className="mt-2">
              If you&apos;re not satisfied with the report, you can have a full
              refund within 7 days of payment.
            </p>
          </section>
          <section>
            <h2 className="text-h3 font-semibold text-text">Counsellor calls</h2>
            <p className="mt-2">
              A counsellor call that hasn&apos;t taken place yet can be refunded
              at any time.
            </p>
          </section>
          <section>
            <h2 className="text-h3 font-semibold text-text">How to request one</h2>
            <p className="mt-2">
              Email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-700 underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              with your payment ID, shown on your confirmation screen after
              checkout. Refunds go back to your original payment method and take
              5–7 business days.
            </p>
          </section>
          <section>
            <h2 className="text-h3 font-semibold text-text">Questions</h2>
            <p className="mt-2">
              If you believe you were charged in error, email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-700 underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              and we&apos;ll look into it.
            </p>
          </section>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
