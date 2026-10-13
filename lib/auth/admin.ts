/**
 * Auth for the internal /admin dashboard - a single operator, not a
 * multi-user system, so this is deliberately simpler than AuthSession
 * (lib/auth/token.ts): credentials live in env vars, not a Parent/User table,
 * and the session token is a stateless signed+timestamped value (no DB row),
 * verified by re-computing its HMAC rather than looking anything up.
 *
 * Trade-off worth knowing: there's no server-side revocation, so "logging
 * out" just discards the token client-side - a copied token stays valid
 * until it expires (ADMIN_TOKEN_TTL_MS). Fine for a single trusted operator;
 * revisit (e.g. a DB-backed AdminSession like AuthSession) if that changes.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const ADMIN_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function sessionSecret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return value;
}

export function hashAdminPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/** Constant-time string compare; unequal lengths still consume compare time. */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function checkAdminCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME ?? "";
  const expectedHash = process.env.ADMIN_PASSWORD_HASH ?? "";
  return (
    timingSafeEqualStrings(username, expectedUsername) &&
    timingSafeEqualStrings(hashAdminPassword(password), expectedHash)
  );
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function generateAdminToken(): string {
  const payload = String(Date.now() + ADMIN_TOKEN_TTL_MS);
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token: string | null): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!timingSafeEqualStrings(signature, sign(payload))) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
