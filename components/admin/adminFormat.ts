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
