"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Confirms a "Know more" click on /results (see registerReportInterest()) -
 * built on <dialog> for the same reason as TestInstructionsModal: focus
 * trapping and Escape-to-close are the browser's job, not ours.
 */
export function InterestModal({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="interest-title"
      className="m-auto w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-hairline bg-surface p-0 text-text shadow-feature backdrop:bg-ink-deep/55"
    >
      <div className="px-6 py-7 text-center sm:px-8 sm:py-8">
        <h2 id="interest-title" className="text-h2 font-semibold text-text">
          Thanks for your interest!
        </h2>
        <p className="mt-3 text-body text-text-secondary">
          We&apos;ll be in touch soon with more on the full report.
        </p>
        <Button variant="accent" size="lg" className="mt-8 w-full" onClick={() => ref.current?.close()}>
          Close
        </Button>
      </div>
    </dialog>
  );
}
