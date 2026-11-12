"use client";

import { useEffect, useState } from "react";
import { getStoredAuthToken } from "@/lib/auth/client";
import { WHATSAPP_RESULTS_OPT_IN_NOTE, whatsappResultsOptInText } from "@/lib/consent";
import { fetchWhatsAppOptIn, saveWhatsAppOptIn, type WhatsAppOptInState } from "@/lib/api/realSession";
import { formatMobile } from "@/lib/validation";

/**
 * "Send {Name}'s results and next steps to my WhatsApp" under the snapshot -
 * the same marketing opt-in /register asks for, at the moment the result is
 * on screen. Unticked until the parent ticks it; ticking or unticking saves
 * straight away (server/routes/whatsappOptIn.ts records when, and which
 * wording).
 *
 * Only for the signed-in parent - the page decides that and passes
 * `parentMobile` only then. Renders nothing while loading, if the server
 * can't be reached, or if this number ever replied STOP.
 */
export function ResultsOptIn({
  sessionToken,
  parentMobile,
  firstName,
}: {
  sessionToken: string;
  parentMobile: string;
  firstName: string;
}) {
  const [state, setState] = useState<WhatsAppOptInState>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const authToken = getStoredAuthToken();
    if (!authToken) return;
    let cancelled = false;
    fetchWhatsAppOptIn(sessionToken, authToken)
      .then((loaded) => {
        if (!cancelled) setState(loaded);
      })
      .catch(() => {}); // best-effort: no box rather than a broken one
    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  if (!state || state.stopped) return null;

  async function toggle(optIn: boolean) {
    const authToken = getStoredAuthToken();
    if (!authToken || saving) return;
    setSaving(true);
    setError(undefined);
    const previous = state;
    setState({ optedIn: optIn, stopped: false });
    try {
      setState(await saveWhatsAppOptIn(sessionToken, authToken, optIn));
    } catch (err) {
      setState(previous);
      setError(err instanceof Error ? err.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-10 rounded-lg border border-hairline bg-surface px-4 py-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={state.optedIn}
          disabled={saving}
          onChange={(event) => void toggle(event.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[var(--color-accent-600)]"
        />
        <span className="text-body text-text">
          {whatsappResultsOptInText(firstName)}
          <span className="mt-0.5 block text-note text-text-secondary">{WHATSAPP_RESULTS_OPT_IN_NOTE}</span>
        </span>
      </label>
      {state.optedIn && !error && (
        <p role="status" className="mt-2 pl-8 text-note font-medium text-ok-700">
          ✓ We&apos;ll send them to {formatMobile(parentMobile)}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 pl-8 text-note text-err-700">
          {error}
        </p>
      )}
    </div>
  );
}
