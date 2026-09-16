"use client";

import { useRole, useSwitchRole } from "@/lib/school/RoleContext";
import {
  MOCK_PARENT_CHILD,
  MOCK_TEACHER,
  ROLES,
  ROLE_LABELS,
} from "@/lib/school/roles";
import type { Role } from "@/types";

/**
 * The demo's role control — SCHOOL_ADMIN_SPEC.md Section 5.
 *
 * It both switches the role and navigates to that role's screen, because in
 * this product they are the same thing: a principal and a class teacher do not
 * share a dashboard with different rows hidden, they have different dashboards.
 *
 * Labelled "Viewing as" rather than "Signed in as" on purpose. Nobody is
 * signed in, nothing is checked, and the wording should not imply otherwise to
 * whoever is watching the demo.
 */

const SCOPE_NOTE: Record<Role, string> = {
  principal: "all sections",
  teacher: MOCK_TEACHER.classIds.join(" + "),
  parent: MOCK_PARENT_CHILD.split(" ")[0],
};

export function RoleSwitcher() {
  const { role, visibleSessions } = useRole();
  const switchRole = useSwitchRole();

  return (
    <div className="flex items-center gap-2.5">
      <label htmlFor="role-switcher" className="text-on-dark/70">
        Viewing as
      </label>
      <select
        id="role-switcher"
        value={role}
        onChange={(e) => switchRole(e.target.value as Role)}
        className="min-h-9 rounded-lg border border-white/25 bg-brand-900 px-2.5 py-1 text-note text-on-dark hover:border-white/50"
      >
        {ROLES.map((option) => (
          <option key={option} value={option}>
            {ROLE_LABELS[option]} — {SCOPE_NOTE[option]}
          </option>
        ))}
      </select>
      <span className="hidden text-on-dark/50 tabular-nums lg:inline">
        {visibleSessions.length} student
        {visibleSessions.length === 1 ? "" : "s"} in scope
      </span>
    </div>
  );
}
