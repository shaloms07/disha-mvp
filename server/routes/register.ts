/**
 * Real replacement for lib/mockApi.ts's mockRegisterSession — same response
 * shape ({ sessionToken }), called from lib/api/realSession.ts. Creates the
 * Parent + Child + AssessmentSession row a lead needs to exist even if the
 * browser never comes back.
 *
 * Ported from the former app/api/register/route.ts (Next.js Route Handler) —
 * same logic, Express request/response glue instead of NextResponse.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateSessionToken } from "@/lib/session/token";
import { resolveSchoolCode, schoolContextFromCode } from "@/lib/school/schoolCode";
import { hasErrors, validateRegistration } from "@/lib/validation";
import type { RegistrationInput } from "@/types";

const REGISTER_BODY_SCHEMA = z.object({
  parentName: z.string(),
  parentMobile: z.string(),
  childName: z.string(),
  childClass: z.string(),
  schoolCode: z.string().optional(),
  parentStatedPreference: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

export const registerRouter = Router();

registerRouter.post("/register", async (req, res) => {
  const parsed = REGISTER_BODY_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { utmSource, utmMedium, utmCampaign, ...values } = parsed.data;

  // Never trust client-side validation alone - lib/validation.ts is reused
  // as-is here, exactly as it runs in the browser on /register and /resume.
  const registrationInput: RegistrationInput = values;
  const errors = validateRegistration(registrationInput);
  if (hasErrors(errors)) {
    res.status(400).json({ error: "Validation failed", fields: errors });
    return;
  }

  const schoolCode = values.schoolCode?.trim();
  const schoolContext = schoolCode ? schoolContextFromCode(schoolCode) : null;
  // A school code was typed but didn't resolve to anything - validateRegistration
  // already catches this, but resolveSchoolCode is re-checked here rather than
  // trusted transitively, since it's the thing that actually decides schoolId/classId.
  if (schoolCode && !resolveSchoolCode(schoolCode)) {
    res.status(400).json({
      error: "Validation failed",
      fields: { schoolCode: "Unrecognised school code" },
    });
    return;
  }

  const token = generateSessionToken();

  const parent = await prisma.parent.create({
    data: { name: values.parentName.trim(), mobile: values.parentMobile.trim() },
  });
  const child = await prisma.child.create({
    data: { parentId: parent.id, name: values.childName.trim(), grade: values.childClass },
  });
  await prisma.assessmentSession.create({
    data: {
      token,
      parentId: parent.id,
      childId: child.id,
      schoolCode: schoolContext ? schoolCode : undefined,
      schoolId: schoolContext?.schoolId,
      classId: schoolContext?.classId,
      parentStatedPreference: values.parentStatedPreference?.trim() || undefined,
      utmSource,
      utmMedium,
      utmCampaign,
    },
  });

  res.json({ sessionToken: token });
});
