"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import {
  AdminAuthError,
  fetchAdminDashboard,
  loginAdmin,
  type AdminDashboard,
} from "@/lib/api/admin";

const TOKEN_STORAGE_KEY = "mlc_admin_token";

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "text-ok-700",
  TIMED_OUT: "text-err-700",
  IN_PROGRESS: "text-accent-700",
  REGISTERED: "text-text-secondary",
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_STORAGE_KEY));
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
          <div className="h-48 animate-pulse rounded-xl bg-surface-sunk" />
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
        {token ? (
          <Dashboard
            token={token}
            onSignedOut={() => {
              localStorage.removeItem(TOKEN_STORAGE_KEY);
              setToken(null);
            }}
          />
        ) : (
          <LoginForm
            onSuccess={(newToken) => {
              localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
              setToken(newToken);
            }}
          />
        )}
      </main>
      <footer className="mt-24 border-t border-hairline px-6 py-8">
        <p className="mx-auto w-full max-w-5xl text-note text-text-muted">
          Internal dashboard — not for parent or student access.
        </p>
      </footer>
    </>
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
      <p className="mt-2 text-lead text-text-secondary">
        Internal use only.
      </p>
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

function Dashboard({ token, onSignedOut }: { token: string; onSignedOut: () => void }) {
  const [data, setData] = useState<AdminDashboard>();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(
    async (q: string, p: number) => {
      setLoading(true);
      setError(undefined);
      try {
        const dashboard = await fetchAdminDashboard(token, { query: q || undefined, page: p });
        setData(dashboard);
      } catch (err) {
        if (err instanceof AdminAuthError) {
          onSignedOut();
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load the dashboard.");
      } finally {
        setLoading(false);
      }
    },
    [token, onSignedOut],
  );

  useEffect(() => {
    void load(query, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void load(query, 1);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-h1 font-semibold text-text">Dashboard</h1>
        <Button variant="quiet" size="sm" onClick={onSignedOut}>
          Sign out
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Parents registered" value={data?.stats.totalParents} />
        <StatCard label="Sessions started" value={data?.stats.totalSessions} />
        <StatCard label="Tests completed" value={data?.stats.completedSessions} />
      </div>

      <Card tone="quiet" className="mt-8">
        <form onSubmit={handleSearch} className="flex items-end gap-3">
          <div className="flex-1">
            <TextField
              id="admin-search"
              label="Search"
              hint="By parent name, mobile number, or child name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 98765 43210"
            />
          </div>
          <Button type="submit" variant="secondary" size="md">
            Search
          </Button>
        </form>
      </Card>

      {error && <p className="mt-4 text-note text-err-700">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-hairline">
        <table className="w-full min-w-[800px] text-left text-body">
          <thead className="bg-surface-sunk text-note text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Parent</th>
              <th className="px-4 py-3 font-medium">Mobile</th>
              <th className="px-4 py-3 font-medium">Child</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Progress</th>
              <th className="px-4 py-3 font-medium">Holland code</th>
              <th className="px-4 py-3 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && data?.sessions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-text-muted">
                  No sessions found.
                </td>
              </tr>
            )}
            {!loading &&
              data?.sessions.map((row) => (
                <tr key={row.sessionToken} className="border-t border-hairline">
                  <td className="px-4 py-3 text-text">{row.parentName}</td>
                  <td className="px-4 py-3 text-text">{row.parentMobile}</td>
                  <td className="px-4 py-3 text-text">{row.childName}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.childClass}</td>
                  <td className={`px-4 py-3 font-medium ${STATUS_STYLES[row.status] ?? ""}`}>
                    {row.status.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {row.answeredCount}/{row.totalQuestions}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{row.hollandCode ?? "—"}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(row.createdAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-note text-text-muted">
            Page {data.page} of {totalPages} — {data.total} result{data.total === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <Card>
      <p className="text-note text-text-muted">{label}</p>
      <p className="mt-2 text-h1 font-semibold text-text">{value ?? "—"}</p>
    </Card>
  );
}
