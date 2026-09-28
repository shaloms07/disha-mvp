/**
 * OTP generation, hashing and verification. The plaintext code is never
 * stored — only a salted hash (lib/db.ts's OtpCode.codeHash) — and every
 * check here is a plain server-side function so the OTP route handlers
 * under app/api/otp/ stay thin.
 */

import { createHash, randomInt } from "node:crypto";

export const OTP_LENGTH = 4;
export const OTP_TTL_MINUTES = 10;
export const MAX_VERIFY_ATTEMPTS = 5;
export const MAX_SENDS_PER_SESSION_WINDOW = 3;
export const MAX_SENDS_PER_MOBILE_WINDOW = 5;
export const SEND_WINDOW_MINUTES = 60;

export function generateOtpCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

/**
 * Salted with OTP_HASH_SECRET so a leaked database alone (without the env
 * secret) isn't enough to recover a code by hashing 0000-9999 and comparing.
 */
export function hashOtpCode(code: string, mobile: string): string {
  const secret = process.env.OTP_HASH_SECRET ?? "";
  return createHash("sha256").update(`${secret}:${mobile}:${code}`).digest("hex");
}

export function otpExpiryDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + OTP_TTL_MINUTES * 60 * 1000);
}

export function sendWindowStart(from: Date = new Date()): Date {
  return new Date(from.getTime() - SEND_WINDOW_MINUTES * 60 * 1000);
}
