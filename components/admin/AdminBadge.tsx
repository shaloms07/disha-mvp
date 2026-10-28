import { cn } from "@/lib/cn";

/** Tone, not status name, so any caller (session status, order status, ...)
 *  can reuse the same five visual buckets without a parallel enum. */
export type AdminBadgeTone = "ok" | "warn" | "err" | "accent" | "muted";

const TONES: Record<AdminBadgeTone, string> = {
  ok: "bg-ok-700/10 text-ok-700",
  warn: "bg-accent-700/10 text-accent-700",
  err: "bg-err-700/10 text-err-700",
  accent: "bg-brand-700/10 text-brand-800",
  muted: "bg-surface-sunk text-text-secondary",
};

const DOT_TONES: Record<AdminBadgeTone, string> = {
  ok: "bg-ok-700",
  warn: "bg-accent-700",
  err: "bg-err-700",
  accent: "bg-brand-700",
  muted: "bg-text-muted",
};

/** A small status pill with a coloured dot - used wherever the admin
 *  dashboard shows a session/order/OTP state, so these all read the same
 *  visual language instead of plain coloured text. */
export function AdminBadge({ tone, children }: { tone: AdminBadgeTone; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-note font-medium",
        TONES[tone],
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", DOT_TONES[tone])} />
      {children}
    </span>
  );
}
