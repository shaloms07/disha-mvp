"use client";

import { useEffect } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * Catches an unhandled exception anywhere below the root layout (/register,
 * /resume, /results, /pricing included) and shows branded copy instead of
 * Next.js's default error page. Must be a Client Component - this is a
 * framework requirement for error.tsx, not a choice made here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-20 text-center">
        <h1 className="text-h1 font-semibold text-text">
          Something went wrong
        </h1>
        <p className="mt-4 text-lead text-text-secondary">
          That wasn&apos;t supposed to happen. Try again, or head back home.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button variant="accent" size="lg" onClick={() => reset()}>
            Try again
          </Button>
          <ButtonLink href="/" variant="quiet" size="lg">
            Go home
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
