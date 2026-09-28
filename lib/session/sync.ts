/**
 * Fire-and-forget sync to the server, called from SessionContext's mutate()
 * only (never from write() directly) - see lib/context/SessionContext.tsx.
 * resetSession()/startFreshRegistration() call write() directly, bypassing
 * mutate(), which is exactly what keeps a session reset from wiping the
 * already-persisted server row for that token.
 *
 * Sends the full current values of the fields this phase's backend actually
 * persists (lib/session/fields.ts's contract) - no diffing, since responses/
 * scores are already fully-merged locally and the server merges them again
 * on arrival, so a dropped request is harmless: the next mutation's sync
 * carries the same accumulated state forward.
 */

import type { SessionState } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const SYNCABLE_KEYS = [
  "parentName",
  "parentMobile",
  "childName",
  "childClass",
  "consentGiven",
  "otpVerified",
  "schoolCode",
  "schoolId",
  "classId",
  "parentStatedPreference",
  "responses",
  "scores",
  "completedAt",
] as const satisfies readonly (keyof SessionState)[];

export function syncSessionToServer(session: SessionState): void {
  if (!session.sessionToken) return;

  const body: Record<string, unknown> = {};
  for (const key of SYNCABLE_KEYS) {
    const value = session[key];
    if (value !== undefined) body[key] = value;
  }
  if (Object.keys(body).length === 0) return;

  fetch(`${API_BASE_URL}/session/${session.sessionToken}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch((error: unknown) => {
    // Local sessionStorage stays authoritative for this tab either way - a
    // dropped sync just means cross-device resume sees slightly stale data
    // until the next successful one. Tagged with the token so failures are
    // greppable in server/browser logs.
    console.error(`[session:sync] failed for ${session.sessionToken}`, error);
  });
}
