/**
 * Which registrations are the team's own tests, so the admin dashboard's
 * numbers and table (server/routes/admin.ts) count real parents only. A
 * "Show test records" toggle on /admin brings them back.
 *
 * A session is a test record when (ignoring case):
 *  - the parent's mobile is a QA tester's (CHECKOUT_BYPASS_MOBILES,
 *    lib/checkout/testBypass.ts, plus the number below), or
 *  - the parent's OR child's name contains one of TEST_NAME_PARTS, or
 *  - the CHILD's name contains one of CHILD_NAME_PARTS, or
 *  - the CHILD's name is exactly one of CHILD_TEST_NAMES.
 *
 * Substring matching is deliberately broad - "Vaishnav" also hides e.g. a
 * child called "Vaishnavi". Agreed with the team; change the lists here if
 * a real family goes missing.
 */

import type { Prisma } from "@prisma/client";
import { normalizeMobile } from "@/lib/validation";

const EXTRA_TEST_MOBILES = ["7038932499"];
const TEST_NAME_PARTS = ["test", "abc", "jcb", "xyz"];
const CHILD_NAME_PARTS = ["vaishnav"];
const CHILD_TEST_NAMES = ["claude review"];

function testMobiles(): string[] {
  const fromEnv = (process.env.CHECKOUT_BYPASS_MOBILES ?? "").split(",").map((m) => normalizeMobile(m.trim()));
  return [...new Set([...fromEnv, ...EXTRA_TEST_MOBILES].filter(Boolean))];
}

function containsAny(name: string, parts: string[]): boolean {
  const lower = name.trim().toLowerCase();
  return parts.some((part) => lower.includes(part));
}

export function isTestRecord(row: { parentMobile: string; parentName: string; childName: string }): boolean {
  const child = row.childName.trim().toLowerCase();
  return (
    testMobiles().includes(normalizeMobile(row.parentMobile)) ||
    containsAny(row.parentName, TEST_NAME_PARTS) ||
    containsAny(row.childName, [...TEST_NAME_PARTS, ...CHILD_NAME_PARTS]) ||
    CHILD_TEST_NAMES.includes(child)
  );
}

/** The same rule as isTestRecord(), as a Prisma filter - wrap in NOT to exclude. */
export function testSessionWhere(): Prisma.AssessmentSessionWhereInput {
  const contains = (field: "parent" | "child", parts: string[]): Prisma.AssessmentSessionWhereInput[] =>
    parts.map((part) => ({ [field]: { name: { contains: part, mode: "insensitive" } } }));
  return {
    OR: [
      { parent: { mobile: { in: testMobiles() } } },
      ...contains("parent", TEST_NAME_PARTS),
      ...contains("child", [...TEST_NAME_PARTS, ...CHILD_NAME_PARTS]),
      ...CHILD_TEST_NAMES.map((name) => ({ child: { name: { equals: name, mode: "insensitive" as const } } })),
    ],
  };
}

/** Real registrations only */
export function realSessionWhere(): Prisma.AssessmentSessionWhereInput {
  return { NOT: testSessionWhere() };
}
