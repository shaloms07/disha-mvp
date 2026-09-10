import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const CONTROL_BASE =
  "w-full min-h-12 rounded-lg border bg-surface px-4 py-3 text-body text-text " +
  "placeholder:text-text-muted/70 transition-colors " +
  "hover:border-brand-700 focus:border-brand-700 " +
  "disabled:cursor-not-allowed disabled:bg-surface-sunk disabled:opacity-70";

function controlClasses(invalid: boolean, className?: string) {
  return cn(
    CONTROL_BASE,
    invalid ? "border-err-700" : "border-control-line",
    className,
  );
}

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-body font-medium text-text">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-note text-text-muted">
          {hint}
        </p>
      )}
      <div className="mt-2">{children}</div>
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

/** Ties the control to its hint and error text for screen readers */
function describedBy(id: string, hint?: string, error?: string) {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

interface TextFieldProps extends Omit<ComponentProps<"input">, "id"> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
        className={controlClasses(Boolean(error), className)}
      />
    </FieldShell>
  );
}

interface SelectFieldProps extends Omit<ComponentProps<"select">, "id"> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  options: readonly string[];
}

export function SelectField({
  id,
  label,
  hint,
  error,
  placeholder,
  options,
  className,
  ...props
}: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
        className={controlClasses(Boolean(error), className)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
