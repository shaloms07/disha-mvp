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
import { OTHER_CLASS_OPTION, hasErrors, validateRegistration } from "@/lib/validation";
import { resolveOptionalAuth } from "@/lib/auth/middleware";
import { sendExamLinkMessage } from "@/lib/whatsapp/messages";
import type { RegistrationInput } from "@/types";

const REGISTER_BODY_SCHEMA = z.object({
  // Optional: a signed-in caller registering another ward already has these
  // on file (see the auth branch below) and the frontend never asks again.
  parentName: z.string().optional().default(""),
  parentMobile: z.string().optional().default(""),
  childName: z.string(),
  childClass: z.string(),
  childClassOther: z.string().optional(),
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

  // A signed-in caller's parent name/mobile are already on file - checked
  // before validation so it can skip requiring fields this request never
  // even sent. Resolved once and reused below for the actual DB write too.
  const auth = await resolveOptionalAuth(req);

  // Never trust client-side validation alone - lib/validation.ts is reused
  // as-is here, exactly as it runs in the browser on /register and /resume.
  const registrationInput: RegistrationInput = values;
  const errors = validateRegistration(registrationInput, { requireParentFields: !auth });
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

  // A signed-in caller registers a new ward under their EXISTING parent
  // record, rather than a duplicate one - and always under their own
  // authenticated number, never whatever parentMobile the request body
  // claims, so a valid token for one number can't be used to attach a child
  // to a completely different parent's account.
  const parentMobile = (auth?.mobile ?? values.parentMobile).trim();

  const existingParent = auth
    ? await prisma.parent.findFirst({ where: { mobile: auth.mobile }, orderBy: { createdAt: "desc" } })
    : null;

  const parent =
    existingParent ??
    (await prisma.parent.create({
      // The "" fallback only matters if an auth token resolved but somehow
      // no Parent row exists for it - shouldn't happen (signing in requires
      // an existing registration), but an empty name is better than one
      // this request never validated (requireParentFields was false).
      data: { name: values.parentName.trim() || "Parent", mobile: parentMobile },
    }));
  const child = await prisma.child.create({
    data: {
      parentId: parent.id,
      name: values.childName.trim(),
      grade: values.childClass,
      gradeOther:
        values.childClass === OTHER_CLASS_OPTION ? values.childClassOther?.trim() || undefined : undefined,
    },
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

  // Fire-and-forget - a WhatsApp hiccup should never fail a registration the
  // parent is actively waiting on.
  void sendExamLinkMessage({
    parentMobile: parent.mobile,
    parentName: parent.name,
    childName: child.name,
    sessionToken: token,
  });

  res.json({ sessionToken: token });
});
