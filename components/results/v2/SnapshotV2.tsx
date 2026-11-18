"use client";

import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ResultProgress } from "@/components/results/v2/ResultProgress";
import { SendToParentButton } from "@/components/results/v2/SendToParentButton";
import { TrustBlock } from "@/components/results/v2/TrustBlock";
import { lockedStreamRow } from "@/lib/offerCopy";
import { DEEP_DIVE_MODULES, responsesFor } from "@/lib/testModules";
import type { SessionState } from "@/types";

/**
 * RESULT_PAGE_V2's free snapshot, below its header - one clear path:
 *   progress (Snapshot ✓ → 3 tests → Full report)
 *   "Send my results to my parent" (child view only, outline)
 *   the 3 tests - the page's ONLY filled button
 *   the ₹49 list as a text link, saying what it gives
 *   a 2-3 line teaser of the full report - "Unlock after the 3 tests"
 *   a small trust block
 * No pay button, no "Unlock now", no pricing card: the ₹498 paywall comes
 * after the tests (PaywallV2.tsx).
 */
export function SnapshotV2({
  session,
  viewer,
  sendToParentHref,
  onSendToParent,
  onStartTests,
  careerListPriceLabel,
  showCareerList,
  careerListBusy,
  onCareerList,
}: {
  session: SessionState;
  viewer: "parent" | "child";
  sendToParentHref?: string;
  onSendToParent: () => void;
  onStartTests: () => void;
  careerListPriceLabel: string;
  /** Nothing bought yet */
  showCareerList: boolean;
  careerListBusy: boolean;
  onCareerList: () => void;
}) {
  const child = viewer === "child";
  const firstName = session.childName?.trim().split(/\s+/)[0] || "";
  const name = firstName || "your child";
  const possessive = child ? "your" : firstName ? `${firstName}'s` : "the";
  const answered = DEEP_DIVE_MODULES.reduce((sum, m) => sum + m.answeredCount(responsesFor(session, m)), 0);
  const total = DEEP_DIVE_MODULES.reduce((sum, m) => sum + m.items.length, 0);
  const testsDone = DEEP_DIVE_MODULES.filter((m) => Boolean(session[m.scoresKey])).length;
  const started = answered > 0;

  const reasons = child
    ? [
        ["Aptitude", "where your strengths lie"],
        ["Behaviour", "how you handle people, pressure and decisions"],
        ["Motivation", "what you want from work"],
      ]
    : [
        ["Aptitude", `where ${name}'s strengths lie`],
        ["Behaviour", `how ${name} handles people, pressure and decisions`],
        ["Motivation", `what ${name} wants from work`],
      ];

  const teaser = [
    child ? "Careers ranked for you, with why each one fits" : `Careers ranked for ${name}, with why each one fits`,
    lockedStreamRow(session.childClass),
    "A step-by-step roadmap: exams, courses, next steps",
  ];

  return (
    <>
      <ResultProgress current={1} />

      {child && sendToParentHref && (
        <SendToParentButton href={sendToParentHref} onTap={onSendToParent} className="mt-5" />
      )}

      {/* ---------------- the one primary action: the 3 tests ----------- */}
      <section
        id="deep-dive"
        aria-labelledby="tests-heading"
        className="mt-6 scroll-mt-6 rounded-xl border-2 border-accent-600 bg-surface p-5 shadow-feature sm:p-6"
      >
        <p className="text-note font-semibold text-accent-700">Next · free · about 10 minutes</p>
        <h2 id="tests-heading" className="mt-1 text-h2 font-semibold text-text">
          {started
            ? `Continue ${possessive} 3 tests`
            : child
              ? "Your 3 short tests"
              : `${firstName ? `${firstName}'s` : "The"} 3 short tests`}
        </h2>
        <p className="mt-2 text-body text-text">
          Interests alone can point to the wrong career. The tests check them against:
        </p>
        <ul className="mt-3 space-y-2">
          {reasons.map(([title, body]) => (
            <li key={title} className="flex gap-2.5 text-body text-text">
              <span aria-hidden="true" className="mt-2 block size-1.5 shrink-0 rounded-full bg-accent-600" />
              <span>
                <span className="font-semibold">{title}</span> — {body}
              </span>
            </li>
          ))}
        </ul>
        {started && (
          <div className="mt-4">
            <p className="text-note text-text-secondary">
              {testsDone} of 3 tests done · {answered} of {total} questions answered
            </p>
            <ProgressBar value={answered} max={total} label={`${answered} of ${total} questions answered`} className="mt-2" />
          </div>
        )}
        <Button variant="accent" size="lg" className="mt-5 w-full" onClick={onStartTests}>
          <span>
            {started ? (
              "Continue the 3 tests"
            ) : (
              <>
                Start {possessive} 3 tests <span className="whitespace-nowrap">· free · 10 min</span>
              </>
            )}
          </span>
        </Button>
        <p className="mt-2 text-center text-note text-text-secondary">
          {child ? "Answers save as you go." : `Answers save as ${name} goes.`}
        </p>
      </section>

      {/* ---------------- secondary: the ₹49 list, as a link ------------- */}
      {showCareerList && (
        <div className="mt-6 px-1">
          <button
            type="button"
            onClick={onCareerList}
            disabled={careerListBusy}
            className="inline-flex min-h-11 items-center text-left text-body font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800 disabled:opacity-60"
          >
            {careerListBusy ? "Opening checkout…" : `Just want the ranked career list? ${careerListPriceLabel} →`}
          </button>
          <p className="text-note text-text-secondary">
            Careers ranked on {child ? "your" : `${name}'s`} interests. Upgrade later to check them against{" "}
            {child ? "your" : `${name}'s`} strengths. The {careerListPriceLabel} is credited in full.
          </p>
        </div>
      )}

      {/* ---------------- teaser: what the full report adds -------------- */}
      <section aria-labelledby="teaser-heading" className="mt-10 rounded-xl border border-hairline bg-surface p-5">
        <h2 id="teaser-heading" className="text-lead font-semibold text-text">
          What the full report adds
        </h2>
        <ul className="mt-3 space-y-2">
          {teaser.map((line) => (
            <li key={line} className="flex gap-2.5 text-body text-text">
              <span aria-hidden="true">🔒</span>
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-note font-medium text-text-secondary">Unlock after the 3 tests.</p>
      </section>

      <TrustBlock size="small" />
    </>
  );
}
