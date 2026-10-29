"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AdminBadge, type AdminBadgeTone } from "@/components/admin/AdminBadge";
import { AdminTimestamp } from "@/components/admin/AdminTimestamp";
import { useAdminAuth } from "@/components/admin/AdminAuthGate";
import { statusSummary, tierName, tierWithPrice, timeAgo } from "@/components/admin/adminFormat";
import { RIASEC_COLORS } from "@/components/RiasecRadarChart";
import {
  AdminAuthError,
  fetchAdminSessionDetail,
  type AdminSessionDetail,
} from "@/lib/api/admin";
import { formatInr } from "@/lib/pricing";
import { formatMobile } from "@/lib/validation";
import { RIASEC_LABELS, RIASEC_TYPES, type RiasecType } from "@/types";

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

/** Every timestamped thing this session touched, oldest first. */
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
    const name = tierName(order.tierLevel);
    events.push({
      label: `Checkout started · ${name}`,
      iso: order.createdAt,
      tone: "muted",
      detail: formatInr(order.amount / 100),
    });
    if (order.status === "PAID") {
      events.push({ label: `Payment received · ${name}`, iso: order.updatedAt, tone: "ok" });
    } else if (order.status === "FAILED") {
      events.push({ label: `Payment failed · ${name}`, iso: order.updatedAt, tone: "err" });
    }
  }

  if (data.reminders.sent2h) events.push({ label: "WhatsApp reminder (2h)", iso: data.reminders.sent2h, tone: "muted" });
  if (data.reminders.sent24h) events.push({ label: "WhatsApp reminder (24h)", iso: data.reminders.sent24h, tone: "muted" });
  if (data.reminders.sent72h) events.push({ label: "WhatsApp reminder (72h)", iso: data.reminders.sent72h, tone: "muted" });

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
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      <Button variant="quiet" size="sm" onClick={() => router.push("/admin")}>
        ← All registrations
      </Button>

      {loading && <div className="mt-6 h-48 animate-pulse rounded-xl bg-surface-sunk" />}
      {error && <p className="mt-6 text-note text-err-700">{error}</p>}

      {data && <SessionDetail data={data} timeline={timeline} moduleScores={moduleScores} moduleNames={moduleNames} />}
    </main>
  );
}

function SessionDetail({
  data,
  timeline,
  moduleScores,
  moduleNames,
}: {
  data: AdminSessionDetail;
  timeline: TimelineEvent[];
  moduleScores: Record<string, Record<string, number>>;
  moduleNames: string[];
}) {
  const status = statusSummary(data);
  const paidOrders = data.orders.filter((o) => o.status === "PAID");
  const paidTotal = paidOrders.reduce((sum, o) => sum + o.amount, 0) / 100;
  const ranked = data.scores
    ? [...RIASEC_TYPES].sort((a, b) => (data.scores?.[b] ?? 0) - (data.scores?.[a] ?? 0))
    : [];
  const topScore = ranked.length ? Math.max(1, data.scores?.[ranked[0]] ?? 1) : 1;

  return (
    <>
      {/* ----------------------------------------------------------- who */}
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold text-text">{data.child.name}</h1>
          <p className="mt-1 text-body text-text-secondary">
            {data.child.grade} · parent {data.parent.name} ·{" "}
            <a href={`tel:+91${data.parent.mobile}`} className="text-brand-700 underline">
              {formatMobile(data.parent.mobile)}
            </a>
          </p>
        </div>
        <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
      </div>

      {/* --------------------------------------------------- at a glance */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-note text-text-muted">Test</p>
          <p className="mt-2 text-h3 font-semibold text-text">
            {data.answeredCount}/{data.totalQuestions}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunk">
            <div
              className="h-full rounded-full bg-brand-700"
              style={{ width: `${Math.round((data.answeredCount / Math.max(1, data.totalQuestions)) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-note text-text-muted">Last active {timeAgo(data.lastActivityAt)}</p>
        </Card>

        <Card>
          <p className="text-note text-text-muted">Result</p>
          {data.hollandCode ? (
            <>
              <p className="mt-2 font-mono text-h3 font-semibold text-text">{data.hollandCode}</p>
              <p className="mt-1 text-note text-text-secondary">
                {ranked.slice(0, 3).map((t) => RIASEC_LABELS[t]).join(", ")}
              </p>
            </>
          ) : (
            <p className="mt-2 text-body text-text-secondary">No result yet</p>
          )}
        </Card>

        <Card>
          <p className="text-note text-text-muted">Payment</p>
          {data.purchasedTierLevel ? (
            <>
              <p className="mt-2 text-h3 font-semibold text-text">{tierName(data.purchasedTierLevel)}</p>
              <p className="mt-1 text-note text-text-secondary">Paid {formatInr(paidTotal)}</p>
            </>
          ) : data.upsellTierLevel ? (
            <>
              <p className="mt-2 text-body font-medium text-text">Interested, not paid</p>
              <p className="mt-1 text-note text-text-secondary">{tierWithPrice(data.upsellTierLevel)}</p>
            </>
          ) : (
            <p className="mt-2 text-body text-text-secondary">Nothing yet</p>
          )}
        </Card>
      </div>

      {/* ----------------------------------------------- interest scores */}
      {data.scores && (
        <Card className="mt-6">
          <h2 className="text-h3 font-semibold text-text">Interest scores</h2>
          <ul className="mt-4 space-y-2.5">
            {ranked.map((t: RiasecType) => {
              const value = data.scores?.[t] ?? 0;
              return (
                <li key={t} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-note">
                  <span className="text-text">{RIASEC_LABELS[t]}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-surface-sunk">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(value / topScore) * 100}%`, backgroundColor: RIASEC_COLORS[t] }}
                    />
                  </span>
                  <span className="text-right font-mono text-text-secondary">{value}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {moduleNames.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-h3 font-semibold text-text">Deep-Dive scores</h2>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">
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

      {/* ------------------------------------------- the rest, on demand */}
      <h2 className="mt-12 text-note font-medium text-text-muted">More details</h2>
      <div className="mt-3 divide-y divide-hairline rounded-xl border border-hairline bg-surface">
        <Section title="Activity timeline" summary={`${timeline.length} events`}>
          <ol className="space-y-3">
            {timeline.map((event, i) => (
              <li key={`${event.label}-${event.iso}-${i}`} className="flex items-baseline justify-between gap-4 text-note">
                <span className={event.tone === "ok" ? "text-ok-700" : event.tone === "err" ? "text-err-700" : "text-text"}>
                  {event.label}
                  {event.detail && <span className="text-text-muted"> · {event.detail}</span>}
                </span>
                <span className="shrink-0 text-text-muted">
                  <AdminTimestamp iso={event.iso} />
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          title="Payments"
          summary={data.orders.length ? `${data.orders.length} checkout${data.orders.length === 1 ? "" : "s"}` : "None"}
        >
          {data.orders.length === 0 ? (
            <p className="text-note text-text-secondary">No checkout attempts yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.orders.map((order) => (
                <li key={order.id} className="text-note">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-text">
                      {tierName(order.tierLevel)} · {formatInr(order.amount / 100)}
                    </span>
                    <AdminBadge tone={ORDER_STATUS_TONE[order.status] ?? "muted"}>{order.status}</AdminBadge>
                  </div>
                  <p className="mt-1 font-mono text-text-muted">
                    {order.razorpayOrderId}
                    {order.razorpayPaymentId && ` · ${order.razorpayPaymentId}`}
                  </p>
                  <p className="text-text-muted">
                    <AdminTimestamp iso={order.updatedAt} />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Consent & verification" summary={data.consent.given ? "Consent given" : "No consent"}>
          <dl className="space-y-2 text-note">
            <Row label="Consent">
              {data.consent.given ? "Given" : "Not given"}
              {data.consent.version && <span className="text-text-muted"> (v{data.consent.version})</span>}
            </Row>
            {data.consent.consentedAt && (
              <Row label="Consented at">
                <AdminTimestamp iso={data.consent.consentedAt} />
              </Row>
            )}
            {data.otpEvents.map((otp) => (
              <Row key={otp.id} label={`${otp.purpose === "SIGN_IN" ? "Sign-in" : "Verify"} code`}>
                {otp.consumedAt ? "Used" : "Not used"} · <AdminTimestamp iso={otp.createdAt} />
              </Row>
            ))}
          </dl>
        </Section>

        <Section title="Source & reminders" summary={data.utm.source ?? "Direct"}>
          <dl className="space-y-2 text-note">
            <Row label="Source">{data.utm.source ?? "—"}</Row>
            <Row label="Medium">{data.utm.medium ?? "—"}</Row>
            <Row label="Campaign">{data.utm.campaign ?? "—"}</Row>
            <Row label="Reminder 2h">{data.reminders.sent2h ? <AdminTimestamp iso={data.reminders.sent2h} /> : "Not sent"}</Row>
            <Row label="Reminder 24h">{data.reminders.sent24h ? <AdminTimestamp iso={data.reminders.sent24h} /> : "Not sent"}</Row>
            <Row label="Reminder 72h">{data.reminders.sent72h ? <AdminTimestamp iso={data.reminders.sent72h} /> : "Not sent"}</Row>
          </dl>
        </Section>

        <Section title="Interest test answers" summary={`${data.answers.length} answered`}>
          <ol className="space-y-2 text-note">
            {data.answers.map((answer) => (
              <li key={answer.id} className="flex gap-3">
                <span className="w-6 shrink-0 text-right text-text-muted">{answer.id}</span>
                <span className="text-text-secondary">
                  <span className={answer.pickedText === answer.optionA ? "font-semibold text-text" : undefined}>
                    {answer.optionA}
                  </span>
                  {" / "}
                  <span className={answer.pickedText === answer.optionB ? "font-semibold text-text" : undefined}>
                    {answer.optionB}
                  </span>
                  {answer.pickedTrait && <span className="text-text-muted"> → {answer.pickedTrait}</span>}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </>
  );
}

/** A collapsed-by-default section — detail that's there when needed, out of the way otherwise. */
function Section({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <details className="group px-5 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-body font-medium text-text">
        <span>{title}</span>
        <span className="flex items-center gap-3 text-note font-normal text-text-muted">
          {summary}
          <span aria-hidden="true" className="transition-transform group-open:rotate-90">›</span>
        </span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right text-text">{children}</dd>
    </div>
  );
}
