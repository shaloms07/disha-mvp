"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { RiasecType, SessionState } from "@/types";

const STORAGE_KEY = "disha:session";

export const EMPTY_SESSION: SessionState = {
  parentName: "",
  parentMobile: "",
  childName: "",
  childClass: "",
  consentGiven: false,
  otpVerified: false,
  responses: {},
  selectedTiers: {
    detailedReport: false,
    roadmap: false,
    consultation: false,
  },
};

interface Snapshot {
  session: SessionState;
  /**
   * False on the server and during the hydration render, true once the store
   * has actually read sessionStorage. Screens that redirect when there's no
   * session must wait for this, or a refresh would bounce the user out.
   */
  hydrated: boolean;
}

/* -------------------------------------------------------------------------
   sessionStorage-backed store.

   sessionStorage is an external system, so it's modelled as an external store
   and read through useSyncExternalStore. React uses getServerSnapshot for the
   server render *and* the hydration render, then re-renders with the real
   stored value — so a refresh restores progress with no hydration mismatch.
   ------------------------------------------------------------------------- */

const SERVER_SNAPSHOT: Snapshot = { session: EMPTY_SESSION, hydrated: false };

let clientSnapshot: Snapshot | null = null;
const listeners = new Set<() => void>();

function readStoredSession(): SessionState {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_SESSION;
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    // Merge over the empty shape so a partial/older payload can't leave holes.
    return {
      ...EMPTY_SESSION,
      ...parsed,
      responses: parsed.responses ?? {},
      selectedTiers: { ...EMPTY_SESSION.selectedTiers, ...parsed.selectedTiers },
    };
  } catch {
    // Unavailable in private mode or with site data blocked — the demo still
    // runs, it just won't survive a refresh.
    return EMPTY_SESSION;
  }
}

function getSnapshot(): Snapshot {
  clientSnapshot ??= { session: readStoredSession(), hydrated: true };
  return clientSnapshot;
}

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function write(next: SessionState): void {
  clientSnapshot = { session: next, hydrated: true };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore — see readStoredSession
  }
  listeners.forEach((l) => l());
}

function mutate(updater: (prev: SessionState) => SessionState): void {
  write(updater(getSnapshot().session));
}

/* ------------------------------------------------------------------------- */

interface SessionContextValue {
  session: SessionState;
  hydrated: boolean;
  updateSession: (patch: Partial<SessionState>) => void;
  setResponse: (questionId: number, value: number) => void;
  setScores: (scores: Record<RiasecType, number>) => void;
  resetSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { session, hydrated } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const updateSession = useCallback((patch: Partial<SessionState>) => {
    mutate((prev) => ({ ...prev, ...patch }));
  }, []);

  const setResponse = useCallback((questionId: number, value: number) => {
    mutate((prev) => ({
      ...prev,
      responses: { ...prev.responses, [questionId]: value },
    }));
  }, []);

  const setScores = useCallback((scores: Record<RiasecType, number>) => {
    mutate((prev) => ({
      ...prev,
      scores,
      completedAt: new Date().toISOString(),
    }));
  }, []);

  const resetSession = useCallback(() => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    write(EMPTY_SESSION);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      hydrated,
      updateSession,
      setResponse,
      setScores,
      resetSession,
    }),
    [session, hydrated, updateSession, setResponse, setScores, resetSession],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside a <SessionProvider>");
  }
  return ctx;
}
