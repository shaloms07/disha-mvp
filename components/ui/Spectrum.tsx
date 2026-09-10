import { cn } from "@/lib/cn";
import { RIASEC_LABELS, RIASEC_TYPES } from "@/types";

const COLOR_VARS = [
  "var(--color-riasec-r)",
  "var(--color-riasec-i)",
  "var(--color-riasec-a)",
  "var(--color-riasec-s)",
  "var(--color-riasec-e)",
  "var(--color-riasec-c)",
];

/**
 * The six RIASEC colours as a single rule — the product's signature mark.
 * Decorative wherever it appears; the chart and its labels carry the meaning.
 */
export function SpectrumRule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex h-1 w-full overflow-hidden rounded-full", className)}
    >
      {COLOR_VARS.map((color, i) => (
        <span key={i} className="h-full flex-1" style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

/**
 * The six type letters at display size, each in its own colour. Used as the
 * graphic anchor on dark fields.
 */
export function SpectrumLetters({
  className,
  size = "text-h2",
}: {
  className?: string;
  size?: string;
}) {
  return (
    <p
      aria-hidden="true"
      className={cn("flex flex-wrap gap-x-4 gap-y-2 font-display font-semibold", size, className)}
    >
      {RIASEC_TYPES.map((type, i) => (
        <span key={type} style={{ color: COLOR_VARS[i] }} title={RIASEC_LABELS[type]}>
          {type}
        </span>
      ))}
    </p>
  );
}
