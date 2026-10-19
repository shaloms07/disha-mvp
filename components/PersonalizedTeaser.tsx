import { getTopMatches } from "@/lib/matching";
import type { RiasecType } from "@/types";

/**
 * A real, computed top career match (lib/matching.ts, not placeholder copy)
 * shown openly, with the rest of the ranked list blurred - the same trick
 * app/page.tsx's sample section uses on a fake profile, but here it's the
 * child's actual result. Shared between the inline upsell section and
 * DownloadUpsellModal so the two don't drift out of sync.
 */
export function PersonalizedTeaser({
  scores,
  childName,
}: {
  scores: Record<RiasecType, number>;
  childName?: string;
}) {
  const [top] = getTopMatches(scores, 1);
  if (!top) return null;

  return (
    <div className="rounded-lg border border-hairline bg-brand-50 p-5">
      <p className="text-note font-medium text-brand-800">
        Based on {childName || "your child"}&apos;s result
      </p>
      <p className="mt-2 text-lead font-semibold text-text">{top.career.title}</p>
      <p className="mt-1 text-note text-text-secondary">{top.stars}/10 match</p>

      <div aria-hidden="true" className="mt-4 select-none space-y-2 blur-[3px]">
        <div className="h-2.5 w-11/12 rounded-full bg-brand-700/20" />
        <div className="h-2.5 w-9/12 rounded-full bg-brand-700/15" />
      </div>
      <p className="mt-3 text-note text-text-muted">
        +2 more ranked matches in the full report
      </p>
    </div>
  );
}
