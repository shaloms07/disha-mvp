import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RIASEC_COLORS } from "@/components/RiasecRadarChart";
import { lockedStreamRow } from "@/lib/offerCopy";
import type { RiasecType } from "@/types";

/**
 * SNAPSHOT_V2's free interest snapshot, below the unlabelled radar chart.
 * The child sees their three Holland letters (in the hero) as a cue; what
 * the letters mean, and what they mean for careers, is what the report
 * sells - so this section lists what unlocking gets, not blurred filler.
 *
 * No interest names, stream lean or careers here - only the letters the hero
 * already shows. Careers are ranked on interests; the Deep-Dive explains each
 * fit - never claim they're matched on ability.
 */
export function LockedSnapshot({
  childName,
  childClass,
  letters,
  priceLabel,
  onUnlock,
}: {
  childName?: string;
  childClass?: string;
  /** The hero's letters, strongest first */
  letters: RiasecType[];
  /** The Complete Career Report's price for this session, from lib/pricing.ts */
  priceLabel: string;
  onUnlock: () => void;
}) {
  const firstName = childName?.trim().split(/\s+/)[0] || "";
  const name = firstName || "this student";
  const possessive = firstName ? `${firstName}'s` : "the";
  const code = letters.join("");
  const letterList =
    letters.length > 1 ? `${letters.slice(0, -1).join(", ")} and ${letters[letters.length - 1]}` : letters.join("");

  const benefits: { icon: string; title: string; body: string }[] = [
    {
      icon: "🔤",
      title: `What ${letterList} mean for ${name}`,
      body: "The interest behind each letter, how strong it is, and what it says about the work that suits them.",
    },
    {
      icon: "🏆",
      title: `Careers ranked for ${name}`,
      body: `Every career ranked by how well it fits ${code} — with the reasons, not just a list.`,
    },
    {
      icon: "🧭",
      title: lockedStreamRow(childClass),
      body: `Clear advice for ${name}'s next decision, based on these results.`,
    },
    {
      icon: "🧠",
      title: "Aptitude, behaviour and motivation",
      body: `Interests alone can point to the wrong career. The Deep-Dive checks each fit against how ${name} thinks, works and what drives them.`,
    },
    {
      icon: "🗺️",
      title: "A step-by-step roadmap",
      body: "Entrance exams, courses and next steps for the top careers.",
    },
  ];

  return (
    <section className="mt-12" aria-labelledby="locked-snapshot-heading">
      <p className="text-note font-medium text-text-muted">Unlock the full picture</p>
      <h2 id="locked-snapshot-heading" className="mt-2 text-h2 font-semibold text-text">
        {letters.map((type) => (
          <span key={type} style={{ color: RIASEC_COLORS[type] }}>
            {type}
          </span>
        ))}{" "}
        is just the start. Here&apos;s what {possessive} full report unlocks.
      </h2>

      <Card className="mt-6">
        <ul className="divide-y divide-hairline">
          {benefits.map((benefit) => (
            <li key={benefit.title} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <span aria-hidden="true" className="mt-0.5 text-lead leading-none">
                {benefit.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-start gap-2 font-medium text-text">
                  <span>{benefit.title}</span>
                  <span aria-label="Locked" className="ml-auto shrink-0 text-note">
                    🔒
                  </span>
                </p>
                <p className="mt-1 text-body text-text-secondary">{benefit.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <Button size="lg" className="mt-6 w-full" onClick={onUnlock}>
          <span>
            Unlock full report <span className="whitespace-nowrap">· {priceLabel}</span>
          </span>
        </Button>
      </Card>
    </section>
  );
}
