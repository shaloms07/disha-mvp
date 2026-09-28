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
import { FIELD_TABLE_MAP, MERGE_FIELDS, SESSION_PATCH_SCHEMA } from "@/lib/session/fields";

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
    select: { id: true, parentId: true, childId: true, responses: true, scores: true },
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

    if (field === "completedAt") {
      sessionData[field] = new Date(value as string);
      continue;
    }

    if (target === "parent") parentData[key === "parentName" ? "name" : "mobile"] = value;
    else if (target === "child") childData[key === "childName" ? "name" : "grade"] = value;
    else sessionData[key] = value;
  }

  await prisma.$transaction([
    ...(Object.keys(parentData).length ? [prisma.parent.update({ where: { id: existing.parentId }, data: parentData })] : []),
    ...(Object.keys(childData).length ? [prisma.child.update({ where: { id: existing.childId }, data: childData })] : []),
    ...(Object.keys(sessionData).length ? [prisma.assessmentSession.update({ where: { id: existing.id }, data: sessionData })] : []),
  ]);

  res.json({ success: true });
});
