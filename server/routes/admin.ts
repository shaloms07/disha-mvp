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
import { getHollandCode, questionsForClass, TOTAL_QUESTIONS } from "@/lib/scoring";
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
      include: {
        parent: true,
        child: true,
        // At most one per session in practice - POST /session/:token/interest
        // updates the existing row rather than creating a second one.
        reportInterestLeads: { orderBy: { createdAt: "desc" }, take: 1 },
      },
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
        upsellTierLevel: session.reportInterestLeads[0]?.tierLevel ?? undefined,
        // The real paid tier (verified payment) - distinct from upsellTierLevel
        // above, which is only ever a clicked "I'm interested", never a charge.
        purchasedTierLevel: session.purchasedTierLevel ?? undefined,
        createdAt: session.createdAt.toISOString(),
        completedAt: session.completedAt?.toISOString(),
      };
    }),
  });
});

adminRouter.get("/admin/sessions/:token", requireAdminAuth, async (req, res) => {
  const sessionToken = req.params.token;
  if (typeof sessionToken !== "string") {
    res.status(400).json({ error: "Invalid session token" });
    return;
  }

  const session = await prisma.assessmentSession.findUnique({
    where: { token: sessionToken },
    include: {
      parent: true,
      child: true,
      reportInterestLeads: { orderBy: { createdAt: "desc" }, take: 1 },
      orders: { orderBy: { createdAt: "desc" } },
      // codeHash is deliberately never selected - everything else here is
      // metadata about when/how verification happened, not the code itself.
      otpCodes: {
        orderBy: { createdAt: "desc" },
        select: { id: true, mobile: true, purpose: true, attempts: true, consumedAt: true, expiresAt: true, createdAt: true },
      },
    },
  });

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const responses = session.responses as Record<string, number>;
  const scores = session.scores as Record<RiasecType, number> | null;
  const questions = questionsForClass(session.child.grade);

  const answers = questions.map((question) => {
    const choice = responses[String(question.id)];
    const picked = choice === 1 ? question.optionA : choice === 2 ? question.optionB : undefined;
    return {
      id: question.id,
      optionA: question.optionA.text,
      optionB: question.optionB.text,
      pickedText: picked?.text,
      pickedTrait: picked?.trait,
    };
  });

  res.json({
    sessionToken: session.token,
    parent: { name: session.parent.name, mobile: session.parent.mobile },
    child: { name: session.child.name, grade: session.child.gradeOther ?? session.child.grade },
    status: deriveExposedStatus(session),
    answeredCount: session.answeredCount,
    totalQuestions: TOTAL_QUESTIONS,
    scores,
    hollandCode: scores ? getHollandCode(scores) : undefined,
    answers,
    moduleResponses: session.moduleResponses,
    moduleScores: session.moduleScores,
    upsellTierLevel: session.reportInterestLeads[0]?.tierLevel ?? undefined,
    purchasedTierLevel: session.purchasedTierLevel ?? undefined,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    completedAt: session.completedAt?.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    consent: {
      given: session.consentGiven,
      consentedAt: session.consentedAt?.toISOString(),
      version: session.consentVersion ?? undefined,
    },
    utm: {
      source: session.utmSource ?? undefined,
      medium: session.utmMedium ?? undefined,
      campaign: session.utmCampaign ?? undefined,
    },
    reminders: {
      sent2h: session.reminder2hSentAt?.toISOString(),
      sent24h: session.reminder24hSentAt?.toISOString(),
      sent72h: session.reminder72hSentAt?.toISOString(),
    },
    orders: session.orders.map((order) => ({
      id: order.id,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId ?? undefined,
      amount: order.amount,
      currency: order.currency,
      tierLevel: order.tierLevel,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    })),
    otpEvents: session.otpCodes.map((otp) => ({
      id: otp.id,
      mobile: otp.mobile,
      purpose: otp.purpose,
      attempts: otp.attempts,
      consumedAt: otp.consumedAt?.toISOString(),
      expiresAt: otp.expiresAt.toISOString(),
      createdAt: otp.createdAt.toISOString(),
    })),
  });
});
