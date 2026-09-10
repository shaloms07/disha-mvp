import { cn } from "@/lib/cn";

/**
 * Replaces the tracked-out uppercase eyebrow that used to sit above each
 * funnel heading. Sentence case, with a rule that actually shows progress.
 */
export function StepIndicator({
  step,
  total,
  label,
  className,
}: {
  step: number;
  total: number;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        aria-hidden="true"
        className="flex items-center gap-1.5"
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "block h-0.5 rounded-full transition-colors",
              i < step ? "w-7 bg-brand-700" : "w-4 bg-hairline",
            )}
          />
        ))}
      </div>
      <p className="text-note text-text-muted">
        <span className="sr-only">
          Step {step} of {total}:{" "}
        </span>
        {label}
      </p>
    </div>
  );
}
