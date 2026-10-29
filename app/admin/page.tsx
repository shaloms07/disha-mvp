"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminTimestamp } from "@/components/admin/AdminTimestamp";
import { useAdminAuth } from "@/components/admin/AdminAuthGate";
import { statusSummary, tierName, tierWithPrice } from "@/components/admin/adminFormat";
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

      {/* Six columns - who, how far, what result, what money, when. Each
          cell pairs related facts (child + class, parent + mobile) instead of
          giving every field its own column; the rest is on the detail page. */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-hairline bg-surface">
        <table className="w-full min-w-[860px] text-left text-body">
          <thead className="bg-surface-sunk text-note text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Child</th>
              <th className="px-4 py-3 font-medium">Parent</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && data?.sessions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                  No registrations found.
                </td>
              </tr>
            )}
            {!loading &&
              data?.sessions.map((row) => {
                const status = statusSummary(row);
                const paid = tierName(row.purchasedTierLevel);
                const interested = tierWithPrice(row.upsellTierLevel);
                return (
                  <tr
                    key={row.sessionToken}
                    onClick={() => router.push(`/admin/${encodeURIComponent(row.sessionToken)}`)}
                    className="cursor-pointer border-t border-hairline align-top hover:bg-brand-50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">{row.childName}</p>
                      <p className="text-note text-text-muted">{row.childClass}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-text">{row.parentName}</p>
                      <p className="whitespace-nowrap text-note text-text-muted">
                        {formatMobile(row.parentMobile)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="whitespace-nowrap">
                        <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-text-secondary">
                      {row.hollandCode ?? <span className="font-sans text-text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {paid ? (
                        <AdminBadge tone="accent">{`Paid · ${paid}`}</AdminBadge>
                      ) : interested ? (
                        <p className="text-note text-text-secondary">Interested · {interested}</p>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-note text-text-secondary">
                      <AdminTimestamp iso={row.createdAt} />
                    </td>
                  </tr>
                );
              })}
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
