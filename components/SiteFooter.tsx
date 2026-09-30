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
          assessment and get in touch about the results. No payment is taken,
          and paid add-ons on this demo build are not real purchases.
        </p>
      </div>
    </footer>
  );
}
