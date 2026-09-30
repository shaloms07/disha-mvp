import { cn } from "@/lib/cn";

/**
 * The MyLifeCoach wordmark. White on the dark petrol/ink fields; brand petrol
 * on light grounds, where white would disappear.
 */
export function Wordmark({
  onDark = false,
  className,
}: {
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-display text-[1.875rem] leading-tight font-medium tracking-tight",
        onDark ? "text-white" : "text-brand-800",
        className,
      )}
    >
      MyLifeCoach
    </span>
  );
}
