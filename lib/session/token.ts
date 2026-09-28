import { randomBytes } from "node:crypto";

/**
 * A real session token, same "dsh_" shape as lib/mockApi.ts's
 * generateMockToken() for continuity, but cryptographically random rather
 * than Math.random() — this one is security-bearing (it's the bearer
 * credential a /resume?t= link grants access with).
 */
export function generateSessionToken(): string {
  return `dsh_${randomBytes(9).toString("base64url")}`;
}
