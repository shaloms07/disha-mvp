"use client";

import { useSyncExternalStore } from "react";

const SHOW_AFTER_PX = 500;

/**
 * Scroll position is an external system, so it's read through
 * useSyncExternalStore rather than an effect — no cascading render, and the
 * server snapshot keeps hydration clean.
 */
function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange, { passive: true });
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

const isScrolled = () => window.scrollY > SHOW_AFTER_PX;
const isScrolledOnServer = () => false;

/** Floating "back to top" control, bottom-right on every screen. */
export function ScrollToTop() {
  const visible = useSyncExternalStore(
    subscribe,
    isScrolled,
    isScrolledOnServer,
  );

  if (!visible) return null;

  function handleClick() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Scroll back to top"
      className="disha-fade-in fixed bottom-6 right-6 z-50 flex size-12 items-center justify-center rounded-full bg-brand-700 text-white shadow-feature transition-colors hover:bg-brand-600 active:bg-brand-800"
      style={{
        // Clears the home indicator on iOS.
        bottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
