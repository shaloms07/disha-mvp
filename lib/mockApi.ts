/**
 * Mocked "backend" (SPEC.md Section 6).
 *
 * Nothing in this file touches the network. Every function is a local async
 * function with an artificial delay, so screens get realistic loading states
 * without a server, an SMS gateway, or a payment provider existing yet.
 *
 * This is the single swap point for a real backend later: the exported
 * signatures below are the contract the screens code against, so replacing the
 * body of each function with a real `fetch` should require no screen changes.
 */

import type { RegistrationInput, SelectedTiers } from "@/types";

/** Artificial latency per call, in ms — tuned to feel like a real request */
export const MOCK_DELAYS = {
  registerSession: 600,
  sendOtp: 500,
  verifyOtp: 500,
  checkout: 800,
  bookConsultation: 700,
} as const;

/** The OTP quoted on the demo screen. Any 4-digit code is accepted too. */
export const DEMO_OTP = "1234";

/* ------------------------------------------------------------- responses */

export interface MockRegisterSessionResponse {
  sessionToken: string;
}

export interface MockSendOtpResponse {
  success: true;
}

export interface MockVerifyOtpResponse {
  verified: boolean;
}

export interface MockCheckoutResponse {
  success: true;
  orderId: string;
}

export interface MockBookConsultationResponse {
  success: true;
  bookingId: string;
}

/* --------------------------------------------------------------- helpers */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Random id fragment. Math.random is fine here — these are throwaway demo
 * identifiers, never anything security-bearing. The alphabet leaves out
 * 0/O/1/I/L so a token stays readable if someone reads it off a screen.
 */
function randomFragment(length: number): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function generateMockToken(): string {
  return `dsh_${randomFragment(12)}`;
}

export function generateMockOrderId(): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  return `DISHA-${stamp}-${randomFragment(5)}`;
}

/* ------------------------------------------------------------ mock calls */

/**
 * Stands in for "create parent + child + test session".
 * Nothing is persisted server-side — the caller stores the token in
 * SessionContext.
 */
export async function mockRegisterSession(
  data: RegistrationInput,
): Promise<MockRegisterSessionResponse> {
  await delay(MOCK_DELAYS.registerSession);
  void data; // a real implementation would POST this
  return { sessionToken: generateMockToken() };
}

/** Stands in for an SMS/WhatsApp OTP send. No message is sent anywhere. */
export async function mockSendOtp(mobile: string): Promise<MockSendOtpResponse> {
  await delay(MOCK_DELAYS.sendOtp);
  void mobile; // a real implementation would call an SMS provider
  return { success: true };
}

/**
 * Accepts the demo code 1234, or any 4-digit code, so a live demo can't get
 * stuck on a forgotten code.
 */
export async function mockVerifyOtp(
  code: string,
): Promise<MockVerifyOtpResponse> {
  await delay(MOCK_DELAYS.verifyOtp);
  const verified = code === DEMO_OTP || /^\d{4}$/.test(code);
  return { verified };
}

/** Stands in for a payment gateway. Always succeeds; no money moves. */
export async function mockCheckout(
  tiers: SelectedTiers,
): Promise<MockCheckoutResponse> {
  await delay(MOCK_DELAYS.checkout);
  void tiers; // a real implementation would create an order for these tiers
  return { success: true, orderId: generateMockOrderId() };
}

/**
 * Stands in for a Calendly/Cal.com-style booking call. No real counsellor
 * calendar exists anywhere — this always succeeds and hands back a fake
 * booking id.
 */
export async function mockBookConsultation(
  slotLabel: string,
): Promise<MockBookConsultationResponse> {
  await delay(MOCK_DELAYS.bookConsultation);
  void slotLabel; // a real implementation would create the calendar event
  return { success: true, bookingId: `CALL-${randomFragment(6)}` };
}
