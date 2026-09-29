/**
 * Where the browser keeps the sign-in bearer token (server/API.md's
 * `auth_...` token from POST /auth/otp/verify). localStorage, not
 * sessionStorage — this credential should survive closing the tab and
 * reopening the site later, unlike the in-progress test state in
 * lib/context/SessionContext.tsx, which is deliberately per-tab.
 */

const AUTH_TOKEN_KEY = "mlc:authToken";

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

export function clearStoredAuthToken(): void {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore
  }
}
