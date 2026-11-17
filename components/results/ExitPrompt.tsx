"use client";

import { useEffect, useRef, useState } from "react";
import { EXIT_PROMPT_OPTIONS, type ExitPromptAnswer } from "@/lib/funnelEvents";

/** Idle this long on the paywall (no scroll, tap or key) before asking */
const IDLE_MS = 45_000;

function storageKey(sessionToken: string) {
  return `mlc:exitPrompt:${sessionToken}`;
}

function alreadyAsked(sessionToken: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(sessionToken)) !== null;
  } catch {
    return false;
  }
}

function markAsked(sessionToken: string) {
  try {
    window.localStorage.setItem(storageKey(sessionToken), "1");
  } catch {
    // ignore - the server also ignores a second answer
  }
}

/**
 * "What's stopping you?" - one question, once per session, after the
 * paywall has been seen and then either left idle for 45 seconds or left
 * for another tab/app and come back to. Phones give no reliable "about to
 * leave" signal, so these two are what's used. Dismissable; the answer (or
 * the dismissal) goes to server/routes/events.ts.
 */
export function ExitPrompt({
  sessionToken,
  armed,
  onAnswer,
  onDismiss,
}: {
  sessionToken: string;
  /** True once the paywall has actually been seen */
  armed: boolean;
  onAnswer: (answer: ExitPromptAnswer) => void;
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [thanks, setThanks] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    if (!armed || shown.current || alreadyAsked(sessionToken)) return;

    function show() {
      if (shown.current) return;
      shown.current = true;
      markAsked(sessionToken);
      setOpen(true);
    }

    let idleTimer = window.setTimeout(show, IDLE_MS);
    function resetIdle() {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(show, IDLE_MS);
    }
    let wasHidden = false;
    function onVisibility() {
      if (document.visibilityState === "hidden") wasHidden = true;
      else if (wasHidden) show();
    }

    const activity = ["scroll", "pointerdown", "keydown", "touchstart"] as const;
    activity.forEach((type) => window.addEventListener(type, resetIdle, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(idleTimer);
      activity.forEach((type) => window.removeEventListener(type, resetIdle));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [armed, sessionToken]);

  if (!open) return null;

  function answer(key: ExitPromptAnswer) {
    onAnswer(key);
    setThanks(true);
    window.setTimeout(() => setOpen(false), 1200);
  }

  function dismiss() {
    onDismiss();
    setOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="exit-prompt-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-surface px-4 pt-4 shadow-feature disha-fade-in"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <p id="exit-prompt-title" className="text-body font-semibold text-text">
            {thanks ? "Thank you — that helps." : "What's stopping you?"}
          </p>
          {!thanks && (
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-sunk"
            >
              ✕
            </button>
          )}
        </div>
        {!thanks && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {EXIT_PROMPT_OPTIONS.map((option) => (
              <li key={option.key}>
                <button
                  type="button"
                  onClick={() => answer(option.key)}
                  className="min-h-11 rounded-full border border-hairline px-4 text-note font-medium text-text hover:border-brand-700 hover:bg-brand-50"
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
