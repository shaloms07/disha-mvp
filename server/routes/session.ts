/**
 * GET powers app/resume/page.tsx's cross-device rehydration (opening a
 * /resume?t=... link on a browser with no local session yet). PATCH is the
 * generic sync target lib/session/sync.ts fires from every SessionContext
 * mutation - see lib/session/fields.ts for the field->table contract this
 * validates against.
 *
 * Ported from the former app/api/session/[token]/route.ts.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  FIELD_TABLE_MAP,
  MERGE_FIELDS,
  NESTED_MERGE_FIELDS,
  SESSION_PATCH_SCHEMA,
} from "@/lib/session/fields";
import { deriveExposedStatus } from "@/lib/session/status";
import { TOTAL_QUESTIONS } from "@/lib/scoring";
import { sendResultMessage } from "@/lib/whatsapp/messages";
import { sendCapiEvent } from "@/lib/meta/capi";
import { paidTierLevel } from "@/lib/checkout/paidTierLevel";
import { paidAmount } from "@/lib/checkout/paidAmount";
import { INVITES_NEEDED } from "@/lib/referral";
import { DEEP_DIVE_MODULES } from "@/lib/testModules";
import {
  sendCounsellorBookMessage,
  sendFullReportReadyMessage,
  sendResultLinkMessage,
} from "@/lib/whatsapp/journeyMessages";
import type { RiasecType } from "@/types";

export const sessionRouter = Router();

sessionRouter.get("/session/:token", async (req, res) => {
  const { token } = req.params;

  const session = await prisma.assessmentSession.findUnique({
    where: { token },
    include: { parent: true, child: true },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const paidLevel = await paidTierLevel(session.id);
  const paid = await paidAmount(session.id);
  const referralCount = session.referralCode
    ? Math.min(
        INVITES_NEEDED,
        await prisma.assessmentSession.count({
          where: { referredByCode: session.referralCode, referralCountedAt: { not: null } },
        }),
      )
    : 0;

  res.json({
    sessionToken: session.token,
    parentName: session.parent.name,
    parentMobile: session.parent.mobile,
    childName: session.child.name,
    childClass: session.child.grade,
    childClassOther: session.child.gradeOther ?? undefined,
    consentGiven: session.consentGiven,
    otpVerified: session.otpVerified,
    schoolCode: session.schoolCode ?? undefined,
    schoolId: session.schoolId ?? undefined,
    classId: session.classId ?? undefined,
    parentStatedPreference: session.parentStatedPreference ?? undefined,
    responses: session.responses,
    scores: session.scores ?? undefined,
    moduleResponses: session.moduleResponses,
    moduleScores: session.moduleScores,
    status: deriveExposedStatus(session),
    answeredCount: session.answeredCount,
    totalQuestions: TOTAL_QUESTIONS,
    lastQuestionId: session.lastQuestionId ?? undefined,
    lastActivityAt: session.lastActivityAt.toISOString(),
    completedAt: session.completedAt?.toISOString(),
    // Lets a different device/browser than the one that paid still see
    // "already purchased" - see app/resume/page.tsx's and app/wards/page.tsx's
    // rehydration effects, which turn this back into SelectedTiers booleans.
    purchasedTierLevel: session.purchasedTierLevel ?? undefined,
    // What's actually been PAID for (lib/checkout/paidTierLevel.ts), distinct
    // from purchasedTierLevel above - the amount for an upgrade is based on
    // this, not on a free referral unlock.
    paidTierLevel: paidLevel,
    // Rupees actually paid, summed across PAID orders - lib/pricing.ts's
    // priceAfterCredit takes this off an upgrade (components/results/OfferCards.tsx).
    paidAmount: paid,
    // This session's own invite code (lib/invite.ts builds the share link)
    // and how many of the 3 needed invites have counted so far. Never reveals
    // who joined.
    referralCode: session.referralCode ?? undefined,
    referralCount,
  });
});

sessionRouter.patch("/session/:token", async (req, res) => {
  const { token } = req.params;

  const parsed = SESSION_PATCH_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }

  const existing = await prisma.assessmentSession.findUnique({
    where: { token },
    select: {
      id: true,
      parentId: true,
      childId: true,
      responses: true,
      scores: true,
      moduleResponses: true,
      moduleScores: true,
      status: true,
      deepDiveCompletedAt: true,
      purchasedTierLevel: true,
      token: true,
      parent: { select: { name: true, mobile: true } },
      child: { select: { name: true } },
    },
  });
  if (!existing) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const parentData: Record<string, unknown> = {};
  const childData: Record<string, unknown> = {};
  const sessionData: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue;
    const field = key as keyof typeof FIELD_TABLE_MAP;
    const target = FIELD_TABLE_MAP[field];

    if (MERGE_FIELDS.has(field)) {
      // responses/scores accumulate - merging (not replacing) is what keeps two
      // devices working the same test link from clobbering each other's answers.
      const existingValue = (existing[field as "responses" | "scores"] ?? {}) as Record<string, number>;
      sessionData[field] = { ...existingValue, ...(value as Record<string, number>) };
      continue;
    }

    if (NESTED_MERGE_FIELDS.has(field)) {
      // moduleResponses/moduleScores are Record<moduleName, Record<id, value>> -
      // merge each named module's own answers, not just the top-level keys, or
      // patching one module's next answer would wipe out its earlier ones.
      const existingByModule = (existing[field as "moduleResponses" | "moduleScores"] ?? {}) as Record<
        string,
        Record<string, number>
      >;
      const incomingByModule = value as Record<string, Record<string, number>>;
      const merged = { ...existingByModule };
      for (const [moduleName, moduleValue] of Object.entries(incomingByModule)) {
        merged[moduleName] = { ...(existingByModule[moduleName] ?? {}), ...moduleValue };
      }
      sessionData[field] = merged;
      continue;
    }

    if (field === "completedAt") {
      sessionData[field] = new Date(value as string);
      sessionData.status = "COMPLETED";
      continue;
    }

    if (target === "parent") {
      parentData[key === "parentName" ? "name" : "mobile"] = value;
    } else if (target === "child") {
      const childColumn = { childName: "name", childClass: "grade", childClassOther: "gradeOther" }[
        key as "childName" | "childClass" | "childClassOther"
      ];
      childData[childColumn] = value;
    } else {
      sessionData[key] = value;
    }
  }

  // Deep-Dive completion is derived the same way isDeepDiveComplete() does
  // (lib/testModules.ts) - fires once, the first PATCH whose merged
  // moduleScores has all three paid modules scored.
  if (!existing.deepDiveCompletedAt && sessionData.moduleScores) {
    const mergedModuleScores = sessionData.moduleScores as Record<string, Record<string, number>>;
    if (DEEP_DIVE_MODULES.every((m) => Boolean(mergedModuleScores[m.scoresKey]))) {
      sessionData.deepDiveCompletedAt = new Date();
    }
  }

  // Progress tracking - derived from this patch, not sent explicitly by the
  // client, so the frontend needs no extra calls beyond the PATCH it already
  // fires after every answer.
  if (parsed.data.responses) {
    const mergedResponses = sessionData.responses as Record<string, number>;
    sessionData.answeredCount = Object.keys(mergedResponses).length;

    const incomingIds = Object.keys(parsed.data.responses).map(Number);
    if (incomingIds.length) {
      sessionData.lastQuestionId = Math.max(...incomingIds);
    }

    if (existing.status === "REGISTERED" && !sessionData.status) {
      sessionData.status = "IN_PROGRESS";
    }
  }
  sessionData.lastActivityAt = new Date();

  await prisma.$transaction([
    ...(Object.keys(parentData).length ? [prisma.parent.update({ where: { id: existing.parentId }, data: parentData })] : []),
    ...(Object.keys(childData).length ? [prisma.child.update({ where: { id: existing.childId }, data: childData })] : []),
    prisma.assessmentSession.update({ where: { id: existing.id }, data: sessionData }),
  ]);

  const mobile = (parentData.mobile as string | undefined) ?? existing.parent.mobile;

  // Fires once, the first time a session gets its first answer.
  if (existing.status === "REGISTERED" && sessionData.status === "IN_PROGRESS") {
    void sendCapiEvent({
      eventName: "TestStarted",
      mobile,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  // Fire once, the moment this session actually finishes - never again on a
  // later patch to an already-completed session.
  if (existing.status !== "COMPLETED" && sessionData.status === "COMPLETED") {
    void sendCapiEvent({
      eventName: "TestCompleted",
      mobile,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const scores = (sessionData.scores ?? existing.scores) as Record<RiasecType, number> | undefined;
    if (scores) {
      const parentName = (parentData.name as string | undefined) ?? existing.parent.name;
      const childName = (childData.name as string | undefined) ?? existing.child.name;
      // Never both: result_link replaces the older result_ready+PDF send once
      // its template is approved and the env var is set, not before.
      if (process.env.WHATSAPP_RESULT_LINK_TEMPLATE) {
        void sendResultLinkMessage({
          sessionId: existing.id,
          parentMobile: mobile,
          parentName,
          childName,
          sessionToken: existing.token,
        });
      } else {
        void sendResultMessage({ parentMobile: mobile, parentName, childName, scores });
      }
    }
  }

  // Fires once, the moment all three Deep-Dive modules are scored.
  if (!existing.deepDiveCompletedAt && sessionData.deepDiveCompletedAt) {
    const journeyBase = {
      sessionId: existing.id,
      parentMobile: mobile,
      parentName: (parentData.name as string | undefined) ?? existing.parent.name,
      childName: (childData.name as string | undefined) ?? existing.child.name,
      sessionToken: existing.token,
    };
    void sendFullReportReadyMessage(journeyBase);
    // Report + Counsellor (tier 4) also gets prompted to book their call now
    // that the Deep-Dive it depends on is actually done.
    if (existing.purchasedTierLevel === 4) {
      void sendCounsellorBookMessage(journeyBase);
    }
  }

  res.json({ success: true });
});

const INTEREST_BODY_SCHEMA = z.object({
  /** lib/pricing.ts's TIER_OPTIONS[].level - which upsell tier they picked */
  tierLevel: z.number().int().min(1).max(4),
});

/**
 * The free snapshot's upsell tier picker (app/results/page.tsx) - records
 * which tier this parent is interested in, until real paid checkout exists
 * to capture that intent instead. One row per session (picking again just
 * updates it, in case they change their mind), not a growing history.
 */
sessionRouter.post("/session/:token/interest", async (req, res) => {
  const { token } = req.params;

  const parsed = INTEREST_BODY_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const session = await prisma.assessmentSession.findUnique({
    where: { token },
    select: { id: true },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const existing = await prisma.reportInterestLead.findFirst({
    where: { sessionId: session.id },
  });
  if (existing) {
    await prisma.reportInterestLead.update({
      where: { id: existing.id },
      data: { tierLevel: parsed.data.tierLevel },
    });
  } else {
    await prisma.reportInterestLead.create({
      data: { sessionId: session.id, tierLevel: parsed.data.tierLevel },
    });
  }

  res.json({ success: true });
});
