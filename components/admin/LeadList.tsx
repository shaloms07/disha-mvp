import Link from "next/link";
import type { ReactNode } from "react";
import { sourceSummary, tierShortName, timeAgo } from "@/components/admin/adminFormat";
import { whatsappChatUrl } from "@/lib/admin/contactLinks";
import type { AdminSessionRow } from "@/lib/api/admin";
import { cn } from "@/lib/cn";
import { formatMobile, normalizeMobile } from "@/lib/validation";

/**
 * The /admin dashboard's list of registrations. One row per lead, read left
 * to right as a story: who (student + parent, with call / WhatsApp at hand),
 * how far they got (one journey tracker instead of separate status, tests and
 * payment columns), what they bought, which ad brought them, and when. A grid,
 * not a <table>, so the same row becomes a stacked card on a phone. The whole
 * row opens the lead's detail page (a stretched link); the call and WhatsApp
 * buttons sit above it.
 */

/** Desktop column template - shared by the header and every row */
const COLUMNS =
  "lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_minmax(0,0.85fr)_minmax(0,1.3fr)_5rem]";

const RIASEC_COLORS: Record<string, string> = {
  R: "var(--color-riasec-r)",
  I: "var(--color-riasec-i)",
  A: "var(--color-riasec-a)",
  S: "var(--color-riasec-s)",
  E: "var(--color-riasec-e)",
  C: "var(--color-riasec-c)",
};

export function LeadList({ rows, loading }: { rows?: AdminSessionRow[]; loading: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
      <div
        role="row"
        className={cn(
          "hidden gap-5 border-b border-hairline bg-surface-sunk/70 px-5 py-3 text-[0.75rem] font-semibold uppercase tracking-wider text-text-muted lg:grid",
          COLUMNS,
        )}
      >
        <span>Student</span>
        <span>Parent</span>
        <span>Journey</span>
        <span>Plan</span>
        <span>Source</span>
        <span className="text-right">Joined</span>
      </div>

      {loading ? (
        <ul aria-busy="true" aria-label="Loading registrations">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex animate-pulse items-center gap-4 border-b border-hairline px-5 py-5 last:border-0">
              <span className="size-10 shrink-0 rounded-full bg-surface-sunk" />
              <span className="h-3 w-1/4 rounded-full bg-surface-sunk" />
              <span className="ml-auto hidden h-3 w-1/3 rounded-full bg-surface-sunk sm:block" />
            </li>
          ))}
        </ul>
      ) : !rows || rows.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-h3 font-semibold text-text">No registrations found</p>
          <p className="mt-1 text-body text-text-secondary">Try a different name or mobile number.</p>
        </div>
      ) : (
        <ul>
          {rows.map((row) => (
            <LeadRow key={row.sessionToken} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LeadRow({ row }: { row: AdminSessionRow }) {
  const href = `/admin/${encodeURIComponent(row.sessionToken)}`;
  const source = sourceSummary(row.attribution);
  const mobile = normalizeMobile(row.parentMobile);

  return (
    <li
      className={cn(
        "group relative grid grid-cols-2 gap-x-4 gap-y-3 border-b border-hairline px-4 py-4 transition-colors last:border-0 hover:bg-brand-50/60 sm:px-5 lg:items-center lg:gap-5",
        COLUMNS,
      )}
    >
      {/* Stretched link: the whole row opens the lead */}
      <Link
        href={href}
        aria-label={`Open ${row.childName}'s registration`}
        className="absolute inset-0 z-0 rounded-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-700"
      />

      {/* Student */}
      <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
        <Avatar name={row.childName} code={row.hollandCode} />
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-semibold text-text">
            <span className="truncate">{row.childName}</span>
            {row.isTest && (
              <span className="shrink-0 rounded-md bg-surface-sunk px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-text-muted">
                Test
              </span>
            )}
          </p>
          <div className="mt-1 flex items-center gap-2 text-note text-text-secondary">
            <span className="whitespace-nowrap">{classLabel(row.childClass)}</span>
            {row.hollandCode && <HollandCode code={row.hollandCode} />}
          </div>
        </div>
      </div>

      {/* Parent */}
      <div className="col-span-2 flex min-w-0 items-center justify-between gap-3 lg:col-span-1">
        <div className="min-w-0">
          <p className="truncate text-text">{row.parentName}</p>
          <p className="whitespace-nowrap text-note tabular-nums text-text-secondary">{formatMobile(row.parentMobile)}</p>
        </div>
        {mobile.length === 10 && (
          <div className="relative z-10 flex shrink-0 gap-1">
            <IconLink href={`tel:+91${mobile}`} label={`Call ${row.parentName}`}>
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
            </IconLink>
            <IconLink href={whatsappChatUrl(row.parentMobile)!} label={`WhatsApp ${row.parentName}`} external>
              <path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.55L3.5 20.5l1-4.4A8.5 8.5 0 1 1 20.5 12z" />
              <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5" />
            </IconLink>
          </div>
        )}
      </div>

      {/* Journey */}
      <Journey row={row} />

      {/* Plan */}
      <Plan row={row} />

      {/* Source */}
      <div className="min-w-0">
        {source.label === "—" ? (
          <span className="text-note text-text-muted">No source</span>
        ) : (
          <>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-note font-medium",
                source.tone === "accent"
                  ? "bg-brand-700/10 text-brand-800"
                  : source.tone === "ok"
                    ? "bg-ok-700/10 text-ok-700"
                    : "bg-surface-sunk text-text-secondary",
              )}
            >
              {source.label}
            </span>
            {source.detail && (
              <p className="mt-1 line-clamp-2 text-note leading-snug text-text-secondary" title={source.detail}>
                {source.detail}
              </p>
            )}
          </>
        )}
      </div>

      {/* Joined */}
      <div className="col-span-2 flex items-center justify-between gap-2 lg:col-span-1 lg:block lg:text-right">
        <time
          dateTime={row.createdAt}
          title={new Date(row.createdAt).toLocaleString("en-IN")}
          className="whitespace-nowrap text-note text-text-secondary"
        >
          {timeAgo(row.createdAt)}
        </time>
        <span aria-hidden="true" className="text-text-muted transition-transform group-hover:translate-x-0.5 lg:hidden">
          →
        </span>
      </div>
    </li>
  );
}

function classLabel(childClass: string): string {
  return /^\d+$/.test(childClass.trim()) ? `Class ${childClass.trim()}` : childClass;
}

function Avatar({ name, code }: { name: string; code?: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";
  const color = code ? RIASEC_COLORS[code[0]] : undefined;
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-note font-semibold text-brand-800 ring-2 ring-surface"
      style={color ? { backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color } : undefined}
    >
      {initials}
    </span>
  );
}

function HollandCode({ code }: { code: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Holland code ${code}`} title={`Holland code ${code}`}>
      {code.split("").map((letter, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="flex size-5 items-center justify-center rounded text-[0.7rem] font-bold text-white"
          style={{ backgroundColor: RIASEC_COLORS[letter] ?? "var(--color-text-muted)" }}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}

type StepState = "done" | "partial" | "stalled" | "todo";

/**
 * Three steps after registering: the interest test, the Deep-Dive, payment.
 * Segments fill as they're done; the caption says where the lead is now.
 */
function Journey({ row }: { row: AdminSessionRow }) {
  const interest: StepState =
    row.status === "COMPLETED"
      ? "done"
      : row.status === "TIMED_OUT"
        ? "stalled"
        : row.status === "IN_PROGRESS"
          ? "partial"
          : "todo";
  const ddDone = row.deepDiveModulesDone ?? 0;
  const ddTotal = row.deepDiveModulesTotal ?? 3;
  const deepDive: StepState = ddDone >= ddTotal ? "done" : ddDone > 0 ? "partial" : "todo";
  const paid: StepState = row.purchasedTierLevel ? "done" : "todo";

  let caption: string;
  let tone: "ok" | "warn" | "err" | "muted";
  if (paid === "done") {
    caption = deepDive === "done" ? "Paid · all tests done" : "Paid";
    tone = "ok";
  } else if (deepDive === "done") {
    caption = "All tests done · not paid";
    tone = "warn";
  } else if (deepDive === "partial") {
    caption = `Deep-Dive ${ddDone}/${ddTotal}`;
    tone = "warn";
  } else if (interest === "done") {
    caption = "Interest test done";
    tone = "ok";
  } else if (interest === "stalled") {
    caption = `Stopped at ${row.answeredCount}/${row.totalQuestions}`;
    tone = "err";
  } else if (interest === "partial") {
    caption = `Interest test ${row.answeredCount}/${row.totalQuestions}`;
    tone = "warn";
  } else {
    caption = "Registered, not started";
    tone = "muted";
  }

  const steps: { label: string; state: StepState; progress?: number }[] = [
    {
      label: "Interest test",
      state: interest,
      progress: row.totalQuestions ? row.answeredCount / row.totalQuestions : 0,
    },
    { label: "Deep-Dive", state: deepDive, progress: ddDone / ddTotal },
    { label: "Paid", state: paid },
  ];

  return (
    <div className="col-span-2 min-w-0 lg:col-span-1" aria-label={`Journey: ${caption}`}>
      <div className="flex gap-1" aria-hidden="true">
        {steps.map((step) => (
          <span key={step.label} title={step.label} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunk">
            <span
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                step.state === "stalled" ? "bg-err-700/70" : step.state === "done" ? "bg-ok-700" : "bg-accent-600",
              )}
              style={{
                width:
                  step.state === "done"
                    ? "100%"
                    : step.state === "todo"
                      ? "0%"
                      : `${Math.max(8, Math.round((step.progress ?? 0) * 100))}%`,
              }}
            />
          </span>
        ))}
      </div>
      <p
        className={cn(
          "mt-1.5 truncate text-note font-medium",
          tone === "ok" && "text-ok-700",
          tone === "warn" && "text-accent-700",
          tone === "err" && "text-err-700",
          tone === "muted" && "text-text-muted",
        )}
      >
        {caption}
      </p>
    </div>
  );
}

function Plan({ row }: { row: AdminSessionRow }) {
  const paid = tierShortName(row.purchasedTierLevel);
  const interested = tierShortName(row.upsellTierLevel);
  if (paid) {
    return (
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1 rounded-full bg-ok-700 px-2.5 py-0.5 text-note font-semibold text-white">
          ✓ Paid
        </span>
        <p className="mt-1 truncate text-note text-text-secondary">{paid}</p>
      </div>
    );
  }
  if (interested) {
    return (
      <div className="min-w-0">
        <span className="inline-flex rounded-full border border-accent-600/40 px-2.5 py-0.5 text-note font-medium text-accent-700">
          Interested
        </span>
        <p className="mt-1 truncate text-note text-text-secondary">{interested}</p>
      </div>
    );
  }
  return <span className="text-note text-text-muted">No plan yet</span>;
}

function IconLink({
  href,
  label,
  external = false,
  children,
}: {
  href: string;
  label: string;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex size-8 items-center justify-center rounded-full border border-hairline bg-surface text-brand-700 transition-colors hover:border-brand-700 hover:bg-brand-700 hover:text-white"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </a>
  );
}
