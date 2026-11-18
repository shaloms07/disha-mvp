"use client";

import { useState } from "react";
import { requestFreeCallback } from "@/lib/api/realSession";
import { PREFERRED_TIMES, maskMobile, type PreferredTime } from "@/lib/callbackShared";

/**
 * RESULT_PAGE_V2's free callback - parent view only, never above the offer.
 * One tap, no form: the counsellor calls the verified parent number
 * (masked here), usually within a working day, at their discretion - no
 * slot, no booking. The optional time chip is a preference, not a slot.
 * Framed around which option fits the child, not a free walk-through of
 * the results. After the tap the pay action stays in reach (`onPay`).
 */
export function CallbackRequest({
  sessionToken,
  parentMobile,
  firstName,
  source = "page",
  payLabel,
  onPay,
  onTap,
  compact = false,
}: {
  sessionToken: string;
  parentMobile?: string;
  firstName: string;
  source?: "page" | "exit_question";
  /** e.g. "Unlock Meera's report · ₹498" - shown once the request is in */
  payLabel?: string;
  onPay?: () => void;
  onTap: () => void;
  /** Inside the exit question's sheet - less spacing, no heading */
  compact?: boolean;
}) {
  const [preferredTime, setPreferredTime] = useState<PreferredTime>();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const name = firstName || "your child";
  const possessive = firstName ? `${firstName}'s` : "the";

  async function request() {
    onTap();
    setState("sending");
    try {
      await requestFreeCallback(sessionToken, { preferredTime, source });
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div role="status" className={`${compact ? "mt-3" : "mt-10"} rounded-xl border border-ok-700/30 bg-ok-700/5 p-4 sm:p-5`}>
        <p className="text-body font-semibold text-text">Done — our counsellor will call you.</p>
        <p className="mt-1 text-body text-text-secondary">
          Meanwhile, {possessive} report is ready to unlock.
        </p>
        {payLabel && onPay && (
          <button
            type="button"
            onClick={onPay}
            className="mt-3 inline-flex min-h-11 items-center text-body font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800"
          >
            {payLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <section aria-labelledby={compact ? undefined : "callback-heading"} className={compact ? "mt-3" : "mt-10"}>
      {!compact && (
        <h2 id="callback-heading" className="text-lead font-semibold text-text">
          Have questions before you decide?
        </h2>
      )}
      <p className={`${compact ? "" : "mt-1"} text-body text-text-secondary`}>
        Talk to our counsellor about which option fits {name}. Free, no booking.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Best time to call (optional)">
        <span className="text-note text-text-secondary">Best time:</span>
        {PREFERRED_TIMES.map((time) => (
          <button
            key={time}
            type="button"
            aria-pressed={preferredTime === time}
            onClick={() => setPreferredTime(preferredTime === time ? undefined : time)}
            className={`min-h-10 rounded-full border px-4 text-note font-medium ${
              preferredTime === time
                ? "border-brand-700 bg-brand-50 text-brand-800"
                : "border-control-line text-text hover:border-brand-700"
            }`}
          >
            {time === "morning" ? "Morning" : "Evening"}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={request}
        disabled={state === "sending"}
        className="mt-3 flex min-h-12 w-full items-center justify-center rounded-lg border border-control-line bg-surface px-5 text-body font-semibold text-text hover:border-brand-700 hover:bg-brand-50 disabled:opacity-60 sm:w-auto"
      >
        {state === "sending" ? "Requesting…" : "Request a free callback"}
      </button>
      <p className="mt-2 text-note text-text-secondary">
        Our counsellor will call you on {maskMobile(parentMobile)}. Usually within 1 working day.
      </p>
      {state === "error" && (
        <p role="alert" className="mt-2 text-note text-err-700">
          That didn&apos;t go through. Please try again.
        </p>
      )}
    </section>
  );
}
