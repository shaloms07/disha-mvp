import { RIASEC_COLORS } from "@/components/RiasecRadarChart";
import type { RiasecType } from "@/types";

/**
 * SNAPSHOT_V2's free interest snapshot, below the unlabelled radar chart.
 * The child sees their three Holland letters (in the hero) as a cue; what
 * the letters mean is what the paid plans sell. This is the short bridge
 * into the three steps that follow on the page:
 *   1. the ₹99 career list (FallbackOffer, variant "entry")
 *   2. why interests alone aren't enough - the free Deep-Dive (WhyDeepDive
 *      + DeepDiveFree)
 *   3. the Complete Career Report (UnlockOffer)
 *
 * No interest names, stream lean or careers here - only the letters.
 */
export function LockedSnapshot({ childName, letters }: { childName?: string; letters: RiasecType[] }) {
  const firstName = childName?.trim().split(/\s+/)[0] || "";
  const name = firstName || "this student";

  return (
    <section className="mt-12" aria-labelledby="locked-snapshot-heading">
      <p className="text-note font-medium text-text-muted">What&apos;s next</p>
      <h2 id="locked-snapshot-heading" className="mt-2 text-h2 font-semibold text-text">
        {letters.map((type) => (
          <span key={type} style={{ color: RIASEC_COLORS[type] }}>
            {type}
          </span>
        ))}{" "}
        is just the start.
      </h2>
      <p className="mt-3 text-body text-text-secondary">
        Here&apos;s how to turn these three letters into a real plan for {name} — in three steps.
      </p>
    </section>
  );
}
