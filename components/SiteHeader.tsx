import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

/** Wordmark, and on the landing page a single quiet CTA. */
export function SiteHeader({ showCta = false }: { showCta?: boolean }) {
  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className="group flex items-baseline gap-2.5">
          <span className="font-display text-h3 font-semibold tracking-tight text-brand-800">
            DISHA
          </span>
          <span className="hidden text-note text-text-muted sm:inline">
            Career interest assessment
          </span>
        </Link>
        {showCta && (
          <ButtonLink href="/register" variant="secondary" size="sm">
            Start free test
          </ButtonLink>
        )}
      </div>
    </header>
  );
}
