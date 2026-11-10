/**
 * Plain-language labels shared by the admin list and detail pages, so both
 * describe a session, a tier and a time the same way.
 */

import type { AdminBadgeTone } from "@/components/admin/AdminBadge";
import type { AdminSessionRow } from "@/lib/api/admin";
import { formatInr, TIER_OPTIONS } from "@/lib/pricing";

/** What a session's status means to a person, with progress where it matters. */
export function statusSummary(row: Pick<AdminSessionRow, "status" | "answeredCount" | "totalQuestions">): {
  label: string;
  tone: AdminBadgeTone;
} {
  switch (row.status) {
    case "COMPLETED":
      return { label: "Completed", tone: "ok" };
    case "IN_PROGRESS":
      return { label: `In progress · ${row.answeredCount}/${row.totalQuestions}`, tone: "warn" };
    case "TIMED_OUT":
      return { label: `Stopped at ${row.answeredCount}/${row.totalQuestions}`, tone: "err" };
    default:
      return { label: "Not started", tone: "muted" };
  }
}

export function tierName(level?: number): string | undefined {
  if (!level) return undefined;
  return TIER_OPTIONS.find((t) => t.level === level)?.name ?? `Tier ${level}`;
}

export function tierWithPrice(level?: number): string | undefined {
  if (!level) return undefined;
  const option = TIER_OPTIONS.find((t) => t.level === level);
  return option ? `${option.name} · ${formatInr(option.total)}` : `Tier ${level}`;
}

/** Short plan names for the dashboard table, where the full names made the
 *  Payment column too wide. The detail page keeps the full names. */
const SHORT_TIER_NAMES: Record<number, string> = {
  1: "Career list",
  2: "Deep-Dive",
  3: "Full report",
  4: "Report + counsellor",
};

export function tierShortName(level?: number): string | undefined {
  if (!level) return undefined;
  return SHORT_TIER_NAMES[level] ?? `Tier ${level}`;
}

/** utm_source values, lower-cased, mapped to a platform name. Meta's dynamic
 *  {{site_source_name}} tag sends fb / ig / msg / an. */
const SOURCE_NAMES: Record<string, string> = {
  fb: "Facebook",
  facebook: "Facebook",
  "facebook.com": "Facebook",
  "m.facebook.com": "Facebook",
  "l.facebook.com": "Facebook",
  ig: "Instagram",
  instagram: "Instagram",
  "instagram.com": "Instagram",
  msg: "Messenger",
  messenger: "Messenger",
  an: "Meta Audience Network",
  meta: "Meta",
  google: "Google",
  youtube: "YouTube",
  yt: "YouTube",
  whatsapp: "WhatsApp",
  wa: "WhatsApp",
  email: "Email",
  sms: "SMS",
};

/** utm_medium values that mean a paid ad */
const PAID_MEDIUM = /^(paid|paid[_-]?social|cpc|ppc|cpm|cpv|ad|ads|display|sponsored)$/i;

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Where a registration came from, in words: "Facebook ad", "Instagram",
 * "Parent invite", "Direct / unknown". The campaign name, when tagged, is
 * the detail line. Built only from the UTM tags the landing link carried
 * (lib/utm.ts) - an ad whose link has no utm_ tags looks like direct traffic.
 */
export function sourceSummary(attribution: AdminSessionRow["attribution"]): {
  label: string;
  detail?: string;
  tone: AdminBadgeTone;
} {
  if (!attribution) return { label: "—", tone: "muted" };
  const source = attribution.utmSource?.trim();
  const medium = attribution.utmMedium?.trim();
  const campaign = attribution.utmCampaign?.trim() || undefined;

  if (source) {
    const platform = SOURCE_NAMES[source.toLowerCase()] ?? titleCase(source);
    const paid = Boolean(medium && PAID_MEDIUM.test(medium));
    return { label: paid ? `${platform} ad` : platform, detail: campaign, tone: paid ? "accent" : "ok" };
  }
  if (attribution.viaInvite) return { label: "Parent invite", detail: campaign, tone: "ok" };
  if (campaign) return { label: "Campaign link", detail: campaign, tone: "ok" };
  return { label: "Direct / unknown", tone: "muted" };
}

/** "just now", "5m ago", "3h ago", "2d ago" — then a plain date past a week. */
export function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const then = new Date(iso);
  const seconds = Math.max(0, Math.round((Date.now() - then.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
