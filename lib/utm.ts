/**
 * UTM capture for ad attribution. Deliberately independent of SessionContext
 * (lib/context/SessionContext.tsx) — a visitor's UTM params need to survive
 * from their very first landing, before a session/token exists at all, and
 * outlive whatever page they first land on.
 */

const STORAGE_KEY = "disha:utm";

export interface StoredUtm {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

const PARAM_MAP: Record<string, keyof StoredUtm> = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
};

/** Call once on first paint (see components/UtmCapture.tsx). No-ops if there's nothing to capture. */
export function captureUtmParams(search: string): void {
  if (!search) return;
  const params = new URLSearchParams(search);
  const found: StoredUtm = {};
  let any = false;

  for (const [key, field] of Object.entries(PARAM_MAP)) {
    const value = params.get(key);
    if (value) {
      found[field] = value;
      any = true;
    }
  }
  if (!any) return;

  try {
    // A later visit's UTM params (e.g. clicking a second ad) should win over
    // a stale first-touch value, so this overwrites rather than merges.
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found));
  } catch {
    // sessionStorage unavailable (private mode etc.) — attribution is best-effort.
  }
}

export function getStoredUtm(): StoredUtm {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredUtm) : {};
  } catch {
    return {};
  }
}
