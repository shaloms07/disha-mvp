/**
 * Bearer-token auth for the standalone Express API. The frontend (Vercel)
 * and this API (VPS) are different origins, so a header is simplest - no
 * cookie/CORS-credentials dance required (see server/API.md).
 */

import type { NextFunction, Request, Response } from "express";
import { prisma } from "@/lib/db";
import { hashAuthToken } from "@/lib/auth/token";

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

/**
 * Resolves a valid, live token to the mobile number it belongs to - or null
 * if there's no token, or it's invalid/expired/revoked. Never throws and
 * never rejects the request itself, so it's safe to use from an endpoint
 * (like POST /register) where auth is optional rather than required.
 */
export async function resolveOptionalAuth(
  req: Request,
): Promise<{ mobile: string; authSessionId: string } | null> {
  const token = bearerToken(req);
  if (!token) return null;

  const authSession = await prisma.authSession.findUnique({
    where: { tokenHash: hashAuthToken(token) },
  });
  if (!authSession || authSession.revokedAt || authSession.expiresAt < new Date()) {
    return null;
  }

  return { mobile: authSession.mobile, authSessionId: authSession.id };
}

/** For endpoints where a valid token is mandatory - GET /me/wards, POST /auth/logout. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = await resolveOptionalAuth(req);
  if (!auth) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  res.locals.mobile = auth.mobile;
  res.locals.authSessionId = auth.authSessionId;

  // Best-effort - never block the request on this.
  prisma.authSession
    .update({ where: { id: auth.authSessionId }, data: { lastUsedAt: new Date() } })
    .catch((error: unknown) => console.error("[auth] lastUsedAt update failed", error));

  next();
}
