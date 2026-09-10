import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Parental consent gate. The child taking the test is a minor, so the parent
 * has to actively confirm before the test can start.
 */
export function ConsentCheckbox({
  id = "consent",
  checked,
  onChange,
  children,
  error,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  error?: string;
}) {
  return (
    <div>
      <div
        className={cn(
          "flex gap-4 rounded-lg border p-5 transition-colors",
          checked
            ? "border-brand-700 bg-brand-50"
            : "border-control-line bg-surface",
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 accent-brand-700"
        />
        <label htmlFor={id} className="text-body leading-relaxed text-text">
          {children}
        </label>
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-note text-err-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
