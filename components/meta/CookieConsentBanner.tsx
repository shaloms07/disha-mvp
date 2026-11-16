"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";

const CONSENT_KEY = "mlc_analytics_consent";
export type ConsentState = "granted" | "denied" | null;

/** Never throws - a blocked/unavailable localStorage just means no stored choice. */
export function getStoredConsent(): ConsentState {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

/*
 * localStorage is an external system, so consent is read through
 * useSyncExternalStore rather than an effect - no cascading render, and the
 * server/hydration snapshot keeps hydration clean. Shared by
 * components/meta/MetaPixel.tsx, which reads the same stored value.
 */
export interface ConsentSnapshot {
  consent: ConsentState;
  hydrated: boolean;
}

const SERVER_CONSENT_SNAPSHOT: ConsentSnapshot = { consent: null, hydrated: false };
let clientConsentSnapshot: ConsentSnapshot | null = null;
const listeners = new Set<() => void>();

export function getConsentSnapshot(): ConsentSnapshot {
  clientConsentSnapshot ??= { consent: getStoredConsent(), hydrated: true };
  return clientConsentSnapshot;
}

export function getServerConsentSnapshot(): ConsentSnapshot {
  return SERVER_CONSENT_SNAPSHOT;
}

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function writeConsent(value: "granted" | "denied"): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Best-effort only - the choice just won't be remembered next visit.
  }
  clientConsentSnapshot = { consent: value, hydrated: true };
  listeners.forEach((l) => l());
}

/**
 * Fail-closed: nothing tracking-related loads until this is answered, and
 * "Decline" is remembered just as durably as "Accept" (components/meta/
 * MetaPixel.tsx reads the same stored value).
 */
export function CookieConsentBanner({
  onDecision,
}: {
  onDecision: (consent: "granted" | "denied") => void;
}) {
  const { consent, hydrated } = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );

  function decide(value: "granted" | "denied") {
    writeConsent(value);
    onDecision(value);
  }

  if (!hydrated || consent !== null) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-surface px-6 py-4 shadow-feature">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-note text-text-secondary">
          We use cookies to measure how our ads perform. Your child&apos;s
          name, answers and scores are never shared with ad platforms. See
          our{" "}
          <a href="/privacy" className="font-medium text-brand-700 underline">
            Privacy Policy
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="quiet" size="sm" onClick={() => decide("denied")}>
            Decline
          </Button>
          <Button variant="secondary" size="sm" onClick={() => decide("granted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
