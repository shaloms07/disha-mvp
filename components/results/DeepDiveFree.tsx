"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DEEP_DIVE_MODULES, isDeepDiveComplete, responsesFor } from "@/lib/testModules";
import type { SessionState } from "@/types";

/**
 * The Deep-Dive's three tests, offered on /results before the plan that
 * includes their report is bought - they're free to take, and the answers
 * save to the server as they go (lib/session/sync.ts). Three states: not
 * started, part-way (how far, and continue), and finished - where the report
 * is ready but stays locked until the Complete Career Report is bought (the
 * offer cards follow this card). /test lands back here (#deep-dive) when done.
 */
export function DeepDiveFree({
  session,
  onStart,
}: {
  session: SessionState;
  /** Marks the Deep-Dive as started, so /test runs its modules */
  onStart: () => void;
}) {
  const router = useRouter();
  const name = session.childName || "your child";
  const done = isDeepDiveComplete(session);
  const testsDone = DEEP_DIVE_MODULES.filter((m) => Boolean(session[m.scoresKey])).length;
  const answered = DEEP_DIVE_MODULES.reduce((sum, m) => sum + m.answeredCount(responsesFor(session, m)), 0);
  const total = DEEP_DIVE_MODULES.reduce((sum, m) => sum + m.items.length, 0);
  const started = answered > 0;

  // /test sends a finished Deep-Dive back to /results#deep-dive - the page
  // renders after hydration, too late for the browser's own jump to the hash.
  useEffect(() => {
    if (window.location.hash === "#deep-dive") {
      document.getElementById("deep-dive")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  function start() {
    onStart();
    router.push("/test");
  }

  if (done) {
    return (
      <Card id="deep-dive" tone="feature" className="mt-16 scroll-mt-6">
        <p className="text-note text-brand-100/75">Deep-Dive Assessment · all 3 tests done ✓</p>
        <h2 className="mt-3 text-h2 font-semibold text-white">
          {name.replace(/^./, (c) => c.toUpperCase())}&apos;s Complete Career Report is ready to unlock
        </h2>
        <p className="mt-4 text-body text-brand-100">
          Aptitude, behaviour and what drives {name} are now scored and saved. The Complete Career Report matches
          careers on all of it, with interests, and adds the full roadmap of exams, courses and next steps. Choose
          a plan below to open it.
        </p>
      </Card>
    );
  }

  return (
    <Card id="deep-dive" className="mt-16 scroll-mt-6">
      <p className="text-note font-medium text-accent-700">Free to take</p>
      <h2 className="mt-2 text-h2 font-semibold text-text">
        {started ? `Continue ${name}'s Deep-Dive` : `Take the Deep-Dive now`}
      </h2>
      <p className="mt-3 text-body text-text-secondary">
        Three more short tests: aptitude, behaviour and what drives {name}. About ten minutes, and answers save as
        you go, so {name} can stop and come back. The results come with the Complete Career Report, whenever you
        choose to unlock it.
      </p>
      {started && (
        <div className="mt-5">
          <p className="text-note text-text">
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
      <Button variant="primary" size="lg" className="mt-6 w-full sm:w-auto" onClick={start}>
        {started ? "Continue the Deep-Dive" : "Start the Deep-Dive"}
      </Button>
    </Card>
  );
}
