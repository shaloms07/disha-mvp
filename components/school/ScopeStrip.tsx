"use client";

import { useRole } from "@/lib/school/RoleContext";
import {
  MOCK_PARENT_CHILD,
  MOCK_TEACHER,
  ROLES,
  ROLE_LABELS,
  ROLE_SCOPE,
  sessionsForRole,
} from "@/lib/school/roles";
import type { Role } from "@/types";

/**
 * What the role switcher is actually demonstrating, said out loud.
 *
 * The switcher on its own shows three different screens, which looks like
 * navigation. This strip is what makes the point land: the same underlying
 * pool of students, three different slices of it, with the counts visible. It
 * also carries the sentence that has to be said before this ever touches a
 * real student record — the scoping is presentation, not enforcement.
 */
const DETAIL: Record<Role, string> = {
  principal: "every section, classes 8 to 12",
  teacher: `${MOCK_TEACHER.name}, sections ${MOCK_TEACHER.classIds.join(" and ")}`,
  parent: `one child — ${MOCK_PARENT_CHILD}`,
};

export function ScopeStrip() {
  const { role } = useRole();

  return (
    <div className="mb-8 rounded-xl border border-hairline bg-surface-sunk px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {ROLES.map((option) => {
          const count = sessionsForRole(option).length;
          const active = option === role;
          return (
            <div
              key={option}
              className={
                active
                  ? "flex items-baseline gap-2"
                  : "flex items-baseline gap-2 opacity-45"
              }
            >
              <span
                aria-hidden="true"
                className={
                  active
                    ? "size-2 rounded-full bg-brand-700"
                    : "size-2 rounded-full bg-text-muted"
                }
              />
              <span className="text-note font-medium text-text">
                {ROLE_LABELS[option]}
              </span>
              <span className="text-note text-text-secondary tabular-nums">
                {count} student{count === 1 ? "" : "s"}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-note text-text-secondary">
        <strong className="font-medium text-text">
          {ROLE_SCOPE[role]}:
        </strong>{" "}
        {DETAIL[role]}. Switching roles changes which records a screen renders —
        it is a simulation of the intended scoping, not access control. Every
        record is in this page either way.
      </p>
    </div>
  );
}
