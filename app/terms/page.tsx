import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Terms of Service — My Life Coach" };

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
        <h1 className="text-h1 font-semibold text-text">Terms of Service</h1>
        <p className="mt-3 text-note text-text-muted">Last updated 15 October 2026</p>

        <Card className="mt-8 space-y-6 text-body leading-relaxed text-text-secondary">
          <section>
            <h2 className="text-h3 font-semibold text-text">What this service is</h2>
            <p className="mt-2">
              My Life Coach is a career-interest assessment for students in
              Classes 8 to 12, built on Holland&apos;s RIASEC model. It
              describes what a child is drawn to — it is not an ability test,
              not a prediction of academic performance, and not a substitute
              for professional educational or psychological advice.
            </p>
          </section>

          <section>
            <h2 className="text-h3 font-semibold text-text">Who can register</h2>
            <p className="mt-2">
              You must be the parent or legal guardian of the child taking
              the test to register them. By registering, you confirm that and
              agree that the information you provide is accurate.
            </p>
          </section>

          <section>
            <h2 className="text-h3 font-semibold text-text">Free and paid parts of the service</h2>
            <p className="mt-2">
              The 36-question interest test and its snapshot result are free.
              A more detailed report and a 1:1 consultation with a counsellor
              are optional paid add-ons. Where a paid add-on isn&apos;t yet
              available for purchase, this will be shown clearly rather than
              taking a payment for something not yet live.
            </p>
          </section>

          <section>
            <h2 className="text-h3 font-semibold text-text">Acceptable use</h2>
            <p className="mt-2">
              Use this service only to assess your own child or ward. Don&apos;t
              attempt to access another family&apos;s results, disrupt the
              service, or use it for any unlawful purpose.
            </p>
          </section>

          <section>
            <h2 className="text-h3 font-semibold text-text">No guarantee of outcome</h2>
            <p className="mt-2">
              The result reflects what your child answered at the time of the
              test. It is one input among many for a career or stream
              decision, not a guarantee of fit, admission, or success in any
              field.
            </p>
          </section>

          <section>
            <h2 className="text-h3 font-semibold text-text">Changes to these terms</h2>
            <p className="mt-2">
              If these terms change, we&apos;ll update the date at the top of
              this page. Continuing to use the service after a change means
              you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-h3 font-semibold text-text">Governing law</h2>
            <p className="mt-2">
              These terms are governed by the laws of India.
            </p>
          </section>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
