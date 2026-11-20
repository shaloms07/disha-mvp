"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/components/admin/AdminAuthGate";
import { LeadList, SORT_OPTIONS, SortArrows, type LeadSort } from "@/components/admin/LeadList";
import { AdminAuthError, fetchAdminDashboard, type AdminDashboard, type AdminSortKey } from "@/lib/api/admin";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Leads" },
  { href: "/admin/funnel", label: "Funnel" },
  { href: "/admin/callbacks", label: "Callbacks" },
  { href: "/admin/inbox", label: "WhatsApp inbox" },
];

interface Filters {
  query: string;
  page: number;
  includeTest: boolean;
  sort: LeadSort;
  from: string;
  to: string;
}

/** A day in India time, as YYYY-MM-DD - today, or offsetDays from it */
function istToday(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

const PRESETS: { label: string; range: () => { from: string; to: string } }[] = [
  { label: "Today", range: () => ({ from: istToday(), to: istToday() }) },
  { label: "Yesterday", range: () => ({ from: istToday(-1), to: istToday(-1) }) },
  { label: "Last 7 days", range: () => ({ from: istToday(-6), to: istToday() }) },
  { label: "Last 30 days", range: () => ({ from: istToday(-29), to: istToday() }) },
  { label: "All time", range: () => ({ from: "", to: "" }) },
];

export default function AdminDashboardPage() {
  const { token, signOut } = useAdminAuth();
  const pathname = usePathname();

  const [data, setData] = useState<AdminDashboard>();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  // What's on screen: the search that was run (not what's being typed), the
  // page, the sort and the date range. Test records are off by default - the
  // numbers and list are real parents only (lib/admin/testRecords.ts).
  const [filters, setFilters] = useState<Filters>({
    query: "",
    page: 1,
    includeTest: false,
    sort: { key: "joined", dir: "desc" },
    from: "",
    to: "",
  });
  const { page, includeTest: showTest, sort, from, to } = filters;

  const load = useCallback(
    async (next: Filters) => {
      setLoading(true);
      setError(undefined);
      try {
        const dashboard = await fetchAdminDashboard(token, {
          query: next.query || undefined,
          page: next.page,
          includeTest: next.includeTest,
          sort: next.sort.key,
          dir: next.sort.dir,
          from: next.from || undefined,
          to: next.to || undefined,
        });
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
    // Data fetch whenever the filters change - legitimate loading-state effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(filters);
  }, [filters, load]);

  /** Any change but paging goes back to page 1 */
  function update(change: Partial<Filters>) {
    setFilters((current) => ({ ...current, page: 1, ...change }));
  }

  function setPage(next: number) {
    setFilters((current) => ({ ...current, page: next }));
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update({ query: query.trim() });
  }

  function clearSearch() {
    setQuery("");
    update({ query: "" });
  }

  /** A header tapped: flip its direction, or start a new column at its natural direction */
  function handleSort(key: AdminSortKey) {
    const first = SORT_OPTIONS.find((option) => option.key === key)?.firstDir ?? "asc";
    update({
      sort: sort.key === key ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: first },
    });
  }

  /** The phone's Sort by menu: a new column at its natural direction */
  function handleSortSelect(key: AdminSortKey) {
    const first = SORT_OPTIONS.find((option) => option.key === key)?.firstDir ?? "asc";
    update({ sort: { key, dir: first } });
  }

  function setRange(nextFrom: string, nextTo: string) {
    // A range picked back to front still means the days between them
    if (nextFrom && nextTo && nextFrom > nextTo) [nextFrom, nextTo] = [nextTo, nextFrom];
    update({ from: nextFrom, to: nextTo });
  }

  const activePreset = PRESETS.find((preset) => {
    const range = preset.range();
    return range.from === from && range.to === to;
  })?.label;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const stats = data?.stats;
  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.total, data.page * data.pageSize) : 0;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
      {/* ---- Header: title, section tabs, sign out ---- */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          
          <h1 className="font-display text-h1 font-semibold text-text">Leads</h1>
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
      {(from || to) && (
        <p className="mt-6 text-note font-medium text-text-secondary">Showing registrations {rangeLabel(from, to)}</p>
      )}
      <section
        aria-label="Totals"
        className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4", from || to ? "mt-2" : "mt-8")}
      >
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
          <Toggle checked={showTest} onChange={(next) => update({ includeTest: next })} label="Test records" />
        </div>
      </div>

      {/* ---- Date range ---- */}
      <section
        aria-label="Registered between"
        className="mt-3 flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-3 sm:p-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 sm:mx-0 sm:flex-wrap sm:px-0">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-pressed={activePreset === preset.label}
              onClick={() => {
                const range = preset.range();
                setRange(range.from, range.to);
              }}
              className={cn(
                "min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-note font-medium transition-colors",
                activePreset === preset.label
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-hairline bg-surface text-text-secondary hover:border-brand-700/40 hover:text-text",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
          <DateField label="From" value={from} max={to || undefined} onChange={(value) => setRange(value, to)} />
          <DateField label="To" value={to} min={from || undefined} onChange={(value) => setRange(from, value)} />
        </div>
      </section>

      {/* ---- Sort (phones - the column headers do it on a desktop) ---- */}
      <div className="mt-3 flex items-center gap-2 lg:hidden">
        <label htmlFor="admin-sort" className="shrink-0 text-note font-medium text-text-secondary">
          Sort by
        </label>
        <select
          id="admin-sort"
          value={sort.key}
          onChange={(event) => handleSortSelect(event.target.value as AdminSortKey)}
          className="h-10 min-w-0 flex-1 rounded-xl border border-control-line/50 bg-surface px-3 text-body text-text focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => handleSort(sort.key)}
          aria-label={`Sorted ${sortDirLabel(sort)} - tap to reverse`}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-control-line/50 bg-surface px-3 text-note font-medium text-text"
        >
          <SortArrows state={sort.dir} />
          {sortDirLabel(sort)}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-err-700/10 px-4 py-3 text-note text-err-700">
          {error}
        </p>
      )}

      {/* ---- Leads ---- */}
      <div className="mt-4">
        <LeadList rows={data?.sessions} loading={loading} sort={sort} onSort={handleSort} />
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
            <PageButton disabled={page <= 1 || loading} onClick={() => setPage(Math.max(1, page - 1))}>
              ← Previous
            </PageButton>
            <span className="hidden text-note text-text-muted sm:inline">
              Page {data.page} of {totalPages}
            </span>
            <PageButton
              disabled={page >= totalPages || loading}
              onClick={() => setPage(Math.min(totalPages, page + 1))}
            >
              Next →
            </PageButton>
          </div>
        </div>
      )}
    </main>
  );
}

/** "Newest", "A → Z"... for the phone's sort-direction button */
function sortDirLabel(sort: LeadSort): string {
  if (sort.key === "joined") return sort.dir === "desc" ? "Newest" : "Oldest";
  if (sort.key === "plan") return sort.dir === "desc" ? "Highest" : "Lowest";
  return sort.dir === "asc" ? "A → Z" : "Z → A";
}

/** "2026-11-20" -> "20 Nov 2026" */
function dayLabel(day: string): string {
  return new Date(`${day}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/** "on 20 Nov 2026", "from 1 Nov 2026 to 20 Nov 2026", "from 1 Nov 2026", "up to 20 Nov 2026" */
function rangeLabel(from: string, to: string): string {
  if (from && to) return from === to ? `on ${dayLabel(from)}` : `from ${dayLabel(from)} to ${dayLabel(to)}`;
  if (from) return `from ${dayLabel(from)}`;
  return `up to ${dayLabel(to)}`;
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-note font-medium text-text-secondary">
      {label}
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-0 rounded-xl border border-control-line/50 bg-surface px-3 text-body text-text focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20 sm:w-40"
      />
    </label>
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
