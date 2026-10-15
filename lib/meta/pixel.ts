/**
 * Thin wrapper around window.fbq - the browser half of ad-funnel tracking.
 * Every call is a safe no-op if the Pixel script hasn't loaded yet (consent
 * not granted, or the script tag hasn't executed) - see components/meta/
 * MetaPixel.tsx for when it actually loads.
 */

type Fbq = (...args: unknown[]) => void;

function getFbq(): Fbq | undefined {
  return (window as unknown as { fbq?: Fbq }).fbq;
}

/** Meta's own recognised event names (PageView, CompleteRegistration, Purchase, ...). */
export function trackStandardEvent(
  eventName: string,
  params: Record<string, unknown> = {},
  eventId?: string,
): void {
  getFbq()?.("track", eventName, params, eventId ? { eventID: eventId } : undefined);
}

/** Our own event names (ClassSelected, ...) - never a child's name, answers or scores. */
export function trackCustomEvent(eventName: string, params: Record<string, unknown> = {}): void {
  getFbq()?.("trackCustom", eventName, params);
}
