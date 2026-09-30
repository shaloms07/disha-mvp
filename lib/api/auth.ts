/**
 * Client-side calls for sign-in / wards / logout (server/API.md's
 * POST /auth/otp/send, POST /auth/otp/verify, GET /me/wards, POST
 * /auth/logout). Mirrors lib/api/realSession.ts's shape and error handling.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export interface WardSummary {
  sessionToken: string;
  childName: string;
  childClass: string;
  childClassOther?: string;
  schoolCode?: string;
  status: "REGISTERED" | "IN_PROGRESS" | "COMPLETED" | "TIMED_OUT";
  answeredCount: number;
  totalQuestions: number;
  completedAt?: string;
  lastActivityAt: string;
  createdAt: string;
  scores?: Record<string, number>;
}

export interface SendSignInOtpResponse {
  success: boolean;
}

export interface VerifySignInOtpResponse {
  verified: boolean;
  token?: string;
  wards?: WardSummary[];
  error?: string;
}

/** Thrown by fetchWards()/logout() when the stored auth token is missing/expired/revoked. */
export class AuthExpiredError extends Error {
  constructor() {
    super("Your sign-in has expired. Please sign in again.");
    this.name = "AuthExpiredError";
  }
}

async function parseJsonOrThrow<T>(response: Response, fallbackError: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(body?.error ?? fallbackError);
  }
  return body as T;
}

export async function sendSignInOtp(mobile: string): Promise<SendSignInOtpResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile }),
  });
  return parseJsonOrThrow(response, "Could not send the code. Please try again.");
}

export async function verifySignInOtp(mobile: string, code: string): Promise<VerifySignInOtpResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile, code }),
  });
  return parseJsonOrThrow(response, "Could not verify the code. Please try again.");
}

export async function fetchWards(authToken: string): Promise<WardSummary[]> {
  const response = await fetch(`${API_BASE_URL}/me/wards`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (response.status === 401) throw new AuthExpiredError();
  const body = await parseJsonOrThrow<{ wards: WardSummary[] }>(
    response,
    "Could not load your wards. Please try again.",
  );
  return body.wards;
}

/** Best-effort - the caller clears the local token either way. */
export async function logout(authToken: string): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${authToken}` },
  }).catch((error: unknown) => {
    console.error("[auth] logout request failed", error);
  });
}
