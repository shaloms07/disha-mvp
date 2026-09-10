import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant =
  | "primary"
  | "accent"
  | "accentOnDark"
  | "secondary"
  | "quiet"
  | "quietOnDark";
type Size = "sm" | "md" | "lg";

/**
 * `accent` is the loud one and is rationed — one per screen at most, on the
 * single action we actually want taken. Everything else is `primary` (petrol)
 * or quieter.
 */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-600 active:bg-brand-800",
  accent: "bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-700",
  // On dark fields the accent goes bright and takes ink text (7.11:1)
  accentOnDark:
    "bg-accent-400 text-ink-deep hover:bg-accent-300 active:bg-accent-300",
  secondary:
    "border border-control-line bg-surface text-text hover:bg-brand-50 hover:border-brand-700",
  quiet: "text-brand-700 hover:bg-brand-50",
  quietOnDark: "text-on-dark border border-white/25 hover:bg-white/10",
};

// Minimum heights keep every control at a comfortable tap target on phones.
const SIZES: Record<Size, string> = {
  sm: "min-h-10 px-4 text-note",
  md: "min-h-12 px-5 text-body",
  lg: "min-h-14 px-7 text-lead",
};

function buttonClasses(variant: Variant, size: Size, className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2.5 rounded-lg font-medium",
    "transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and blocks interaction while a mock API call is in flight */
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      className={buttonClasses(variant, size, className)}
    >
      {loading && <Spinner />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link {...props} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
