"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Phone-only sticky CTA, shown once the hero has scrolled past (most ad
 * traffic arrives on a phone and the hero's own buttons go out of view
 * quickly). Hidden on sm+ where the hero's buttons stay reachable without it.
 */
export function StickyStartTestBar() {
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
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 p-4 backdrop-blur transition-transform duration-200 sm:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <ButtonLink
        href="/register"
        variant="accent"
        size="lg"
        className="w-full justify-center"
        tabIndex={visible ? 0 : -1}
      >
        Start free test
      </ButtonLink>
    </div>
  );
}
