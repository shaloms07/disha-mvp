/**
 * Internal /admin dashboard API: login + a single paginated/searchable view
 * of every parent/child/session. Basic on purpose - this is a first pass
 * meant to grow (per-session detail, exports, etc.) once there's a real
 * shape to the data worth building against.
 */

import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { checkAdminCredentials, generateAdminToken, verifyAdminToken } from "@/lib/auth/admin";
import { deriveExposedStatus } from "@/lib/session/status";
import { getHollandCode, TOTAL_QUESTIONS } from "@/lib/scoring";
import type { RiasecType } from "@/types";

export const adminRouter = Router();

const PAGE_SIZE = 25;

const LOGIN_BODY_SCHEMA = z.object({ username: z.string(), password: z.string() });

adminRouter.post("/admin/login", (req, res) => {
  const parsed = LOGIN_BODY_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  if (!checkAdminCredentials(parsed.data.username, parsed.data.password)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  res.json({ token: generateAdminToken() });
});

function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: "Missing or invalid admin session" });
    return;
  }
  next();
}

const QUERY_SCHEMA = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
});

adminRouter.get("/admin/dashboard", requireAdminAuth, async (req, res) => {
  const parsed = QUERY_SCHEMA.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }

  const query = parsed.data.q || undefined;
  const page = parsed.data.page ?? 1;

  const where: Prisma.AssessmentSessionWhereInput | undefined = query
    ? {
        OR: [
          { parent: { mobile: { contains: query } } },
          { parent: { name: { contains: query, mode: "insensitive" } } },
          { child: { name: { contains: query, mode: "insensitive" } } },
        ],
      }
    : undefined;

  const [totalParents, totalSessions, completedSessions, matchingTotal, sessions] = await Promise.all([
    prisma.parent.count(),
    prisma.assessmentSession.count(),
    prisma.assessmentSession.count({ where: { status: "COMPLETED" } }),
    prisma.assessmentSession.count({ where }),
    prisma.assessmentSession.findMany({
      where,
      include: { parent: true, child: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  res.json({
    stats: { totalParents, totalSessions, completedSessions },
    page,
    pageSize: PAGE_SIZE,
    total: matchingTotal,
    sessions: sessions.map((session) => {
      const scores = session.scores as Record<RiasecType, number> | null;
      return {
        sessionToken: session.token,
        parentName: session.parent.name,
        parentMobile: session.parent.mobile,
        childName: session.child.name,
        childClass: session.child.gradeOther ?? session.child.grade,
        status: deriveExposedStatus(session),
        answeredCount: session.answeredCount,
        totalQuestions: TOTAL_QUESTIONS,
        hollandCode: scores ? getHollandCode(scores) : undefined,
        createdAt: session.createdAt.toISOString(),
        completedAt: session.completedAt?.toISOString(),
      };
    }),
  });
});
