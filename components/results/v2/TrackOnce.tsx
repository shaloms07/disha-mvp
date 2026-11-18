"use client";

import { useEffect, useRef } from "react";

/** Calls `onMount` once per `eventKey` - e.g. result_view when a view first
 *  renders. A component, so app/results/page.tsx can fire it from below its
 *  early returns without breaking the order of its hooks. */
export function TrackOnce({ eventKey, onMount }: { eventKey: string; onMount: () => void }) {
  const fired = useRef<string | null>(null);
  useEffect(() => {
    if (fired.current === eventKey) return;
    fired.current = eventKey;
    onMount();
    // onMount is a fresh closure every render; eventKey is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKey]);
  return null;
}
