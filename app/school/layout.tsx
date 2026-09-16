import type { Metadata } from "next";
import Link from "next/link";
import { RoleSwitcher } from "@/components/school/RoleSwitcher";
import { RoleProvider } from "@/lib/school/RoleContext";
import { SCHOOL } from "@/lib/school/schoolCode";

export const metadata: Metadata = {
  title: "DISHA for Schools — admin",
  description:
    "School-side dashboards for tracking assessment completion and reading results across classes.",
};

/**
 * The /school shell.
 *
 * Deliberately not a continuation of the consumer funnel: a dark utility bar
 * instead of the marketing header, a wide dense canvas instead of the narrow
 * reading column, and no step indicator, footer or CTA. Same tokens and type
 * scale throughout — this is staff software built out of the same system, not
 * a second design language.
 *
 * The role switcher lands in the bar to the right of the school name.
 */
export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProvider>
      <div className="flex min-h-full flex-1 flex-col bg-bone">
      <header className="bg-brand-800 text-on-dark print:hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3.5 sm:px-8">
          <div className="flex items-baseline gap-3">
            <Link
              href="/"
              className="font-display text-h3 font-semibold tracking-tight text-white"
            >
              DISHA
            </Link>
            <span className="rounded-full border border-white/25 px-2 py-0.5 text-note text-on-dark/80">
              Schools
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-note">
            <span className="hidden text-on-dark/80 lg:inline">
              {SCHOOL.name}
              <span className="ml-2 text-on-dark/50">{SCHOOL.board}</span>
            </span>
            <RoleSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10 print:max-w-none print:p-0">
        {children}
      </main>

      <footer className="border-t border-hairline print:hidden">
        <div className="mx-auto w-full max-w-7xl px-5 py-5 text-note text-text-muted sm:px-8">
          Frontend-only demo build. Every figure comes from sample data held in
          this browser, no student record leaves the page, and the role views
          are a UX simulation rather than enforced access control.
        </div>
        </footer>
      </div>
    </RoleProvider>
  );
}
