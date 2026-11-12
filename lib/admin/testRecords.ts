/**
 * Which registrations are the team's own tests, so the admin dashboard's
 * numbers and table (server/routes/admin.ts) count real parents only. A
 * "Show test records" toggle on /admin brings them back.
 *
 * A session is a test record when the parent's mobile is a QA tester's
 * (CHECKOUT_BYPASS_MOBILES, lib/checkout/testBypass.ts, plus the number
 * below), or the parent's or child's name contains one of TEST_NAME_PARTS
 * (ignoring case), or is exactly one of TEST_NAMES.
 *
 * Substring matching is deliberately broad - "Vaishnav" also hides e.g.
 * "Vaishnavi". Agreed with the team; change the lists here if a real family
 * goes missing.
 */

import type { Prisma } from "@prisma/client";
import { normalizeMobile } from "@/lib/validation";

const EXTRA_TEST_MOBILES = ["7038932499"];
const TEST_NAME_PARTS = ["test", "abc", "jcb", "xyz", "vaishnav"];
const TEST_NAMES = ["claude review"];

function testMobiles(): string[] {
  const fromEnv = (process.env.CHECKOUT_BYPASS_MOBILES ?? "").split(",").map((m) => normalizeMobile(m.trim()));
  return [...new Set([...fromEnv, ...EXTRA_TEST_MOBILES].filter(Boolean))];
}

function nameIsTest(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return TEST_NAMES.includes(lower) || TEST_NAME_PARTS.some((part) => lower.includes(part));
}

export function isTestRecord(row: { parentMobile: string; parentName: string; childName: string }): boolean {
  return (
    testMobiles().includes(normalizeMobile(row.parentMobile)) || nameIsTest(row.parentName) || nameIsTest(row.childName)
  );
}

/** The same rule as isTestRecord(), as a Prisma filter - wrap in NOT to exclude. */
export function testSessionWhere(): Prisma.AssessmentSessionWhereInput {
  const nameFilters = (field: "parent" | "child"): Prisma.AssessmentSessionWhereInput[] => [
    ...TEST_NAME_PARTS.map((part) => ({ [field]: { name: { contains: part, mode: "insensitive" } } })),
    ...TEST_NAMES.map((name) => ({ [field]: { name: { equals: name, mode: "insensitive" } } })),
  ];
  return {
    OR: [{ parent: { mobile: { in: testMobiles() } } }, ...nameFilters("parent"), ...nameFilters("child")],
  };
}

/** Real registrations only */
export function realSessionWhere(): Prisma.AssessmentSessionWhereInput {
  return { NOT: testSessionWhere() };
}
