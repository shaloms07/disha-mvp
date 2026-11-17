import { FREE_CALL_URL } from "@/lib/resultsPageConfig";

/**
 * A secondary call to action on the paywall: a free 10-minute call to go
 * through the results. Hidden unless NEXT_PUBLIC_FREE_CALL_URL is set
 * (lib/resultsPageConfig.ts).
 */
export function FreeCallCta({ childName, onTap }: { childName?: string; onTap?: () => void }) {
  if (!FREE_CALL_URL) return null;
  const possessive = childName ? `${childName}'s` : "the";
  return (
    <p className="mt-6 text-center">
      <a
        href={FREE_CALL_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onTap}
        className="inline-flex min-h-11 items-center text-body font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
      >
        Book a free 10-min call to understand {possessive} results
      </a>
    </p>
  );
}
