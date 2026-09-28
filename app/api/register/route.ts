/**
 * Real replacement for lib/mockApi.ts's mockRegisterSession — same response
 * shape ({ sessionToken }), called from lib/api/realSession.ts. Creates the
 * Parent + Child + AssessmentSession row a lead needs to exist even if the
 * browser never comes back.
 */

import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  const parsed = REGISTER_BODY_SCHEMA.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { utmSource, utmMedium, utmCampaign, ...values } = parsed.data;

  // Never trust client-side validation alone - lib/validation.ts is reused
  // as-is here, exactly as it runs in the browser on /register and /resume.
  const registrationInput: RegistrationInput = values;
  const errors = validateRegistration(registrationInput);
  if (hasErrors(errors)) {
    return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 400 });
  }

  const schoolCode = values.schoolCode?.trim();
  const schoolContext = schoolCode ? schoolContextFromCode(schoolCode) : null;
  // A school code was typed but didn't resolve to anything - validateRegistration
  // already catches this, but resolveSchoolCode is re-checked here rather than
  // trusted transitively, since it's the thing that actually decides schoolId/classId.
  if (schoolCode && !resolveSchoolCode(schoolCode)) {
    return NextResponse.json(
      { error: "Validation failed", fields: { schoolCode: "Unrecognised school code" } },
      { status: 400 },
    );
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

  return NextResponse.json({ sessionToken: token });
}
