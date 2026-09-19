"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import type { TestModule } from "@/lib/testModules";

/**
 * A short "here's how this one works" panel, shown once before a module's
 * first question.
 *
 * Built on <dialog> so focus trapping and the Escape key are the browser's
 * job. Escape is allowed to close it — the instructions are a courtesy, not a
 * gate, and trapping someone in a modal they've already read is worse than
 * letting them skip it.
 *
 * The card deck sits visible behind it on purpose: a student can see what they
 * are about to be asked while they read how to answer it.
 */
export function TestInstructionsModal({
  module,
  onStart,
}: {
  module: TestModule;
  onStart: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const points = module.instructions ?? [];

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onStart}
      aria-labelledby="instructions-title"
      className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-hairline bg-surface p-0 text-text shadow-feature backdrop:bg-ink-deep/55"
    >
      <div className="px-6 py-7 sm:px-8 sm:py-8">
        <p className="font-mono text-note text-text-muted">{module.label}</p>
        <h2
          id="instructions-title"
          className="mt-3 text-h2 font-semibold text-text"
        >
          Before you start
        </h2>
        <p className="mt-3 text-lead text-text-secondary">{module.intro}</p>

        <ul className="mt-7 space-y-3.5">
          {points.map((point) => (
            <li key={point} className="flex gap-3.5 text-body text-text">
              <span
                aria-hidden="true"
                className="mt-2 block size-1 shrink-0 rounded-full bg-accent-600"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>

        <Button
          variant="accent"
          size="lg"
          className="mt-8 w-full"
          /* close() rather than unmounting straight from the open state, so
             the dialog leaves the top layer the way the browser expects.
             onClose then calls onStart. */
          onClick={() => ref.current?.close()}
        >
          Start {module.label.toLowerCase()}
        </Button>
      </div>
    </dialog>
  );
}
