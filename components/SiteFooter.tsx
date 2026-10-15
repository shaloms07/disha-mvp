import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-brand-800 px-6 py-14 text-white">
      <div className="mx-auto w-full max-w-5xl">
        <p>
          <Wordmark onDark />
        </p>
        <p className="mt-3 max-w-md text-body text-brand-100">
          A career interest assessment for students in Classes 8-12, based on
          Holland&apos;s RIASEC model.
        </p>
        <p className="mt-8 max-w-md border-t border-white/15 pt-6 text-note text-brand-100/75">
          Your registration details and test answers are stored to run this
          assessment and get in touch about the results.
        </p>

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-note text-brand-100/90">
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="underline-offset-2 hover:underline">
            Terms
          </Link>
          <Link href="/refund-policy" className="underline-offset-2 hover:underline">
            Refund Policy
          </Link>
        </div>

        <p className="mt-6 text-note text-brand-100/75">
          Social-Impact Innovations Pvt Ltd
          <br />
          Support:{" "}
          <a href="mailto:contact@social-impact.in" className="underline-offset-2 hover:underline">
            contact@social-impact.in
          </a>
        </p>
        <p className="mt-4 text-note text-brand-100/75">
          Powered by Social-Impact Innovations PVT LTD
        </p>
      </div>
    </footer>
  );
}
