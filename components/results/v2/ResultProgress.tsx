/**
 * RESULT_PAGE_V2's progress bar - replaces the "Step 1 / Step 2 / Part 1 of
 * 2" labels: Snapshot ✓ → 3 tests → Full report. `current` is the step the
 * family is on (0-based); earlier steps show a tick.
 */
const STEPS = ["Snapshot", "3 tests", "Full report"] as const;

export function ResultProgress({ current }: { current: 1 | 2 }) {
  return (
    <ol aria-label="Progress" className="mt-6 flex items-center gap-1.5 text-note font-medium">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className={`flex items-center gap-1.5 ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
            <span
              aria-hidden="true"
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-semibold ${
                done
                  ? "bg-ok-700 text-white"
                  : active
                    ? "bg-brand-700 text-white"
                    : "border border-control-line bg-surface text-text-secondary"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={`whitespace-nowrap ${active ? "text-text" : "text-text-secondary"}`}>
              {step}
              <span className="sr-only">{done ? " (done)" : active ? " (current)" : ""}</span>
            </span>
            {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px min-w-2 flex-1 bg-control-line" />}
          </li>
        );
      })}
    </ol>
  );
}
