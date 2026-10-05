"use client";

import { useCallback, useEffect, useState } from "react";

/** How long "Resend code" stays locked after a code goes out */
export const RESEND_COOLDOWN_SECONDS = 30;

/**
 * A countdown that locks the "Resend code" button after each send, so a
 * parent waiting on a slow SMS can't fire off a burst of codes (each one is a
 * paid SMS, and the server's hourly cap would lock them out anyway).
 *
 * Driven by an end timestamp rather than a decrementing counter, so a tab
 * that was backgrounded (where timers are throttled) still shows the right
 * time the moment it comes back.
 */
export function useResendCooldown(seconds = RESEND_COOLDOWN_SECONDS) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  const secondsLeft =
    endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
  const coolingDown = secondsLeft > 0;

  useEffect(() => {
    if (!coolingDown) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [coolingDown]);

  /** Call once a code has actually been sent */
  const start = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setEndsAt(t + seconds * 1000);
  }, [seconds]);

  /** Unlock straight away — e.g. the mobile number was changed */
  const reset = useCallback(() => setEndsAt(null), []);

  return { secondsLeft, coolingDown, start, reset };
}
