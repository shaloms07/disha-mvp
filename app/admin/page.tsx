"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { useAdminAuth } from "@/components/admin/AdminAuthGate";
import { statusSummary, tierName, tierWithPrice, timeAgo } from "@/components/admin/adminFormat";
import { AdminAuthError, fetchAdminDashboard, type AdminDashboard } from "@/lib/api/admin";
import { formatMobile } from "@/lib/validation";

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
        <Button variant="quiet" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Parents registered" value={data?.stats.totalParents} />
        <StatCard label="Sessions started" value={data?.stats.totalSessions} />
        <StatCard label="Tests completed" value={data?.stats.completedSessions} />
      </div>

      <form onSubmit={handleSearch} className="mt-8 flex items-end gap-3">
        <div className="flex-1">
          <TextField
            id="admin-search"
            label="Search registrations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Parent name, child name or mobile number"
          />
        </div>
        <Button type="submit" variant="secondary" size="md">
          Search
        </Button>
      </form>

      {error && <p className="mt-4 text-note text-err-700">{error}</p>}

      {/* One line per registration with only what's needed to act on it -
          who, how far they got, and whether they paid or want to. Everything
          else lives on the detail page a click away. */}
      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        {loading && (
          <p className="px-5 py-8 text-center text-body text-text-muted">Loading…</p>
        )}
        {!loading && data?.sessions.length === 0 && (
          <p className="px-5 py-8 text-center text-body text-text-muted">No registrations found.</p>
        )}
        {!loading && (data?.sessions.length ?? 0) > 0 && (
          <ul className="divide-y divide-hairline">
            {data!.sessions.map((row) => {
              const status = statusSummary(row);
              const paid = tierName(row.purchasedTierLevel);
              const interested = tierWithPrice(row.upsellTierLevel);
              return (
                <li key={row.sessionToken}>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/${encodeURIComponent(row.sessionToken)}`)}
                    className="flex w-full flex-col gap-3 px-5 py-4 text-left hover:bg-brand-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-body font-medium text-text">
                        {row.childName}
                        <span className="font-normal text-text-muted"> · {row.childClass}</span>
                        {row.hollandCode && (
                          <span className="ml-2 font-mono text-note text-text-secondary">
                            {row.hollandCode}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-note text-text-secondary">
                        {row.parentName} · {formatMobile(row.parentMobile)} ·{" "}
                        <span className="text-text-muted">{timeAgo(row.createdAt)}</span>
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {paid ? (
                        <AdminBadge tone="accent">{`Paid · ${paid}`}</AdminBadge>
                      ) : interested ? (
                        <AdminBadge tone="muted">{`Interested · ${interested}`}</AdminBadge>
                      ) : null}
                      <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
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
