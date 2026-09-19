import { cn } from "@/lib/cn";

/**
 * One score against its own ceiling, as a ring.
 *
 * A meter rather than a pie: these are three separate ratios, not three slices
 * of one whole, and the domains have different maximums (6, 5 and 4), so
 * anything that implied they added up to something would be wrong. Sequential
 * encoding, one hue on a sunk track, and the value is printed in the middle —
 * the ring is the quick read, the number is the actual answer.
 */
export function RadialMeter({
  value,
  max,
  label,
  caption,
  size = 78,
  className,
}: {
  value: number;
  max: number;
  label: string;
  /** Overrides the default "value/max" in the middle */
  caption?: string;
  size?: number;
  className?: string;
}) {
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <div className={cn("flex flex-col items-center gap-2.5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
          /* Start the arc at 12 o'clock rather than 3. */
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-surface-sunk"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * ratio} ${circumference}`}
            className="stroke-brand-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-note tabular-nums text-text">
          {caption ?? `${value}/${max}`}
        </span>
      </div>
      <span className="text-center text-note text-text-secondary">{label}</span>
    </div>
  );
}
