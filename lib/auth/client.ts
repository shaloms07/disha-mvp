/**
 * Where the browser keeps the sign-in bearer token (server/API.md's
 * `auth_...` token from POST /auth/otp/verify). localStorage, not
 * sessionStorage — this credential should survive closing the tab and
 * reopening the site later, unlike the in-progress test state in
 * lib/context/SessionContext.tsx, which is deliberately per-tab.
 *
 * The signed-in parent's name/mobile are cached alongside it (set once at
 * sign-in - see app/signin/page.tsx) so /register never has to ask for them
 * again when adding another ward: the backend already knows this parent by
 * their auth token, and now the form does too.
 */

import { normalizeMobile } from "@/lib/validation";

const AUTH_TOKEN_KEY = "mlc:authToken";
const AUTH_PARENT_KEY = "mlc:authParent";

export interface StoredParentIdentity {
  name: string;
  mobile: string;
}

export function getStoredAuthToken(): string | null {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    // Unavailable in private mode or with site data blocked.
    return null;
  }
}

export function setStoredAuthToken(token: string): void {
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function getStoredParentIdentity(): StoredParentIdentity | null {
  try {
    const raw = window.localStorage.getItem(AUTH_PARENT_KEY);
    return raw ? (JSON.parse(raw) as StoredParentIdentity) : null;
  } catch {
    return null;
  }
}

export function setStoredParentIdentity(identity: StoredParentIdentity): void {
  try {
    window.localStorage.setItem(AUTH_PARENT_KEY, JSON.stringify(identity));
  } catch {
    // ignore
  }
}

/**
 * Whether this browser is signed in as the parent who owns a session - a
 * stored sign-in token, and the stored parent's mobile matching the
 * session's. Browser-only and best-effort: it decides which button is the
 * main one, never what anyone can see or pay for. A phone the parent signed
 * in on but the child is holding still reads as the parent's.
 */
export function isSignedInParentOf(sessionParentMobile?: string): boolean {
  if (!sessionParentMobile || !getStoredAuthToken()) return false;
  const stored = getStoredParentIdentity()?.mobile;
  return Boolean(stored) && normalizeMobile(stored!) === normalizeMobile(sessionParentMobile);
}

export function clearStoredAuthToken(): void {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_PARENT_KEY);
  } catch {
    // ignore
  }
}
