/**
 * Client-side calls for the internal /admin dashboard (POST /admin/login,
 * GET /admin/dashboard). Mirrors lib/api/auth.ts's shape - a single bearer
 * token kept client-side (localStorage, not a cookie - different origin).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export interface AdminSessionRow {
  sessionToken: string;
  parentName: string;
  parentMobile: string;
  childName: string;
  childClass: string;
  status: "REGISTERED" | "IN_PROGRESS" | "COMPLETED" | "TIMED_OUT";
  answeredCount: number;
  totalQuestions: number;
  hollandCode?: string;
  /** lib/pricing.ts's TierOption.level - which upsell tier they clicked "I'm interested" on, if any */
  upsellTierLevel?: number;
  /** The real paid tier from a verified Razorpay payment - distinct from upsellTierLevel, which is only ever an expressed interest, never a charge */
  purchasedTierLevel?: number;
  createdAt: string;
  completedAt?: string;
  /** Where the registration came from - absent from an API older than this field */
  attribution?: {
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    viaInvite: boolean;
  };
  /** The team's own test registration (lib/admin/testRecords.ts) - only
   *  listed when the dashboard asks for test records */
  isTest?: boolean;
}

export interface AdminDashboard {
  stats: { totalParents: number; totalSessions: number; completedSessions: number };
  page: number;
  pageSize: number;
  total: number;
  sessions: AdminSessionRow[];
}

export interface AdminAnswerRow {
  id: number;
  optionA: string;
  optionB: string;
  pickedText?: string;
  pickedTrait?: string;
}

export interface AdminOrderRow {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  /** Paise, matching Razorpay's own convention */
  amount: number;
  currency: string;
  tierLevel: number;
  status: "CREATED" | "PAID" | "FAILED";
  createdAt: string;
  updatedAt: string;
}

export interface AdminOtpEventRow {
  id: string;
  mobile: string;
  purpose: "SESSION_VERIFY" | "SIGN_IN";
  attempts: number;
  consumedAt?: string;
  expiresAt: string;
  createdAt: string;
}

export interface AdminSessionDetail {
  sessionToken: string;
  parent: { name: string; mobile: string };
  child: { name: string; grade: string };
  status: AdminSessionRow["status"];
  answeredCount: number;
  totalQuestions: number;
  scores?: Record<string, number>;
  hollandCode?: string;
  answers: AdminAnswerRow[];
  moduleResponses: Record<string, unknown>;
  moduleScores: Record<string, unknown>;
  upsellTierLevel?: number;
  purchasedTierLevel?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  lastActivityAt: string;
  consent: { given: boolean; consentedAt?: string; version?: string };
  utm: { source?: string; medium?: string; campaign?: string };
  reminders: { sent2h?: string; sent24h?: string; sent72h?: string };
  orders: AdminOrderRow[];
  otpEvents: AdminOtpEventRow[];
  unlockedVia?: string;
  whatsappMessages?: AdminWhatsAppMessageRow[];
  counsellorCalls?: AdminCounsellorCallRow[];
}

/** One journey WhatsApp send (lib/whatsapp/journey.ts) - SKIPPED means the
 *  template isn't switched on yet, or a marketing send without opt-in. */
export interface AdminWhatsAppMessageRow {
  id: string;
  template: string;
  key: string;
  kind: string;
  status: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCounsellorCallRow {
  id: string;
  scheduledAt: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  meetingLink?: string;
  notes?: string;
}

/** Thrown by fetchAdminDashboard() when the stored admin token is missing/expired. */
export class AdminAuthError extends Error {
  constructor() {
    super("Your admin session has expired. Please log in again.");
    this.name = "AdminAuthError";
  }
}

async function parseJsonOrThrow<T>(response: Response, fallbackError: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(body?.error ?? fallbackError);
  }
  return body as T;
}

export async function loginAdmin(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await parseJsonOrThrow<{ token: string }>(
    response,
    "Could not log in. Please try again.",
  );
  return body.token;
}

export async function fetchAdminDashboard(
  token: string,
  options: { query?: string; page?: number; includeTest?: boolean } = {},
): Promise<AdminDashboard> {
  const params = new URLSearchParams();
  if (options.query) params.set("q", options.query);
  if (options.page) params.set("page", String(options.page));
  if (options.includeTest) params.set("includeTest", "1");

  const response = await fetch(`${API_BASE_URL}/admin/dashboard?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) throw new AdminAuthError();
  return parseJsonOrThrow<AdminDashboard>(
    response,
    "Could not load the dashboard. Please try again.",
  );
}

export async function fetchAdminSessionDetail(
  token: string,
  sessionToken: string,
): Promise<AdminSessionDetail> {
  const response = await fetch(`${API_BASE_URL}/admin/sessions/${encodeURIComponent(sessionToken)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) throw new AdminAuthError();
  return parseJsonOrThrow<AdminSessionDetail>(
    response,
    "Could not load this session. Please try again.",
  );
}

/** Books a Report + Counsellor call - the server sends counsellor_confirmed. */
export async function bookCounsellorCall(
  token: string,
  sessionToken: string,
  call: { scheduledAt: string; meetingLink: string; notes?: string },
): Promise<AdminCounsellorCallRow> {
  const response = await fetch(
    `${API_BASE_URL}/admin/sessions/${encodeURIComponent(sessionToken)}/counsellor-calls`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(call),
    },
  );
  if (response.status === 401) throw new AdminAuthError();
  return parseJsonOrThrow<AdminCounsellorCallRow>(response, "Could not book the call. Please try again.");
}

/** Marks a call done or cancelled (a new scheduledAt reschedules it). */
export async function updateCounsellorCall(
  token: string,
  callId: string,
  changes: { status?: AdminCounsellorCallRow["status"]; scheduledAt?: string; meetingLink?: string },
): Promise<AdminCounsellorCallRow> {
  const response = await fetch(`${API_BASE_URL}/admin/counsellor-calls/${encodeURIComponent(callId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  if (response.status === 401) throw new AdminAuthError();
  return parseJsonOrThrow<AdminCounsellorCallRow>(response, "Could not update the call. Please try again.");
}

export interface AdminInboxMessage {
  id: string;
  direction: "IN" | "OUT";
  text: string;
  createdAt: string;
  handled: boolean;
}

export interface AdminInboxConversation {
  mobile: string;
  parentName?: string;
  childName?: string;
  sessionToken?: string;
  /** Messages from the parent nobody has dealt with yet */
  unhandled: number;
  lastAt: string;
  /** Within 24h of the parent's last message - WhatsApp only delivers typed replies then */
  canReply: boolean;
  messages: AdminInboxMessage[];
}

/** Report + Counsellor parents whose report is ready but who haven't booked
 *  a call, and WhatsApp couldn't reach (or 2 days have passed) - call them. */
export interface AdminNeedsCallRow {
  sessionToken: string;
  parentName: string;
  mobile: string;
  childName: string;
  readySince: string;
  reason: string;
}

export interface AdminInbox {
  conversations: AdminInboxConversation[];
  needsCall: AdminNeedsCallRow[];
}

export async function fetchAdminInbox(token: string): Promise<AdminInbox> {
  const response = await fetch(`${API_BASE_URL}/admin/inbox`, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 401) throw new AdminAuthError();
  return parseJsonOrThrow<AdminInbox>(response, "Could not load the inbox. Please try again.");
}

/** A typed WhatsApp reply - only within 24h of the parent's last message. */
export async function replyInInbox(token: string, mobile: string, text: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/inbox/reply`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mobile, text }),
  });
  if (response.status === 401) throw new AdminAuthError();
  await parseJsonOrThrow(response, "Could not send the reply. Please try again.");
}

export async function markInboxHandled(token: string, mobile: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/inbox/handled`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mobile }),
  });
  if (response.status === 401) throw new AdminAuthError();
  await parseJsonOrThrow(response, "Could not update the conversation. Please try again.");
}
