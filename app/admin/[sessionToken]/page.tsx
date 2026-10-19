"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAdminAuth } from "@/components/admin/AdminAuthGate";
import {
  AdminAuthError,
  fetchAdminSessionDetail,
  type AdminSessionDetail,
} from "@/lib/api/admin";
import { formatInr, TIER_OPTIONS } from "@/lib/pricing";
import { RIASEC_LABELS, RIASEC_TYPES } from "@/types";

function upsellLabel(level?: number): string {
  if (!level) return "None yet";
  const option = TIER_OPTIONS.find((t) => t.level === level);
  return option ? `${option.name} (${formatInr(option.total)})` : "None yet";
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSessionDetailPage() {
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const router = useRouter();
  const { token, signOut } = useAdminAuth();

  const [data, setData] = useState<AdminSessionDetail>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(undefined);
      try {
        const detail = await fetchAdminSessionDetail(token, sessionToken);
        if (!cancelled) setData(detail);
      } catch (err) {
        if (err instanceof AdminAuthError) {
          signOut();
          return;
        }
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load this session.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, sessionToken, signOut]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
      <Button variant="quiet" size="sm" onClick={() => router.push("/admin")}>
        ← Back to dashboard
      </Button>

      {loading && <div className="mt-6 h-48 animate-pulse rounded-xl bg-surface-sunk" />}
      {error && <p className="mt-6 text-note text-err-700">{error}</p>}

      {data && (
        <>
          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-h1 font-semibold text-text">{data.child.name}</h1>
              <p className="mt-1 text-lead text-text-secondary">
                {data.child.grade} — parent {data.parent.name} ({data.parent.mobile})
              </p>
            </div>
            <span className="rounded-full bg-surface-sunk px-3 py-1 text-note font-medium text-text-secondary">
              {data.status.replace("_", " ")}
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-note text-text-muted">Progress</p>
              <p className="mt-2 text-h2 font-semibold text-text">
                {data.answeredCount}/{data.totalQuestions}
              </p>
            </Card>
            <Card>
              <p className="text-note text-text-muted">Holland code</p>
              <p className="mt-2 text-h2 font-semibold text-text">{data.hollandCode ?? "—"}</p>
            </Card>
            <Card>
              <p className="text-note text-text-muted">Upsell interest</p>
              <p className="mt-2 text-h3 font-semibold text-text">
                {upsellLabel(data.upsellTierLevel)}
              </p>
            </Card>
            <Card>
              <p className="text-note text-text-muted">Registered</p>
              <p className="mt-2 text-body text-text">{formatDate(data.createdAt)}</p>
              {data.completedAt && (
                <p className="mt-1 text-note text-text-muted">
                  Completed {formatDate(data.completedAt)}
                </p>
              )}
            </Card>
          </div>

          {data.scores && (
            <Card className="mt-6">
              <h2 className="text-h3 font-semibold text-text">RIASEC scores</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
                {RIASEC_TYPES.map((t) => (
                  <div key={t} className="text-center">
                    <p className="text-note text-text-muted">{RIASEC_LABELS[t]}</p>
                    <p className="mt-1 text-h2 font-semibold text-text">{data.scores?.[t] ?? 0}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="mt-6" flush>
            <h2 className="px-6 pt-6 text-h3 font-semibold text-text sm:px-7">
              Interest test answers
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-body">
                <thead className="bg-surface-sunk text-note text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Option A</th>
                    <th className="px-4 py-3 font-medium">Option B</th>
                    <th className="px-4 py-3 font-medium">Picked</th>
                  </tr>
                </thead>
                <tbody>
                  {data.answers.map((answer) => (
                    <tr key={answer.id} className="border-t border-hairline align-top">
                      <td className="px-4 py-3 text-text-muted">{answer.id}</td>
                      <td
                        className={`px-4 py-3 ${
                          answer.pickedText === answer.optionA
                            ? "font-semibold text-text"
                            : "text-text-secondary"
                        }`}
                      >
                        {answer.optionA}
                      </td>
                      <td
                        className={`px-4 py-3 ${
                          answer.pickedText === answer.optionB
                            ? "font-semibold text-text"
                            : "text-text-secondary"
                        }`}
                      >
                        {answer.optionB}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {answer.pickedTrait ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </main>
  );
}
