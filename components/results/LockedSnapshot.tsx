import { BlurredSection, LockedRow } from "@/components/results/Locked";

/**
 * SNAPSHOT_V2's free interest snapshot, below the unlabelled radar chart:
 * what the result means stays locked. No interest names, descriptions,
 * stream lean or careers - only blurred placeholders and one locked row,
 * so the decision is what the report sells.
 */
export function LockedSnapshot({ childName, onLockedClick }: { childName?: string; onLockedClick: () => void }) {
  const firstName = childName?.trim().split(/\s+/)[0] || "";
  const possessive = firstName ? `${firstName}'s` : "these";

  return (
    <section className="mt-12" aria-labelledby="locked-snapshot-heading">
      <h2 id="locked-snapshot-heading" className="text-h2 font-semibold text-text">
        What this means for {possessive} careers
      </h2>
      <p className="mt-3 text-body text-text-secondary">
        Interests alone can point to the wrong career. The Deep-Dive checks them against aptitude, behaviour and
        motivation.
      </p>
      <ul className="mt-6 space-y-2">
        <LockedRow label={`What this means for ${possessive} careers`} onClick={onLockedClick} />
      </ul>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <BlurredSection title="Strongest interests" />
        <BlurredSection title="Stream lean" rows={["xxxxxxx", "xxxxx xxxx xxxxx"]} />
        <BlurredSection title="Career matches" />
      </div>
    </section>
  );
}
