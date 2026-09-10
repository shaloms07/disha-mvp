import { cn } from "@/lib/cn";

/**
 * The 1-10 match rating from lib/matching.ts, drawn as a segmented meter
 * rather than star glyphs — quieter, and it reads as a measurement.
 */
export function StarRating({
  stars,
  max = 10,
  className,
}: {
  stars: number;
  max?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span aria-hidden="true" className="inline-flex gap-[3px]">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={cn(
              "block h-3 w-1 rounded-full",
              i < stars ? "bg-brand-700" : "bg-hairline",
            )}
          />
        ))}
      </span>
      <span className="font-mono text-note tabular-nums text-text-secondary">
        {stars}/{max}
      </span>
      <span className="sr-only">
        Match rating {stars} out of {max}
      </span>
    </span>
  );
}
