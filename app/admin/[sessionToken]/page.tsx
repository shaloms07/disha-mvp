"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AdminBadge, type AdminBadgeTone } from "@/components/admin/AdminBadge";
import { AdminTimestamp } from "@/components/admin/AdminTimestamp";
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

const STATUS_TONE: Record<string, AdminBadgeTone> = {
  COMPLETED: "ok",
  TIMED_OUT: "err",
  IN_PROGRESS: "warn",
  REGISTERED: "muted",
};

const ORDER_STATUS_TONE: Record<string, AdminBadgeTone> = {
  PAID: "ok",
  CREATED: "warn",
  FAILED: "err",
};

/** Module names in moduleScores/moduleResponses are whatever TestModule.scoresKey
 *  minus "Scores" produced (see lib/testModules.ts) - prettified generically
 *  here rather than hardcoding a label map that would silently go stale if a
 *  module is renamed or added. */
function prettifyModuleName(key: string): string {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function prettifyTraitKey(key: string): string {
  return key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

interface TimelineEvent {
  label: string;
  iso: string;
  tone: AdminBadgeTone;
  detail?: string;
}

/** One combined, chronologically-sorted view across every timestamped field
 *  this session touches - registration, consent, OTP activity, test
 *  completion, each payment, and WhatsApp reminders. This is the "precise
 *  timestamp, individual detail" view the plain stat cards above it can't
 *  give on their own. */
function buildTimeline(data: AdminSessionDetail): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({ label: "Registered", iso: data.createdAt, tone: "muted" });

  if (data.consent.consentedAt) {
    events.push({
      label: "Consent given",
      iso: data.consent.consentedAt,
      tone: "muted",
      detail: data.consent.version ? `version ${data.consent.version}` : undefined,
    });
  }

  for (const otp of data.otpEvents) {
    events.push({
      label: otp.purpose === "SIGN_IN" ? "Sign-in code sent" : "Verification code sent",
      iso: otp.createdAt,
      tone: "muted",
    });
    if (otp.consumedAt) {
      events.push({
        label: otp.purpose === "SIGN_IN" ? "Signed in" : "Mobile verified",
        iso: otp.consumedAt,
        tone: "ok",
        detail: otp.attempts > 1 ? `${otp.attempts} attempts` : undefined,
      });
    }
  }

  if (data.completedAt) {
    events.push({ label: "Test completed", iso: data.completedAt, tone: "ok" });
  }

  for (const order of data.orders) {
    const option = TIER_OPTIONS.find((t) => t.level === order.tierLevel);
    const tierName = option?.name ?? `Tier ${order.tierLevel}`;
    events.push({
      label: `Checkout started - ${tierName}`,
      iso: order.createdAt,
      tone: "muted",
      detail: formatInr(order.amount / 100),
    });
    if (order.status === "PAID") {
      events.push({
        label: `Payment received - ${tierName}`,
        iso: order.updatedAt,
        tone: "ok",
        detail: order.razorpayPaymentId,
      });
    } else if (order.status === "FAILED") {
      events.push({ label: `Payment failed - ${tierName}`, iso: order.updatedAt, tone: "err" });
    }
  }

  if (data.reminders.sent2h) events.push({ label: "Reminder sent (2h)", iso: data.reminders.sent2h, tone: "muted" });
  if (data.reminders.sent24h) events.push({ label: "Reminder sent (24h)", iso: data.reminders.sent24h, tone: "muted" });
  if (data.reminders.sent72h) events.push({ label: "Reminder sent (72h)", iso: data.reminders.sent72h, tone: "muted" });

  return events.sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
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

  const timeline = useMemo(() => (data ? buildTimeline(data) : []), [data]);
  const moduleScores = (data?.moduleScores ?? {}) as Record<string, Record<string, number>>;
  const moduleNames = Object.keys(moduleScores);

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
            <AdminBadge tone={STATUS_TONE[data.status] ?? "muted"}>
              {data.status.replace("_", " ")}
            </AdminBadge>
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
              <p className="text-note text-text-muted">Purchased</p>
              <p className="mt-2 text-h3 font-semibold text-text">
                {data.purchasedTierLevel
                  ? TIER_OPTIONS.find((t) => t.level === data.purchasedTierLevel)?.name ?? `Tier ${data.purchasedTierLevel}`
                  : "Not yet"}
              </p>
              <p className="mt-1 text-note text-text-muted">
                Upsell interest: {upsellLabel(data.upsellTierLevel)}
              </p>
            </Card>
            <Card>
              <p className="text-note text-text-muted">Registered</p>
              <p className="mt-2 text-body text-text">
                <AdminTimestamp iso={data.createdAt} />
              </p>
              {data.completedAt && (
                <p className="mt-1 text-note text-text-muted">
                  Completed <AdminTimestamp iso={data.completedAt} />
                </p>
              )}
              <p className="mt-1 text-note text-text-muted">
                Last activity <AdminTimestamp iso={data.lastActivityAt} />
              </p>
            </Card>
          </div>

          {/* ----------------------------------------------- payment history */}
          <Card className="mt-6" flush>
            <div className="flex items-center justify-between px-6 pt-6 sm:px-7">
              <h2 className="text-h3 font-semibold text-text">Payment history</h2>
              <span className="text-note text-text-muted">
                {data.orders.length} order{data.orders.length === 1 ? "" : "s"}
              </span>
            </div>
            {data.orders.length === 0 ? (
              <p className="px-6 pb-6 pt-4 text-body text-text-secondary sm:px-7">
                No checkout attempts yet.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-body">
                  <thead className="bg-surface-sunk text-note text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Tier</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Razorpay order</th>
                      <th className="px-4 py-3 font-medium">Payment ID</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((order) => {
                      const option = TIER_OPTIONS.find((t) => t.level === order.tierLevel);
                      return (
                        <tr key={order.id} className="border-t border-hairline">
                          <td className="px-4 py-3 text-text">{option?.name ?? `Tier ${order.tierLevel}`}</td>
                          <td className="px-4 py-3 font-mono text-text">{formatInr(order.amount / 100)}</td>
                          <td className="px-4 py-3">
                            <AdminBadge tone={ORDER_STATUS_TONE[order.status] ?? "muted"}>
                              {order.status}
                            </AdminBadge>
                          </td>
                          <td className="px-4 py-3 font-mono text-note text-text-secondary">
                            {order.razorpayOrderId}
                          </td>
                          <td className="px-4 py-3 font-mono text-note text-text-secondary">
                            {order.razorpayPaymentId ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-note text-text-secondary">
                            <AdminTimestamp iso={order.createdAt} />
                          </td>
                          <td className="px-4 py-3 text-note text-text-secondary">
                            <AdminTimestamp iso={order.updatedAt} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ------------------------------------------- deep-dive scores */}
          {moduleNames.length > 0 && (
            <Card className="mt-6">
              <h2 className="text-h3 font-semibold text-text">Deep-Dive module scores</h2>
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {moduleNames.map((name) => (
                  <div key={name}>
                    <p className="text-note font-medium text-text-muted">{prettifyModuleName(name)}</p>
                    <dl className="mt-2 space-y-1.5">
                      {Object.entries(moduleScores[name]).map(([trait, value]) => (
                        <div key={trait} className="flex items-baseline justify-between gap-3 text-note">
                          <dt className="text-text-secondary">{prettifyTraitKey(trait)}</dt>
                          <dd className="font-mono text-text">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </Card>
          )}

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

          {/* ---------------------------------------- consent & attribution */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <h2 className="text-h3 font-semibold text-text">Consent & verification</h2>
              <dl className="mt-4 space-y-2 text-note">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-muted">Consent given</dt>
                  <dd>
                    <AdminBadge tone={data.consent.given ? "ok" : "muted"}>
                      {data.consent.given ? "Yes" : "No"}
                    </AdminBadge>
                  </dd>
                </div>
                {data.consent.consentedAt && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-text-muted">Consented at</dt>
                    <dd className="text-text">
                      <AdminTimestamp iso={data.consent.consentedAt} />
                    </dd>
                  </div>
                )}
                {data.consent.version && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-text-muted">Consent version</dt>
                    <dd className="font-mono text-text">{data.consent.version}</dd>
                  </div>
                )}
              </dl>

              {data.otpEvents.length > 0 && (
                <>
                  <p className="mt-5 text-note font-medium text-text-muted">OTP activity</p>
                  <ul className="mt-2 space-y-2">
                    {data.otpEvents.map((otp) => (
                      <li key={otp.id} className="flex items-center justify-between gap-3 text-note">
                        <span className="text-text-secondary">
                          {otp.purpose === "SIGN_IN" ? "Sign-in" : "Verify"} to {otp.mobile}
                        </span>
                        <span className="flex items-center gap-2">
                          <AdminBadge tone={otp.consumedAt ? "ok" : "muted"}>
                            {otp.consumedAt ? "Verified" : "Not used"}
                          </AdminBadge>
                          <span className="text-text-muted">
                            <AdminTimestamp iso={otp.createdAt} />
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>

            <Card>
              <h2 className="text-h3 font-semibold text-text">Attribution</h2>
              <dl className="mt-4 space-y-2 text-note">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-muted">UTM source</dt>
                  <dd className="text-text">{data.utm.source ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-muted">UTM medium</dt>
                  <dd className="text-text">{data.utm.medium ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-muted">UTM campaign</dt>
                  <dd className="text-text">{data.utm.campaign ?? "—"}</dd>
                </div>
              </dl>

              {(data.reminders.sent2h || data.reminders.sent24h || data.reminders.sent72h) && (
                <>
                  <p className="mt-5 text-note font-medium text-text-muted">WhatsApp reminders sent</p>
                  <dl className="mt-2 space-y-2 text-note">
                    {data.reminders.sent2h && (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-text-muted">2 hour</dt>
                        <dd className="text-text"><AdminTimestamp iso={data.reminders.sent2h} /></dd>
                      </div>
                    )}
                    {data.reminders.sent24h && (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-text-muted">24 hour</dt>
                        <dd className="text-text"><AdminTimestamp iso={data.reminders.sent24h} /></dd>
                      </div>
                    )}
                    {data.reminders.sent72h && (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-text-muted">72 hour</dt>
                        <dd className="text-text"><AdminTimestamp iso={data.reminders.sent72h} /></dd>
                      </div>
                    )}
                  </dl>
                </>
              )}
            </Card>
          </div>

          {/* ------------------------------------------------- timeline */}
          <Card className="mt-6">
            <h2 className="text-h3 font-semibold text-text">Activity timeline</h2>
            <ol className="mt-5 space-y-4">
              {timeline.map((event, i) => (
                <li key={`${event.label}-${event.iso}-${i}`} className="flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <span
                      aria-hidden="true"
                      className={`size-2 shrink-0 rounded-full ${
                        event.tone === "ok" ? "bg-ok-700" : event.tone === "err" ? "bg-err-700" : "bg-text-muted"
                      }`}
                    />
                    {i < timeline.length - 1 && <span aria-hidden="true" className="mt-1 w-px flex-1 bg-hairline" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-body text-text">{event.label}</p>
                    <p className="text-note text-text-muted">
                      <AdminTimestamp iso={event.iso} />
                      {event.detail && <> · {event.detail}</>}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {/* -------------------------------------------- RIASEC answers */}
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
