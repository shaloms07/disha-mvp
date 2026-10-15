import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Privacy Policy — My Life Coach" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
        <h1 className="text-h1 font-semibold text-text">Privacy Policy</h1>
        <p className="mt-3 text-note text-text-muted">Last updated 15 October 2026</p>

        <Card className="mt-8 space-y-6 text-body leading-relaxed text-text-secondary">
          <section>
            <h2 className="text-h3 font-semibold text-text">What we collect</h2>
            <p className="mt-2">
              When you register, we collect the parent or guardian&apos;s name
              and mobile number, and the child&apos;s name and class. Once the
              test is taken, we store the answers given and the scores
              calculated from them.
            </p>
          </section>

          <section>
            <h2 className="text-h3 font-semibold text-text">Why we collect it</h2>
            <p className="mt-2">
              Only to run the assessment, verify it&apos;s really you via a
              one-time code, deliver the test link and the result to you, and
              to follow up about your child&apos;s results if you&apos;ve
              asked for that. We do not use this information for anything
              else, and we do not sell it to anyone.
            </p>
          </section>

          <section>
            <h2 className="text-h3 font-semibold text-text">Who can see it</h2>
            <p className="mt-2">
              Only our own team. We share your mobile number with the SMS and
              WhatsApp providers we use to deliver the one-time code, the test
              link, and your result — strictly to deliver those messages, not
              for their own use. If we ever use ad or analytics tools, we only
              ever send a one-way, irreversible hash of your mobile number for
              matching, and we never send your child&apos;s name, answers, or
              scores to any advertising platform.
            </p>
          </section>

          <section>
            <h2 className="text-h3 font-semibold text-text">Children&apos;s data</h2>
            <p className="mt-2">
              This assessment is taken by a child, but the account
              relationship is with the parent or legal guardian who registers
              and gives consent. We collect only what&apos;s needed to run the
              test and share the result with that parent or guardian, and we
              don&apos;t use a child&apos;s data for marketing.
            </p>
          </section>

          <section>
            <h2 className="text-h3 font-semibold text-text">How long we keep it</h2>
            <p className="mt-2">
              We keep your details and your child&apos;s answers for as long
              as your account is active, so you and your child can return to
              a result later. You can ask us to delete it at any time — see
              Contact below.
            </p>
          </section>

          <section>
            <h2 className="text-h3 font-semibold text-text">Your rights</h2>
            <p className="mt-2">
              You can ask us what we hold about you or your child, ask us to
              correct it, or ask us to delete it, by contacting support (see
              the footer for how to reach us).
            </p>
          </section>

          <section>
            <h2 className="text-h3 font-semibold text-text">Changes to this policy</h2>
            <p className="mt-2">
              If this policy changes, we&apos;ll update the date at the top of
              this page.
            </p>
          </section>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
