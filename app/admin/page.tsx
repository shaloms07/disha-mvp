"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/components/admin/AdminAuthGate";
import { LeadList } from "@/components/admin/LeadList";
import { AdminAuthError, fetchAdminDashboard, type AdminDashboard } from "@/lib/api/admin";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Leads" },
  { href: "/admin/funnel", label: "Funnel" },
  { href: "/admin/callbacks", label: "Callbacks" },
  { href: "/admin/inbox", label: "WhatsApp inbox" },
];

export default function AdminDashboardPage() {
  const { token, signOut } = useAdminAuth();
  const pathname = usePathname();

  const [data, setData] = useState<AdminDashboard>();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  // Off by default: the numbers and table are real parents only
  // (lib/admin/testRecords.ts decides what counts as a test record).
  const [showTest, setShowTest] = useState(false);

  const load = useCallback(
    async (q: string, p: number, includeTest: boolean) => {
      setLoading(true);
      setError(undefined);
      try {
        const dashboard = await fetchAdminDashboard(token, { query: q || undefined, page: p, includeTest });
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
    // Data fetch on mount/page-change - legitimate loading-state effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(query, page, showTest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void load(query, 1, showTest);
  }

  function clearSearch() {
    setQuery("");
    setPage(1);
    void load("", 1, showTest);
  }

  function handleShowTest(next: boolean) {
    setShowTest(next);
    setPage(1);
    void load(query, 1, next);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const stats = data?.stats;
  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.total, data.page * data.pageSize) : 0;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
      {/* ---- Header: title, section tabs, sign out ---- */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-note font-medium text-text-muted">MyLifeCoach admin</p>
          <h1 className="mt-1 font-display text-h1 font-semibold text-text">Leads</h1>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="min-h-10 rounded-lg px-3 text-note font-medium text-text-secondary hover:bg-surface-sunk hover:text-text"
        >
          Sign out
        </button>
      </div>

      <nav aria-label="Admin sections" className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="inline-flex gap-1 rounded-xl bg-surface-sunk p-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-9 items-center whitespace-nowrap rounded-lg px-4 text-note font-medium transition-colors",
                    active ? "bg-surface text-text shadow-card" : "text-text-secondary hover:text-text",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ---- KPIs ---- */}
      <section aria-label="Totals" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi label="Parents registered" value={stats?.totalParents} />
        <Kpi label="Sessions started" value={stats?.totalSessions} />
        <Kpi
          label="Interest test completed"
          value={stats?.completedSessions}
          hint={stats ? `${percent(stats.completedSessions, stats.totalSessions)} of sessions` : undefined}
        />
        <Kpi
          label="Sessions per parent"
          value={stats && stats.totalParents ? Number((stats.totalSessions / stats.totalParents).toFixed(2)) : undefined}
          hint="More than 1 = siblings registered"
        />
      </section>

      {/* ---- Toolbar ---- */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} role="search" className="relative w-full sm:max-w-md">
          <label htmlFor="admin-search" className="sr-only">
            Search registrations
          </label>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="admin-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search parent, child or mobile"
            className="h-11 w-full rounded-xl border border-control-line/50 bg-surface pl-10 pr-24 text-body text-text placeholder:text-text-muted focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
          />
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="flex size-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-sunk hover:text-text"
              >
                ×
              </button>
            )}
            <button
              type="submit"
              className="h-8 rounded-lg bg-brand-700 px-3 text-note font-semibold text-white hover:bg-brand-800"
            >
              Search
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <p className="text-note text-text-secondary" aria-live="polite">
            {loading ? "Loading…" : data ? `${data.total} lead${data.total === 1 ? "" : "s"}` : ""}
          </p>
          <Toggle checked={showTest} onChange={handleShowTest} label="Test records" />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-err-700/10 px-4 py-3 text-note text-err-700">
          {error}
        </p>
      )}

      {/* ---- Leads ---- */}
      <div className="mt-4">
        <LeadList rows={data?.sessions} loading={loading} />
      </div>

      {/* ---- Pagination ---- */}
      {data && data.total > data.pageSize && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-note text-text-secondary">
            <span className="font-semibold text-text">
              {first}–{last}
            </span>{" "}
            of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <PageButton disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ← Previous
            </PageButton>
            <span className="hidden text-note text-text-muted sm:inline">
              Page {data.page} of {totalPages}
            </span>
            <PageButton
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </PageButton>
          </div>
        </div>
      )}
    </main>
  );
}

function percent(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function Kpi({ label, value, hint }: { label: string; value?: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4 shadow-card sm:p-5">
      <p className="text-note text-text-secondary">{label}</p>
      <p className="mt-2 font-display text-h1 font-semibold tabular-nums text-text">
        {value === undefined ? <span className="inline-block h-8 w-14 animate-pulse rounded-md bg-surface-sunk" /> : value.toLocaleString("en-IN")}
      </p>
      {hint && <p className="mt-1 text-note text-text-muted">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-10 items-center gap-2.5 rounded-lg px-1 text-note font-medium text-text-secondary hover:text-text"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-brand-700" : "bg-control-line/50",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left]",
            checked ? "left-[1.125rem]" : "left-0.5",
          )}
        />
      </span>
      {label}
    </button>
  );
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-10 rounded-lg border border-hairline bg-surface px-3.5 text-note font-medium text-text hover:bg-surface-sunk disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
