"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAdminAuth } from "@/components/admin/AdminAuthGate";
import { AdminAuthError, fetchAdminLeads, type AdminLeadRow } from "@/lib/api/admin";
import { TIER_OPTIONS } from "@/lib/pricing";

function tierLabel(level?: number): string {
  const option = TIER_OPTIONS.find((t) => t.level === level);
  return option ? option.name : "Unspecified tier";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminLeadsPage() {
  const { token, signOut } = useAdminAuth();
  const router = useRouter();

  const [leads, setLeads] = useState<AdminLeadRow[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(undefined);
      try {
        const rows = await fetchAdminLeads(token);
        if (!cancelled) setLeads(rows);
      } catch (err) {
        if (err instanceof AdminAuthError) {
          signOut();
          return;
        }
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load leads.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, signOut]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button variant="quiet" size="sm" onClick={() => router.push("/admin")}>
            ← Back to dashboard
          </Button>
          <h1 className="mt-3 text-h1 font-semibold text-text">Upsell leads</h1>
          <p className="mt-2 text-lead text-text-secondary">
            Everyone who clicked "I&apos;m interested" on a paid tier after their free result.
          </p>
        </div>
        <Button variant="quiet" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>

      {error && <p className="mt-6 text-note text-err-700">{error}</p>}
      {loading && <div className="mt-6 h-48 animate-pulse rounded-xl bg-surface-sunk" />}

      {!loading && leads && (
        <div className="mt-8 overflow-x-auto rounded-xl border border-hairline">
          <table className="w-full min-w-[700px] text-left text-body">
            <thead className="bg-surface-sunk text-note text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Parent</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Child</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                    No one has clicked an upsell tier yet.
                  </td>
                </tr>
              )}
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/admin/${encodeURIComponent(lead.sessionToken)}`)}
                  className="cursor-pointer border-t border-hairline hover:bg-brand-50"
                >
                  <td className="px-4 py-3 text-text">{lead.parentName}</td>
                  <td className="px-4 py-3 text-text">{lead.parentMobile}</td>
                  <td className="px-4 py-3 text-text">{lead.childName}</td>
                  <td className="px-4 py-3 text-text-secondary">{tierLabel(lead.tierLevel)}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && leads && leads.length > 0 && (
        <Card tone="quiet" className="mt-6">
          <p className="text-note text-text-secondary">
            {leads.length} lead{leads.length === 1 ? "" : "s"} total. Click a row for that
            session&apos;s full test result.
          </p>
        </Card>
      )}
    </main>
  );
}
