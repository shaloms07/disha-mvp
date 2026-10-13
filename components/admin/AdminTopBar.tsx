import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

/**
 * A plain brand header for /admin - deliberately NOT SiteHeader, which
 * carries AuthNav (the parent-facing "Sign in" link). That's unrelated to
 * admin auth and showed up confusingly alongside the admin "Sign out" button.
 */
export function AdminTopBar() {
  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2.5 px-6 py-5">
        <Link href="/admin" className="flex items-baseline gap-2.5">
          <Wordmark />
        </Link>
        <span className="text-note text-text-muted">Admin</span>
      </div>
    </header>
  );
}
