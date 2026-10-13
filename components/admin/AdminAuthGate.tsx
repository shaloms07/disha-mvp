"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { loginAdmin } from "@/lib/api/admin";

const TOKEN_STORAGE_KEY = "mlc_admin_token";

const AdminAuthContext = createContext<{ token: string; signOut: () => void } | null>(null);

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
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_STORAGE_KEY));
    setHydrated(true);
  }, []);

  function signOut() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
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
          onSuccess={(newToken) => {
            localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
            setToken(newToken);
          }}
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
