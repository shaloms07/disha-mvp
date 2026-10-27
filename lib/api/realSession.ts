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
  /** Present on success - verifying a mobile number here signs the parent in too. */
  authToken?: string;
  parentName?: string;
  parentMobile?: string;
}

/** Thrown by parseJsonOrThrow - `code` lets a caller branch on a specific
 *  failure (e.g. ALREADY_REGISTERED) instead of just showing `.message`. */
export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function parseJsonOrThrow<T>(response: Response, fallbackError: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as (T & { error?: string; code?: string }) | null;
  if (!response.ok) {
    throw new ApiError(body?.error ?? fallbackError, body?.code);
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
  consentGiven?: boolean,
): Promise<RegisterSessionResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...data, consentGiven: Boolean(consentGiven), ...getStoredUtm() }),
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
  childClassOther?: string;
  consentGiven: boolean;
  otpVerified: boolean;
  schoolCode?: string;
  schoolId?: string;
  classId?: string;
  parentStatedPreference?: string;
  responses: Record<number, number>;
  scores?: Record<string, number>;
  completedAt?: string;
  /** Which paid tier (if any) was actually bought - may have happened on a
   *  different device than the one asking, so this is the source of truth
   *  for "already purchased", not local sessionStorage alone. */
  purchasedTierLevel?: number;
}

/** Powers app/resume/page.tsx's cross-device rehydration for a /resume?t=... link. */
export async function fetchSessionByToken(token: string): Promise<ServerSessionState | null> {
  const response = await fetch(`${API_BASE_URL}/session/${token}`);
  if (response.status === 404) return null;
  return parseJsonOrThrow(response, "Could not load this session.");
}

/** app/results/page.tsx's upsell tier picker - records which tier they're interested in. */
export async function registerReportInterest(
  token: string,
  tierLevel: 1 | 2 | 3 | 4,
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/session/${token}/interest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tierLevel }),
  });
  return parseJsonOrThrow(response, "Could not save your request. Please try again.");
}

export interface CreateCheckoutOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

/** app/pricing/page.tsx's checkout - the amount is recomputed server-side
 *  from the tier level, never trusted from here. */
export async function createCheckoutOrder(
  token: string,
  tierLevel: 1 | 2 | 3 | 4,
): Promise<CreateCheckoutOrderResponse> {
  const response = await fetch(`${API_BASE_URL}/session/${token}/checkout/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tierLevel }),
  });
  return parseJsonOrThrow(response, "Could not start checkout. Please try again.");
}

export interface VerifyCheckoutPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** Fired from Razorpay Checkout's client-side success callback - instant UX;
 *  the webhook (server-side) is the reliable fallback regardless of whether
 *  this call ever completes. */
export async function verifyCheckoutPayment(
  token: string,
  params: VerifyCheckoutPaymentParams,
): Promise<{ verified: boolean; tierLevel: number }> {
  const response = await fetch(`${API_BASE_URL}/session/${token}/checkout/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseJsonOrThrow(response, "Could not verify your payment. Please try again.");
}
