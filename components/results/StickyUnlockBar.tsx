"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * The pay bar that stays at the bottom of the screen once the result has
 * scrolled past - so a parent ready to buy never has to scroll back to the
 * offer. Phone-only, like StickyStartTestBar: on sm+ the offer cards are
 * within easy reach, and components/ui/ScrollToTop.tsx only lifts itself
 * clear of a bottom bar on phones.
 */
export function StickyUnlockBar({
  lockedSummary,
  unlockLabel,
  onUnlock,
  busy,
  askParentHref,
}: {
  lockedSummary: string;
  unlockLabel: string;
  onUnlock: () => void;
  busy: boolean;
  askParentHref?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > window.innerHeight * 0.6);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 px-4 pt-3 backdrop-blur transition-transform duration-200 sm:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-note text-text-secondary">🔒 {lockedSummary}</p>
        <div className="mt-2 flex gap-2">
          <Button
            variant="accent"
            size="md"
            className="flex-[1.4]"
            onClick={onUnlock}
            loading={busy}
            loadingText="Opening"
            tabIndex={visible ? 0 : -1}
          >
            {unlockLabel}
          </Button>
          {askParentHref && (
            <a
              href={askParentHref}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={visible ? 0 : -1}
              className="flex min-h-12 flex-1 items-center justify-center rounded-lg border border-ok-700/30 bg-ok-700/10 px-3 text-body font-medium text-ok-700"
            >
              Ask a parent
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
