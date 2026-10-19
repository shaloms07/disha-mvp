"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useAdminAuth } from "@/components/admin/AdminAuthGate";
import { AdminAuthError, fetchAdminDashboard, type AdminDashboard } from "@/lib/api/admin";

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

export default function AdminDashboardPage() {
  const { token, signOut } = useAdminAuth();
  const router = useRouter();

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
          signOut();
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load the dashboard.");
      } finally {
        setLoading(false);
      }
    },
    [token, signOut],
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-h1 font-semibold text-text">Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push("/admin/leads")}>
            Upsell leads
          </Button>
          <Button variant="quiet" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
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
                <tr
                  key={row.sessionToken}
                  onClick={() => router.push(`/admin/${encodeURIComponent(row.sessionToken)}`)}
                  className="cursor-pointer border-t border-hairline hover:bg-brand-50"
                >
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
    </main>
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
