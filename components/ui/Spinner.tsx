import { cn } from "@/lib/cn";

/**
 * Inline loading indicator, shown while a lib/mockApi call is in flight.
 */
export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80",
        className,
      )}
    />
  );
}
