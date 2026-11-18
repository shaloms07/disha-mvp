"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAdminAuth } from "@/components/admin/AdminAuthGate";
import { AdminAuthError, fetchAdminFunnel, type AdminFunnel } from "@/lib/api/admin";
import { EXIT_PROMPT_OPTIONS, FUNNEL_EVENT_NAMES } from "@/lib/funnelEvents";
import { formatInr, totalForLevel } from "@/lib/pricing";

const DAY_OPTIONS = [7, 30, 90] as const;

const EVENT_LABELS: Record<string, string> = {
  paywall_view: "Saw the full-report offer",
  unlock_tap: "Tapped Unlock",
  plan_selected: "Started checkout",
  send_to_parent_tap: "Sent to parent",
  free_call_tap: "Tapped free call",
  payment_success: "Paid",
  exit_prompt_answer: "Answered “What’s stopping you?”",
  exit_prompt_dismissed: "Dismissed the question",
};

const RESULT_LINK_LABELS: [string, string][] = [
  ["completed", "Tests finished"],
  ["SENT", "result_link sent"],
  ["SKIPPED", "Skipped (template off)"],
  ["FAILED", "Failed to send"],
  ["none", "No send attempted"],
];

const PLAN_ROWS: [string, string][] = [
  ["list", `${formatInr(totalForLevel(1))} career list`],
  ["report", `${formatInr(totalForLevel(3))} report`],
  ["report+call", `${formatInr(totalForLevel(4))} report + counsellor call`],
];

/**
 * /admin/funnel - the results paywall's first-party funnel
 * (server/routes/admin.ts's GET /admin/funnel). Test records are left out
 * unless the toggle is on.
 */
export default function AdminFunnelPage() {
  const { token, signOut } = useAdminAuth();
  const [days, setDays] = useState<number>(30);
  const [includeTest, setIncludeTest] = useState(false);
  const [data, setData] = useState<AdminFunnel>();
  const [error, setError] = useState<string>();

  const load = useCallback(
    async (d: number, test: boolean) => {
      try {
        setData(await fetchAdminFunnel(token, { days: d, includeTest: test }));
        setError(undefined);
      } catch (err) {
        if (err instanceof AdminAuthError) {
          signOut();
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load the funnel.");
      }
    },
    [token, signOut],
  );

  useEffect(() => {
    // Data fetch on mount and on filter change - legitimate loading-state effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(days, includeTest);
  }, [load, days, includeTest]);

  const eventRow = (name: string) => data?.events.find((e) => e.name === name);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h1 font-semibold text-text">Paywall funnel</h1>
        <Link
          href="/admin"
          className="rounded-lg border border-hairline px-3 py-1.5 text-note font-medium text-text hover:bg-surface-sunk"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {DAY_OPTIONS.map((d) => (
          <Button key={d} variant={d === days ? "primary" : "secondary"} size="sm" onClick={() => setDays(d)}>
            Last {d} days
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
      {!data && !error && <p className="mt-8 text-text-muted">Loading…</p>}

      {data && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-h3 font-semibold text-text">Events</h2>
            <table className="mt-4 w-full text-left text-body">
              <thead className="text-note text-text-muted">
                <tr>
                  <th className="py-2 font-medium">Event</th>
                  <th className="py-2 text-right font-medium">Families</th>
                  <th className="py-2 text-right font-medium">Times</th>
                </tr>
              </thead>
              <tbody>
                {FUNNEL_EVENT_NAMES.map((name) => (
                  <tr key={name} className="border-t border-hairline">
                    <td className="py-2 text-text">{EVENT_LABELS[name] ?? name}</td>
                    <td className="py-2 text-right font-medium text-text">{eventRow(name)?.sessions ?? 0}</td>
                    <td className="py-2 text-right text-text-secondary">{eventRow(name)?.total ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <h2 className="text-h3 font-semibold text-text">Plans</h2>
            <table className="mt-4 w-full text-left text-body">
              <thead className="text-note text-text-muted">
                <tr>
                  <th className="py-2 font-medium">Plan</th>
                  <th className="py-2 text-right font-medium">Checkout started</th>
                  <th className="py-2 text-right font-medium">Paid</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_ROWS.map(([key, label]) => (
                  <tr key={key} className="border-t border-hairline">
                    <td className="py-2 text-text">{label}</td>
                    <td className="py-2 text-right text-text">{data.plansSelected[key] ?? 0}</td>
                    <td className="py-2 text-right font-medium text-text">{data.plansPaid[key] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <h2 className="text-h3 font-semibold text-text">Who saw the offer</h2>
            <CountList counts={data.paywallByRole} labels={{ parent: "Parent", child: "Child", unknown: "Can’t tell" }} />
            <h3 className="mt-6 text-note font-semibold text-text-secondary">By class</h3>
            <CountList counts={data.paywallByClass} />
          </Card>

          <Card>
            <h2 className="text-h3 font-semibold text-text">What’s stopping you?</h2>
            <CountList
              counts={data.exitAnswers}
              labels={Object.fromEntries(EXIT_PROMPT_OPTIONS.map((o) => [o.key, o.label]))}
              order={EXIT_PROMPT_OPTIONS.map((o) => o.key)}
            />
            <p className="mt-3 text-note text-text-muted">Dismissed: {eventRow("exit_prompt_dismissed")?.sessions ?? 0}</p>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="text-h3 font-semibold text-text">result_link WhatsApp to the parent</h2>
            <p className="mt-1 text-note text-text-muted">
              Every finished test should send it. Skipped = WHATSAPP_RESULT_LINK_TEMPLATE not set. No send attempted = the
              finish never reached the server, or it happened before the template existed.
            </p>
            <CountList
              counts={data.resultLink}
              labels={Object.fromEntries(RESULT_LINK_LABELS)}
              order={RESULT_LINK_LABELS.map(([key]) => key)}
            />
          </Card>
        </div>
      )}
    </main>
  );
}

function CountList({
  counts,
  labels = {},
  order,
}: {
  counts: Record<string, number>;
  labels?: Record<string, string>;
  order?: string[];
}) {
  const keys = order ?? Object.keys(counts).sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
  if (keys.length === 0) return <p className="mt-4 text-note text-text-muted">Nothing yet.</p>;
  return (
    <ul className="mt-4 space-y-1.5 text-body">
      {keys.map((key) => (
        <li key={key} className="flex justify-between gap-4 border-b border-hairline pb-1.5 last:border-b-0">
          <span className="text-text">{labels[key] ?? key}</span>
          <span className="font-medium text-text">{counts[key] ?? 0}</span>
        </li>
      ))}
    </ul>
  );
}
