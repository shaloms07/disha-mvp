"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AdminBadge, type AdminBadgeTone } from "@/components/admin/AdminBadge";
import { AdminTimestamp } from "@/components/admin/AdminTimestamp";
import { useAdminAuth } from "@/components/admin/AdminAuthGate";
import {
  AdminAuthError,
  fetchAdminCallbacks,
  sendCallbackPayLink,
  updateAdminCallback,
  type AdminCallback,
} from "@/lib/api/admin";
import { formatMobile } from "@/lib/validation";

const FILTERS: [string, string][] = [
  ["open", "To call"],
  ["called", "Called"],
  ["paid", "Paid"],
  ["all", "All"],
];

const STATUS_BADGES: Record<AdminCallback["status"], { label: string; tone: AdminBadgeTone }> = {
  requested: { label: "Requested", tone: "warn" },
  called: { label: "Called", tone: "ok" },
  no_answer: { label: "No answer", tone: "err" },
  paid: { label: "Paid", tone: "accent" },
};

const PRIORITY_LABELS: Record<AdminCallback["priority"], string> = {
  1: "1 · Tests done, tapped Pay",
  2: "2 · Class 10 / 12",
  3: "3 · Everyone else",
};

const SOURCE_LABELS: Record<string, string> = {
  page: "Results page",
  exit_question: "Exit question",
  whatsapp: "WhatsApp CALL",
};

/**
 * /admin/callbacks - free callback requests (server/routes/callbacks.ts), in
 * the order to call them: Deep-Dive done and tapped Pay without paying,
 * then Class 10 and 12, then everyone else - oldest first within each. No
 * slots: the counsellor calls, marks the outcome, and can WhatsApp the
 * parent the pay link.
 */
export default function AdminCallbacksPage() {
  const { token, signOut } = useAdminAuth();
  const [filter, setFilter] = useState("open");
  const [includeTest, setIncludeTest] = useState(false);
  const [rows, setRows] = useState<AdminCallback[]>();
  const [error, setError] = useState<string>();
  const [busyId, setBusyId] = useState<string>();
  const [note, setNote] = useState<string>();

  const load = useCallback(
    async (status: string, test: boolean) => {
      try {
        setRows(await fetchAdminCallbacks(token, { status, includeTest: test }));
        setError(undefined);
      } catch (err) {
        if (err instanceof AdminAuthError) {
          signOut();
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load callbacks.");
      }
    },
    [token, signOut],
  );

  useEffect(() => {
    // Data fetch on mount and on filter change - legitimate loading-state effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(filter, includeTest);
  }, [load, filter, includeTest]);

  async function act(id: string, action: () => Promise<void>, done: string) {
    setBusyId(id);
    setNote(undefined);
    try {
      await action();
      setNote(done);
      await load(filter, includeTest);
    } catch (err) {
      if (err instanceof AdminAuthError) {
        signOut();
        return;
      }
      setNote(err instanceof Error ? err.message : "That didn't work. Please try again.");
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h1 font-semibold text-text">Free callbacks</h1>
        <Link
          href="/admin"
          className="rounded-lg border border-hairline px-3 py-1.5 text-note font-medium text-text hover:bg-surface-sunk"
        >
          ← Dashboard
        </Link>
      </div>
      <p className="mt-2 text-body text-text-secondary">
        Parents who asked for a call. No slots — call in this order, then mark how it went. The call is about which
        option fits the child, not a free walk-through of the results.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {FILTERS.map(([key, label]) => (
          <Button key={key} variant={key === filter ? "primary" : "secondary"} size="sm" onClick={() => setFilter(key)}>
            {label}
          </Button>
        ))}
        <label className="ml-2 inline-flex cursor-pointer items-center gap-2 text-note text-text-secondary">
          <input
            type="checkbox"
            checked={includeTest}
            onChange={(event) => setIncludeTest(event.target.checked)}
            className="size-4 accent-[var(--color-brand-700)]"
          />
          Show test records
        </label>
      </div>

      {error && <p className="mt-4 text-note text-err-700">{error}</p>}
      {note && (
        <p role="status" className="mt-4 text-note text-text-secondary">
          {note}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-hairline bg-surface">
        <table className="w-full min-w-[960px] text-left text-body">
          <thead className="bg-surface-sunk text-note text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Parent</th>
              <th className="px-4 py-3 font-medium">Child</th>
              <th className="px-4 py-3 font-medium">Tests / Pay</th>
              <th className="px-4 py-3 font-medium">Best time</th>
              <th className="px-4 py-3 font-medium">Requested</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!rows && !error && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                  No callbacks here.
                </td>
              </tr>
            )}
            {rows?.map((row) => {
              const badge = STATUS_BADGES[row.status];
              const busy = busyId === row.id;
              return (
                <tr key={row.id} className="border-t border-hairline align-top">
                  <td className="px-4 py-3 text-note text-text">
                    {PRIORITY_LABELS[row.priority]}
                    {row.isTest && (
                      <span className="mt-1 block">
                        <AdminBadge tone="muted">Test</AdminBadge>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-text">{row.parentName}</p>
                    <a
                      href={`tel:+91${row.parentMobile.replace(/\D/g, "").slice(-10)}`}
                      className="whitespace-nowrap text-note font-medium text-brand-700 underline underline-offset-2"
                    >
                      {formatMobile(row.parentMobile)}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/${encodeURIComponent(row.sessionToken)}`}
                      className="font-medium text-text underline underline-offset-2"
                    >
                      {row.childName}
                    </Link>
                    <p className="text-note text-text-muted">{row.childClass ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-note text-text-secondary">
                    {row.deepDiveDone ? "Tests done" : "Tests not done"}
                    <br />
                    {row.paidTierLevel > 0 ? "Has paid" : row.tappedPay ? "Tapped Pay, not paid" : "Hasn't tapped Pay"}
                  </td>
                  <td className="px-4 py-3 text-note text-text-secondary">
                    {row.preferredTime ? row.preferredTime[0].toUpperCase() + row.preferredTime.slice(1) : "Any"}
                    <br />
                    <span className="text-text-muted">{SOURCE_LABELS[row.source] ?? row.source}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-note text-text-secondary">
                    <AdminTimestamp iso={row.requestedAt} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="whitespace-nowrap">
                      <AdminBadge tone={badge.tone}>{badge.label}</AdminBadge>
                    </span>
                    {row.payLinkSentAt && <p className="mt-1 text-note text-text-muted">Pay link sent</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      {row.status !== "called" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            act(row.id, () => updateAdminCallback(token, row.id, "called"), "Marked as called.")
                          }
                        >
                          Called
                        </Button>
                      )}
                      {row.status === "requested" && (
                        <Button
                          size="sm"
                          variant="quiet"
                          disabled={busy}
                          onClick={() =>
                            act(row.id, () => updateAdminCallback(token, row.id, "no_answer"), "Marked as no answer.")
                          }
                        >
                          No answer
                        </Button>
                      )}
                      {row.paidTierLevel < 3 && (
                        <Button
                          size="sm"
                          variant="quiet"
                          disabled={busy}
                          onClick={() =>
                            act(row.id, () => sendCallbackPayLink(token, row.id), "Pay link sent on WhatsApp.")
                          }
                        >
                          Send pay link
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
