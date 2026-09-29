/**
 * Real backend calls for the free funnel, replacing lib/mockApi.ts's
 * mockRegisterSession/mockSendOtp/mockVerifyOtp at the same call sites in
 * app/register/page.tsx and app/resume/page.tsx. Response shapes match the
 * mocks' where possible; sendOtp/verifyOtp additionally need the
 * sessionToken the mocks never did, since a real OTP has to be tied to a
 * real session/mobile pair server-side (lib/otp.ts, server/routes/otp.ts).
 *
 * These calls go to the STANDALONE Express API (server/), not to this
 * Next.js app's own routes - the two are deployed separately (frontend on
 * Vercel, API + database together on the VPS) so the database never has to
 * be reachable from the public internet. NEXT_PUBLIC_API_BASE_URL points at
 * that API; it's a public (browser-visible) env var since these are
 * client-side fetch calls, same as any other API base URL.
 */

import { getStoredUtm } from "@/lib/utm";
import type { RegistrationInput } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export interface RegisterSessionResponse {
  sessionToken: string;
}

export interface SendOtpResponse {
  success: boolean;
  error?: string;
}

export interface VerifyOtpResponse {
  verified: boolean;
  error?: string;
}

async function parseJsonOrThrow<T>(response: Response, fallbackError: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(body?.error ?? fallbackError);
  }
  return body as T;
}

/**
 * `authToken`, when the caller is signed in (see lib/auth/client.ts), attaches
 * this registration to their existing Parent record server-side instead of
 * creating a new one - see server/API.md's note on POST /register.
 */
export async function registerSession(
  data: RegistrationInput,
  authToken?: string | null,
): Promise<RegisterSessionResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...data, ...getStoredUtm() }),
  });
  return parseJsonOrThrow(response, "Registration failed. Please try again.");
}

export async function sendOtp(sessionToken: string, mobile: string): Promise<SendOtpResponse> {
  const response = await fetch(`${API_BASE_URL}/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken, mobile }),
  });
  return parseJsonOrThrow(response, "Could not send the code. Please try again.");
}

export async function verifyOtp(sessionToken: string, code: string): Promise<VerifyOtpResponse> {
  const response = await fetch(`${API_BASE_URL}/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken, code }),
  });
  return parseJsonOrThrow(response, "Could not verify the code. Please try again.");
}

export interface ServerSessionState {
  sessionToken: string;
  parentName: string;
  parentMobile: string;
  childName: string;
  childClass: string;
  consentGiven: boolean;
  otpVerified: boolean;
  schoolCode?: string;
  schoolId?: string;
  classId?: string;
  parentStatedPreference?: string;
  responses: Record<number, number>;
  scores?: Record<string, number>;
  completedAt?: string;
}

/** Powers app/resume/page.tsx's cross-device rehydration for a /resume?t=... link. */
export async function fetchSessionByToken(token: string): Promise<ServerSessionState | null> {
  const response = await fetch(`${API_BASE_URL}/session/${token}`);
  if (response.status === 404) return null;
  return parseJsonOrThrow(response, "Could not load this session.");
}
