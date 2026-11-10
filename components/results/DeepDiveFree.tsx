"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DEEP_DIVE_MODULES, responsesFor } from "@/lib/testModules";
import type { SessionState } from "@/types";

/**
 * The snapshot page's one main next step: the Deep-Dive's three tests, free
 * to take, with the price of the full results said up front ("unlock for
 * ₹999 when you finish"). Answers save to the server as they go
 * (lib/session/sync.ts). Two states: not started, and part-way (how far, and
 * continue). Finished is the results-ready view (ResultsReady.tsx), not this.
 *
 * "Already decided? Unlock now" stays deliberately small - it's for a parent
 * who wants to pay before the child takes the Deep-Dive, not the main path.
 */
export function DeepDiveFree({
  session,
  onStart,
  unlockPriceLabel,
  onUnlockNow,
}: {
  session: SessionState;
  /** Marks the Deep-Dive as started, so /test runs its modules */
  onStart: () => void;
  /** e.g. "₹999" - what the full results cost once the Deep-Dive is done */
  unlockPriceLabel: string;
  onUnlockNow: () => void;
}) {
  const router = useRouter();
  const name = session.childName || "this student";
  const testsDone = DEEP_DIVE_MODULES.filter((m) => Boolean(session[m.scoresKey])).length;
  const answered = DEEP_DIVE_MODULES.reduce((sum, m) => sum + m.answeredCount(responsesFor(session, m)), 0);
  const total = DEEP_DIVE_MODULES.reduce((sum, m) => sum + m.items.length, 0);
  const started = answered > 0;

  // A link to /results#deep-dive (older WhatsApp messages) - the page renders
  // after hydration, too late for the browser's own jump to the hash.
  useEffect(() => {
    if (window.location.hash === "#deep-dive") {
      document.getElementById("deep-dive")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  function start() {
    onStart();
    router.push("/test");
  }

  return (
    <Card id="deep-dive" tone="feature" className="mt-16 scroll-mt-6">
      <p className="text-note text-brand-100/75">Next step · free · about 10 minutes</p>
      <h2 className="mt-3 text-h2 font-semibold text-white">
        {started ? `Continue ${name}'s Deep-Dive` : `${name}'s Deep-Dive: 3 short tests`}
      </h2>
      <p className="mt-4 text-body text-brand-100">
        Aptitude, behaviour and motivation. Together with the interests above, they show not just what {name}{" "}
        enjoys but where {name}&apos;s strengths lie. Answers save as {name} goes, so it&apos;s fine to stop and come
        back.
      </p>
      {started && (
        <div className="mt-5">
          <p className="text-note text-brand-100">
            {testsDone} of 3 tests done · {answered} of {total} questions answered
          </p>
          <ProgressBar
            value={answered}
            max={total}
            label={`${answered} of ${total} Deep-Dive questions answered`}
            className="mt-2"
          />
        </div>
      )}
      <Button variant="accent" size="lg" className="mt-8 w-full sm:w-auto" onClick={start}>
        {started ? "Continue the Deep-Dive" : "Continue to the Deep-Dive"}
        <span className="ml-1.5 font-normal opacity-80">· free</span>
      </Button>
      <p className="mt-4 text-note text-brand-100/85">
        {name}&apos;s full results unlock for {unlockPriceLabel} after the Deep-Dive.
      </p>
      <button
        type="button"
        onClick={onUnlockNow}
        className="mt-5 min-h-11 text-note text-brand-100 underline underline-offset-4 hover:text-white"
      >
        Already decided? Unlock now
      </button>
    </Card>
  );
}
