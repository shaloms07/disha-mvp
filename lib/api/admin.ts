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
  createdAt: string;
  completedAt?: string;
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
  createdAt: string;
  completedAt?: string;
  lastActivityAt: string;
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
  options: { query?: string; page?: number } = {},
): Promise<AdminDashboard> {
  const params = new URLSearchParams();
  if (options.query) params.set("q", options.query);
  if (options.page) params.set("page", String(options.page));

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
