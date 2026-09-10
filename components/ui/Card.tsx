import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * Cards are differentiated by what they hold, not styled uniformly.
 *
 *  quiet    — supporting information. Hairline only, sits on the page ground.
 *  standard — the main content of a screen. Raised surface, soft shadow.
 *  feature  — the one thing we want looked at. Dark petrol, deeply raised.
 *             At most one per screen.
 */
type Tone = "quiet" | "standard" | "feature";

const TONES: Record<Tone, string> = {
  quiet: "border border-hairline bg-transparent rounded-xl",
  standard: "border border-hairline bg-surface shadow-card rounded-xl",
  feature: "bg-brand-800 text-white shadow-feature rounded-2xl",
};

const PADDING: Record<Tone, string> = {
  quiet: "p-5",
  standard: "p-6 sm:p-7",
  feature: "p-7 sm:p-9",
};

interface CardProps extends ComponentProps<"div"> {
  tone?: Tone;
  /** Opt out of the tone's default padding */
  flush?: boolean;
}

export function Card({
  tone = "standard",
  flush = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cn(TONES[tone], !flush && PADDING[tone], className)}
    />
  );
}

export function SectionHeading({
  title,
  intro,
  className,
}: {
  title: string;
  intro?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2 className="text-h2 font-semibold text-text">{title}</h2>
      {intro && (
        <p className="mt-3 text-lead text-text-secondary">{intro}</p>
      )}
    </div>
  );
}
