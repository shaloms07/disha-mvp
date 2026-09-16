/**
 * Simulated role scoping — SCHOOL_ADMIN_SPEC.md Section 5.
 *
 * This is a UX simulation, not access control. Nothing here is enforced: the
 * whole mock pool is in the client bundle, and a "teacher" view filters it in
 * the browser. It demonstrates the intended data-scoping from the RBAC matrix
 * so stakeholders can see what each role would be shown — it must not be
 * mistaken for the thing that would keep one school's students away from
 * another's once this handles real records.
 *
 * Stage E wires the switcher on top of these definitions; the dashboards read
 * the scope from here either way.
 */

import { CLASSES } from "./schoolCode";
import { SCHOOL_SESSIONS, classIdOf } from "./aggregates";
import type { Role, SchoolClass, SessionState } from "@/types";

export const ROLES: Role[] = ["principal", "teacher", "parent"];

export const ROLE_LABELS: Record<Role, string> = {
  principal: "Principal",
  teacher: "Class teacher",
  parent: "Parent",
};

export const ROLE_SCOPE: Record<Role, string> = {
  principal: "Every student in the school",
  teacher: "Only their assigned sections",
  parent: "Only their own child",
};

/**
 * The "signed in" class teacher for the demo.
 *
 * Priya Raghavan is class teacher of 10-A in mockClasses.json; she is also
 * covering 10-B this term, which is what gives the section selector something
 * to select between.
 */
export const MOCK_TEACHER = {
  name: "Priya Raghavan",
  classIds: ["10-A", "10-B"],
  homeroom: "10-A",
} as const;

/** The child a "parent" role would see — one of the completed mock students */
export const MOCK_PARENT_CHILD = "Riya Chatterjee";

export function teacherClasses(): SchoolClass[] {
  return CLASSES.filter((c) =>
    (MOCK_TEACHER.classIds as readonly string[]).includes(c.id),
  );
}

/** The sessions a given role is allowed to see, per the RBAC matrix */
export function sessionsForRole(role: Role): SessionState[] {
  switch (role) {
    case "principal":
      return SCHOOL_SESSIONS;
    case "teacher":
      return SCHOOL_SESSIONS.filter((s) =>
        (MOCK_TEACHER.classIds as readonly string[]).includes(classIdOf(s)),
      );
    case "parent":
      return SCHOOL_SESSIONS.filter((s) => s.childName === MOCK_PARENT_CHILD);
  }
}
