/**
 * Sign-in bearer tokens (POST /auth/otp/verify), distinct from a session's
 * `dsh_` token (lib/session/token.ts) - this one grants access to every ward
 * on a mobile number, not just one test's progress.
 *
 * No pepper on the hash (unlike lib/otp.ts's 4-digit codes): a 192-bit random
 * token already has enough entropy that a bare sha256 of it is unrecoverable
 * without the plaintext, so a leaked table alone still grants nothing.
 */

import { createHash, randomBytes } from "node:crypto";

export const AUTH_TOKEN_TTL_DAYS = 30;

export function generateAuthToken(): string {
  return `auth_${randomBytes(24).toString("base64url")}`;
}

export function hashAuthToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function authTokenExpiryDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + AUTH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
