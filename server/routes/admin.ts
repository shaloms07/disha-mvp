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
import { paidTierLevel } from "@/lib/checkout/paidTierLevel";
import { sendCounsellorConfirmedMessage } from "@/lib/whatsapp/journeyMessages";
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

  const sessionRows = await Promise.all(
    sessions.map(async (session) => {
      const scores = session.scores as Record<RiasecType, number> | null;
      const [paidLevel, referralCount] = await Promise.all([
        paidTierLevel(session.id),
        session.referralCode
          ? prisma.assessmentSession.count({
              where: { referredByCode: session.referralCode, referralCountedAt: { not: null } },
            })
          : Promise.resolve(0),
      ]);
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
        // The real paid tier (verified payment OR referral unlock) - distinct
        // from upsellTierLevel above, which is only ever a clicked "I'm interested".
        purchasedTierLevel: session.purchasedTierLevel ?? undefined,
        // What was actually PAID for (lib/checkout/paidTierLevel.ts) - 0 for a
        // purely referral-unlocked session.
        paidTierLevel: paidLevel,
        unlockedVia: session.unlockedVia ?? undefined,
        referralCount,
        createdAt: session.createdAt.toISOString(),
        completedAt: session.completedAt?.toISOString(),
      };
    }),
  );

  res.json({
    stats: { totalParents, totalSessions, completedSessions },
    page,
    pageSize: PAGE_SIZE,
    total: matchingTotal,
    sessions: sessionRows,
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
      whatsappMessages: { orderBy: { createdAt: "desc" } },
      counsellorCalls: { orderBy: { scheduledAt: "desc" } },
    },
  });

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [paidLevel, referralCount] = await Promise.all([
    paidTierLevel(session.id),
    session.referralCode
      ? prisma.assessmentSession.count({
          where: { referredByCode: session.referralCode, referralCountedAt: { not: null } },
        })
      : Promise.resolve(0),
  ]);

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
    paidTierLevel: paidLevel,
    unlockedVia: session.unlockedVia ?? undefined,
    unlockedAt: session.unlockedAt?.toISOString(),
    referralCode: session.referralCode ?? undefined,
    referralCount,
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
    whatsappMessages: session.whatsappMessages.map((m) => ({
      id: m.id,
      template: m.template,
      key: m.key,
      kind: m.kind,
      status: m.status,
      metaMessageId: m.metaMessageId ?? undefined,
      error: m.error ?? undefined,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    counsellorCalls: session.counsellorCalls.map((c) => ({
      id: c.id,
      scheduledAt: c.scheduledAt.toISOString(),
      status: c.status,
      notes: c.notes ?? undefined,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
});

const CREATE_COUNSELLOR_CALL_SCHEMA = z.object({
  scheduledAt: z.string(),
  notes: z.string().optional(),
});

/** Books a counsellor call for a tier 4 ("Report + Counsellor") session -
 *  managed by the admin team, not self-serve. Always sends counsellor_confirmed. */
adminRouter.post("/admin/sessions/:token/counsellor-calls", requireAdminAuth, async (req, res) => {
  const parsed = CREATE_COUNSELLOR_CALL_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const sessionToken = req.params.token;
  if (typeof sessionToken !== "string") {
    res.status(400).json({ error: "Invalid session token" });
    return;
  }

  const session = await prisma.assessmentSession.findUnique({
    where: { token: sessionToken },
    select: { id: true, parent: { select: { name: true, mobile: true } } },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  const call = await prisma.counsellorCall.create({
    data: { sessionId: session.id, scheduledAt, notes: parsed.data.notes },
  });

  void sendCounsellorConfirmedMessage({
    sessionId: session.id,
    parentMobile: session.parent.mobile,
    parentName: session.parent.name,
    scheduledAt,
  });

  res.json({
    id: call.id,
    scheduledAt: call.scheduledAt.toISOString(),
    status: call.status,
    notes: call.notes ?? undefined,
  });
});

const UPDATE_COUNSELLOR_CALL_SCHEMA = z.object({
  scheduledAt: z.string().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
});

/** Reschedules, completes or cancels a counsellor call - a changed
 *  scheduledAt (a reschedule) re-sends counsellor_confirmed with the new time. */
adminRouter.patch("/admin/counsellor-calls/:id", requireAdminAuth, async (req, res) => {
  const parsed = UPDATE_COUNSELLOR_CALL_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const callId = req.params.id;
  if (typeof callId !== "string") {
    res.status(400).json({ error: "Invalid counsellor call id" });
    return;
  }

  const existing = await prisma.counsellorCall.findUnique({
    where: { id: callId },
    select: { id: true, sessionId: true, scheduledAt: true, session: { select: { parent: { select: { name: true, mobile: true } } } } },
  });
  if (!existing) {
    res.status(404).json({ error: "Counsellor call not found" });
    return;
  }

  const newScheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined;
  const rescheduled = newScheduledAt && newScheduledAt.getTime() !== existing.scheduledAt.getTime();

  const call = await prisma.counsellorCall.update({
    where: { id: existing.id },
    data: {
      scheduledAt: newScheduledAt,
      status: parsed.data.status,
      notes: parsed.data.notes,
    },
  });

  if (rescheduled) {
    void sendCounsellorConfirmedMessage({
      sessionId: existing.sessionId,
      parentMobile: existing.session.parent.mobile,
      parentName: existing.session.parent.name,
      scheduledAt: call.scheduledAt,
    });
  }

  res.json({
    id: call.id,
    scheduledAt: call.scheduledAt.toISOString(),
    status: call.status,
    notes: call.notes ?? undefined,
  });
});
