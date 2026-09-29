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
import { prisma } from "@/lib/db";
import {
  FIELD_TABLE_MAP,
  MERGE_FIELDS,
  NESTED_MERGE_FIELDS,
  SESSION_PATCH_SCHEMA,
} from "@/lib/session/fields";
import { deriveExposedStatus } from "@/lib/session/status";
import { TOTAL_QUESTIONS } from "@/lib/scoring";

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

  res.json({
    sessionToken: session.token,
    parentName: session.parent.name,
    parentMobile: session.parent.mobile,
    childName: session.child.name,
    childClass: session.child.grade,
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

    if (target === "parent") parentData[key === "parentName" ? "name" : "mobile"] = value;
    else if (target === "child") childData[key === "childName" ? "name" : "grade"] = value;
    else sessionData[key] = value;
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

  res.json({ success: true });
});
