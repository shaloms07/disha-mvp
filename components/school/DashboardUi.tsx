"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ panel */

/**
 * The dashboard's unit of content.
 *
 * Deliberately flatter and denser than the consumer product's Card: staff are
 * scanning many of these at once on a laptop, not reading one at a time on a
 * phone. Same tokens, different register.
 */
export function Panel({
  title,
  subtitle,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Controls that belong to this panel, pinned top-right */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-hairline bg-surface shadow-card",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-h3 font-semibold text-text">{title}</h2>
          {subtitle && (
            <div className="mt-1.5 max-w-2xl text-note text-text-secondary">
              {subtitle}
            </div>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      <div className={cn("px-5 py-5 sm:px-6", bodyClassName)}>{children}</div>
    </section>
  );
}

/* --------------------------------------------------------------- stat tile */

/**
 * A headline number. Used for the figures that need reading at a glance rather
 * than plotting — a one-bar bar chart would be the wrong form for these.
 */
export function StatTile({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "alert";
}) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5 shadow-card">
      <p className="text-note text-text-secondary">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-display font-semibold tabular-nums",
          tone === "alert" ? "text-accent-700" : "text-brand-800",
        )}
      >
        {value}
      </p>
      {detail && <p className="mt-1.5 text-note text-text-muted">{detail}</p>}
    </div>
  );
}

/* ------------------------------------------------------------- mock notice */

/**
 * Says on the screen itself that something is simulated.
 *
 * Every one of these marks a real constraint of this build, not decoration —
 * they are what stops a demo audience assuming a mocked flow is a working one.
 */
export function MockNotice({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex gap-2 rounded-lg border border-accent-100 bg-accent-100/50 px-3.5 py-2.5 text-note text-accent-700",
        className,
      )}
    >
      <span aria-hidden="true" className="font-semibold">
        Demo
      </span>
      <span className="text-text-secondary">{children}</span>
    </p>
  );
}

/* -------------------------------------------------------------- data table */

export function DataTable({
  headers,
  children,
  caption,
  className,
}: {
  headers: ReactNode[];
  children: ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("-mx-5 overflow-x-auto sm:-mx-6", className)}>
      <table className="w-full min-w-[34rem] border-collapse text-body">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-hairline text-left">
            {headers.map((header, i) => (
              <th
                key={i}
                scope="col"
                className="px-5 py-2.5 text-note font-medium text-text-secondary sm:px-6"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
  ...props
}: React.ComponentProps<"td">) {
  return (
    <td {...props} className={cn("px-5 py-3 align-middle sm:px-6", className)}>
      {children}
    </td>
  );
}

/* -------------------------------------------------------------------- pill */

const PILL_TONES = {
  neutral: "bg-surface-sunk text-text-secondary",
  good: "bg-brand-100 text-brand-800",
  progress: "bg-accent-100 text-accent-700",
  alert: "border border-err-700/30 bg-err-700/5 text-err-700",
} as const;

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof PILL_TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-note font-medium whitespace-nowrap",
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------- modal */

/**
 * A small dialog built on <dialog>, so focus trapping, Escape and inertness
 * are the browser's job rather than something reimplemented here.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  /** "lg" for the student flashcard, which carries four modules of detail */
  size?: "md" | "lg";
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself) dismisses.
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-xl border border-hairline bg-surface p-0 text-text shadow-feature",
        size === "lg" ? "max-w-2xl" : "max-w-lg",
        "backdrop:bg-ink-deep/45",
      )}
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-hairline bg-surface px-6 py-4">
        <div>
          <h2 className="text-h3 font-semibold text-text">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-note text-text-secondary">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 -mt-1 rounded-lg px-2 py-1 text-h3 leading-none text-text-muted hover:bg-surface-sunk hover:text-text"
        >
          <span className="sr-only">Close</span>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      {footer && (
        <div className="flex flex-wrap justify-end gap-3 border-t border-hairline px-6 py-4">
          {footer}
        </div>
      )}
    </dialog>
  );
}

/* ------------------------------------------------------------------- toast */

/**
 * Confirmation for the mocked actions (invitations, nudges, webinar).
 *
 * Announced politely rather than as an alert — nothing here is urgent, and
 * every one of them is a simulated send.
 */
export function Toast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 4200);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-6"
    >
      {message && (
        <div className="disha-fade-in pointer-events-auto flex max-w-md items-start gap-3 rounded-xl bg-brand-800 px-5 py-3.5 text-body text-on-dark shadow-feature">
          <span aria-hidden="true" className="mt-0.5 text-accent-400">
            ✓
          </span>
          <span>{message}</span>
          <button
            type="button"
            onClick={onDismiss}
            className="-mr-1 ml-2 rounded px-1.5 text-on-dark/70 hover:text-on-dark"
          >
            <span className="sr-only">Dismiss</span>
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </div>
  );
}
