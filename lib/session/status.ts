/**
 * The exposed status a client sees is not always the persisted one:
 * REGISTERED/IN_PROGRESS/COMPLETED live on AssessmentSession.status, advanced
 * by server/routes/session.ts's PATCH handler, but TIMED_OUT is never stored -
 * it's derived at read time from lastActivityAt, so a session that goes
 * idle and later comes back to life just resumes as IN_PROGRESS, no separate
 * "un-timeout" transition needed.
 */

import type { SessionStatus } from "@prisma/client";

export const SESSION_TIMEOUT_MINUTES = 30;

export type ExposedSessionStatus = SessionStatus | "TIMED_OUT";

export function deriveExposedStatus(session: {
  status: SessionStatus;
  lastActivityAt: Date;
}): ExposedSessionStatus {
  if (session.status === "COMPLETED") return "COMPLETED";

  const idleMs = Date.now() - session.lastActivityAt.getTime();
  if (idleMs > SESSION_TIMEOUT_MINUTES * 60 * 1000) return "TIMED_OUT";

  return session.status;
}
