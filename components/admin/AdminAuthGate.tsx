"use client";

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { loginAdmin } from "@/lib/api/admin";

const TOKEN_STORAGE_KEY = "mlc_admin_token";

const AdminAuthContext = createContext<{ token: string; signOut: () => void } | null>(null);

/*
 * localStorage is an external system, so the token is read through
 * useSyncExternalStore rather than an effect - no cascading render. React
 * uses getServerTokenSnapshot for the server render *and* the hydration
 * render, then re-renders with the real stored value, same pattern as
 * lib/context/SessionContext.tsx.
 */
interface TokenSnapshot {
  token: string | null;
  hydrated: boolean;
}

const SERVER_TOKEN_SNAPSHOT: TokenSnapshot = { token: null, hydrated: false };
let clientTokenSnapshot: TokenSnapshot | null = null;
const listeners = new Set<() => void>();

function getTokenSnapshot(): TokenSnapshot {
  clientTokenSnapshot ??= { token: localStorage.getItem(TOKEN_STORAGE_KEY), hydrated: true };
  return clientTokenSnapshot;
}

function getServerTokenSnapshot(): TokenSnapshot {
  return SERVER_TOKEN_SNAPSHOT;
}

function subscribeToken(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function writeToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
  clientTokenSnapshot = { token, hydrated: true };
  listeners.forEach((l) => l());
}

/** Only valid inside <AdminAuthGate> - every /admin page is rendered as its children. */
export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthGate");
  return ctx;
}

/**
 * Gatekeeper for every /admin page (see app/admin/layout.tsx): shows the
 * login form until a valid token is present, then exposes it via
 * useAdminAuth() to whatever page is actually being rendered.
 */
export function AdminAuthGate({ children }: { children: ReactNode }) {
  const { token, hydrated } = useSyncExternalStore(
    subscribeToken,
    getTokenSnapshot,
    getServerTokenSnapshot,
  );

  function signOut() {
    writeToken(null);
  }

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
        <div className="h-48 animate-pulse rounded-xl bg-surface-sunk" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
        <LoginForm
          onSuccess={(newToken) => writeToken(newToken)}
        />
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ token, signOut }}>{children}</AdminAuthContext.Provider>
  );
}

function LoginForm({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      const token = await loginAdmin(username, password);
      onSuccess(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-h1 font-semibold text-text">Admin sign-in</h1>
      <p className="mt-2 text-lead text-text-secondary">Internal use only.</p>
      <Card className="mt-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <TextField
            id="admin-username"
            label="Username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <TextField
            id="admin-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
            required
          />
          <Button type="submit" className="w-full" loading={loading} loadingText="Signing in…">
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
