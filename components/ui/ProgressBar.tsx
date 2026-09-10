import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn(
        "h-1 w-full overflow-hidden rounded-full bg-hairline",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-brand-700 transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
