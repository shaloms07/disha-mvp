"use client";

import { cn } from "@/lib/cn";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { responsesFor, type TestModule } from "@/lib/testModules";
import type { SessionState } from "@/types";

/**
 * Section-by-section progress, for a run with more than one module.
 *
 * A single cumulative "question 51 of 96" is the wrong read once the test is
 * four separate assessments: the sections have different lengths, different
 * answer formats and different subjects, and RIASEC was answered days earlier
 * in the paid flow. Each section carries its own count, and the bar tracks the
 * section being answered rather than the whole run.
 *
 * A single-module run never renders this — the free RIASEC test keeps the
 * plain "Question 7 of 36" header it has always had.
 */

export type SectionStatus = "completed" | "current" | "upcoming";

export function statusOf(
  module: TestModule,
  moduleIndex: number,
  currentModuleIndex: number,
  session: SessionState,
): SectionStatus {
  if (module.isComplete(responsesFor(session, module))) return "completed";
  return moduleIndex === currentModuleIndex ? "current" : "upcoming";
}

const ICON_LABEL: Record<SectionStatus, string> = {
  completed: "completed",
  current: "in progress",
  upcoming: "not started",
};

function StatusIcon({ status }: { status: SectionStatus }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className: "shrink-0",
  };

  if (status === "completed") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9.5" strokeWidth="1.75" />
        <path d="m8 12.4 2.8 2.8L16 9.8" />
      </svg>
    );
  }

  if (status === "current") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9.5" strokeWidth="1.75" />
        <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  // Upcoming: an outline only, dashed so it reads as "not yet" rather than
  // "empty" next to the solid rings either side of it.
  return (
    <svg {...common}>
      <circle
        cx="12"
        cy="12"
        r="9.5"
        strokeWidth="1.75"
        strokeDasharray="3 3"
      />
    </svg>
  );
}

/**
 * The section being answered is the one thing on this strip that has to be
 * unmistakable — with four similar-looking chips in a row, a student glancing
 * up mid-test should not have to work out which test they are in. It gets a
 * size and weight step, a tinted pill, and the accent ring on its icon; the
 * others recede.
 */
const TONE: Record<SectionStatus, string> = {
  completed: "text-ok-700",
  current:
    "text-accent-700 bg-accent-100/60 rounded-full px-2.5 py-1 -my-1 scale-[1.08] origin-left",
  upcoming: "text-text-muted",
};

export function TestModuleProgress({
  modules,
  currentModuleIndex,
  session,
  className,
}: {
  modules: TestModule[];
  currentModuleIndex: number;
  session: SessionState;
  className?: string;
}) {
  const current = modules[currentModuleIndex];
  const currentAnswered = current.answeredCount(responsesFor(session, current));
  const currentTotal = current.items.length;

  return (
    <div className={className}>
      <ol className="flex flex-wrap items-center gap-x-4 gap-y-2.5 text-note">
        {modules.map((module, i) => {
          const status = statusOf(module, i, currentModuleIndex, session);
          const answered = module.answeredCount(responsesFor(session, module));
          const total = module.items.length;

          return (
            <li
              key={module.id}
              aria-current={status === "current" ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 transition-transform",
                TONE[status],
              )}
            >
              <StatusIcon status={status} />
              <span
                className={cn(
                  status === "current"
                    ? "text-body font-semibold tracking-tight"
                    : undefined,
                )}
              >
                {module.label}
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  status === "current" ? "font-medium" : "opacity-80",
                )}
              >
                {answered}/{total}
              </span>
              <span className="sr-only">— {ICON_LABEL[status]}</span>
            </li>
          );
        })}
      </ol>

      {/* Tracks the section being answered, not the whole run. */}
      <ProgressBar
        value={currentAnswered}
        max={currentTotal}
        label={`${current.label}: ${currentAnswered} of ${currentTotal} answered`}
        className="mt-3"
      />
    </div>
  );
}
