/**
 * Real backend calls for the free funnel, replacing lib/mockApi.ts's
 * mockRegisterSession/mockSendOtp/mockVerifyOtp at the same call sites in
 * app/register/page.tsx and app/resume/page.tsx. Response shapes match the
 * mocks' where possible; sendOtp/verifyOtp additionally need the
 * sessionToken the mocks never did, since a real OTP has to be tied to a
 * real session/mobile pair server-side (lib/otp.ts, app/api/otp/*).
 */

import { getStoredUtm } from "@/lib/utm";
import type { RegistrationInput } from "@/types";

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

export async function registerSession(data: RegistrationInput): Promise<RegisterSessionResponse> {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, ...getStoredUtm() }),
  });
  return parseJsonOrThrow(response, "Registration failed. Please try again.");
}

export async function sendOtp(sessionToken: string, mobile: string): Promise<SendOtpResponse> {
  const response = await fetch("/api/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken, mobile }),
  });
  return parseJsonOrThrow(response, "Could not send the code. Please try again.");
}

export async function verifyOtp(sessionToken: string, code: string): Promise<VerifyOtpResponse> {
  const response = await fetch("/api/otp/verify", {
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
  const response = await fetch(`/api/session/${token}`);
  if (response.status === 404) return null;
  return parseJsonOrThrow(response, "Could not load this session.");
}
