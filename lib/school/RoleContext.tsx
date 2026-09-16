"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo } from "react";
import { sessionsForRole } from "./roles";
import type { Role, SessionState } from "@/types";

/**
 * The simulated "who is looking at this" state — SCHOOL_ADMIN_SPEC.md Section 5.
 *
 * To be unambiguous about what this is: it is a presentation control, not
 * security. Every mock session is in the client bundle regardless of the role
 * selected, and switching roles only changes which of them a screen chooses to
 * render. It exists so a demo can show the RBAC matrix's data scoping — full
 * school / assigned sections / own child — before any of it is implemented for
 * real. Anyone in the room should be told that explicitly; the layout footer
 * and the scope strip on screen both say so.
 */

export const ROLE_HOME: Record<Role, string> = {
  principal: "/school/principal",
  teacher: "/school/teacher",
  parent: "/school/parent",
};

/** Which role a given /school path belongs to, so a deep link stays coherent */
export function roleForPath(pathname: string): Role | undefined {
  if (pathname.startsWith("/school/principal")) return "principal";
  if (pathname.startsWith("/school/teacher")) return "teacher";
  if (pathname.startsWith("/school/parent")) return "parent";
  return undefined;
}

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  /** Only the sessions the current role is allowed to see */
  visibleSessions: SessionState[];
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  /**
   * The route is the role.
   *
   * Each role has its own screen rather than a shared one with rows hidden, so
   * holding the role in state as well would mean keeping two things in sync
   * and getting it wrong on a deep link — a shared URL to the teacher
   * dashboard would render under whatever role was last selected and show the
   * wrong scope in the header. Deriving it means that cannot happen.
   */
  const role: Role = roleForPath(pathname) ?? "principal";

  const setRole = useCallback(
    (next: Role) => router.push(ROLE_HOME[next]),
    [router],
  );

  const value = useMemo<RoleContextValue>(
    () => ({ role, setRole, visibleSessions: sessionsForRole(role) }),
    [role, setRole],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside a <RoleProvider>");
  return ctx;
}

/** Convenience for screens that only need the scoped pool */
export function useVisibleSessions(): SessionState[] {
  return useRole().visibleSessions;
}

/** Switching role navigates to that role's screen — they are the same act */
export function useSwitchRole(): (role: Role) => void {
  return useRole().setRole;
}
