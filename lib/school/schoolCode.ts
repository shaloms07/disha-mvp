/**
 * School code lookup (SCHOOL_ADMIN_SPEC.md Section 6, path 2).
 *
 * The primary way a student gets tagged to a school is a pre-generated link
 * that already carries schoolId/classId. This is the fallback for a parent who
 * registers on their own but is still part of a pilot school: they type the
 * code their school gave them and the session picks up the same two fields.
 *
 * Client-side and mock-only, like the rest of this demo — a real build would
 * resolve the code against the school's tenant record on the server.
 *
 * Deliberately kept free of any mockSessions.json import so /register doesn't
 * pull the dashboard's fixture pool into the consumer bundle.
 */

import schoolData from "@/data/school-admin/mockSchool.json";
import classesData from "@/data/school-admin/mockClasses.json";
import type { School, SchoolClass } from "@/types";

/**
 * Names are trimmed on the way in: this file is hand-edited when a pilot
 * school changes, and a trailing space in the JSON would otherwise show up in
 * the dashboard header and in every printed PTM sheet.
 */
const rawSchool = schoolData as School;
export const SCHOOL: School = {
  ...rawSchool,
  name: rawSchool.name.trim(),
  code: rawSchool.code.trim().toUpperCase(),
};
export const CLASSES = classesData as SchoolClass[];

export interface SchoolCodeMatch {
  school: School;
  /** Present only when the code carried a section suffix, e.g. "<CODE>-10A" */
  schoolClass?: SchoolClass;
}

/**
 * Accepts the bare school code or a section-suffixed one:
 *   <CODE>          -> school only, section unknown
 *   <CODE>-10A      -> school + class 10-A
 *   <code> 10 a     -> same, typed loosely
 */
const CODE_PATTERN = /^([A-Z0-9]+?)(?:-(\d{1,2})-?([A-Z]))?$/;

/** Uppercase, drop spaces, collapse repeated dashes */
export function normalizeSchoolCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "-").replace(/-+/g, "-");
}

export function findClassById(classId: string): SchoolClass | undefined {
  return CLASSES.find((c) => c.id === classId);
}

/**
 * Returns null for anything we can't place — including a valid school code
 * with a section this school doesn't have, since silently dropping the section
 * would leave the student invisible to their class teacher without saying so.
 */
export function resolveSchoolCode(raw: string): SchoolCodeMatch | null {
  const normalized = normalizeSchoolCode(raw);
  if (!normalized) return null;

  const parsed = CODE_PATTERN.exec(normalized);
  if (!parsed) return null;

  const [, codePart, grade, section] = parsed;
  if (codePart !== SCHOOL.code) return null;

  if (!grade) return { school: SCHOOL };

  const schoolClass = findClassById(`${Number(grade)}-${section}`);
  return schoolClass ? { school: SCHOOL, schoolClass } : null;
}

/** The session fields a matched code writes — the same two a link would carry */
export function schoolContextFromCode(
  raw: string,
): { schoolId: string; classId?: string } | null {
  const match = resolveSchoolCode(raw);
  if (!match) return null;
  return match.schoolClass
    ? { schoolId: match.school.id, classId: match.schoolClass.id }
    : { schoolId: match.school.id };
}

/* ------------------------------------------------------- branded test link */

/**
 * The school-branded entry URL: /BVMNGP26/test?t=<token>
 *
 * Defined here so the register screen, the /link screen and batch onboarding
 * all produce the identical shape — a preview that doesn't match the link
 * actually handed out is worse than no preview.
 *
 * The section suffix is kept in the path when it is known, so the URL itself
 * carries the class and a link forwarded to the wrong parent still lands the
 * student in the right section.
 */
export function schoolTestPath(code: string, token?: string): string {
  const path = `/${normalizeSchoolCode(code)}/test`;
  return token ? `${path}?t=${token}` : path;
}

/** Absolute form for display and copy-to-clipboard; origin-less on the server */
export function schoolTestLink(
  code: string,
  token?: string,
  origin = typeof window === "undefined" ? "" : window.location.origin,
): string {
  return `${origin}${schoolTestPath(code, token)}`;
}

/**
 * The code that belongs in a student's link, section included when known.
 * Falls back to the bare school code for a student with no section.
 */
export function linkCodeFor(classId?: string): string {
  return classId
    ? `${SCHOOL.code}-${classId.replace("-", "")}`
    : SCHOOL.code;
}
