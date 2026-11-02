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

import type { ModuleResponsesKey, ModuleScoresKey, SessionState } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

/**
 * Every module beyond the free interest test - the school pilot's three and
 * the paid Deep-Dive's three. Their answers and scores travel as the PATCH's
 * moduleResponses / moduleScores, keyed by these same SessionState names
 * (server/routes/session.ts reads moduleScores[<scoresKey>] to tell when the
 * Deep-Dive is finished - see DEEP_DIVE_MODULES in lib/testModules.ts).
 */
const MODULE_KEYS = [
  ["aptitudeResponses", "aptitudeScores"],
  ["personalityResponses", "personalityScores"],
  ["workValuesResponses", "workValuesScores"],
  ["deepAptitudeResponses", "deepAptitudeScores"],
  ["sjtResponses", "sjtScores"],
  ["deepWorkValuesResponses", "deepWorkValuesScores"],
] as const satisfies readonly (readonly [ModuleResponsesKey, ModuleScoresKey])[];

type ModuleMap = Record<string, Record<string, number>>;

function moduleMaps(session: SessionState): { moduleResponses: ModuleMap; moduleScores: ModuleMap } {
  const moduleResponses: ModuleMap = {};
  const moduleScores: ModuleMap = {};
  for (const [responsesKey, scoresKey] of MODULE_KEYS) {
    const responses = session[responsesKey];
    const scores = session[scoresKey];
    if (responses && Object.keys(responses).length) moduleResponses[responsesKey] = responses;
    if (scores) moduleScores[scoresKey] = scores as Record<string, number>;
  }
  return { moduleResponses, moduleScores };
}

/**
 * The reverse, for a link opened on another device (/results?t=, /resume?t=):
 * the server's moduleResponses / moduleScores turned back into SessionState
 * fields, so the Deep-Dive picks up where it was and a finished one shows its
 * report. Every module key is present - undefined where the server has
 * nothing - so a caller replacing this tab's data (/results) also clears
 * whatever another child left here; a caller merging (/resume) keeps only
 * the defined ones.
 */
export function moduleFieldsFromServer(
  moduleResponses: unknown,
  moduleScores: unknown,
): Partial<SessionState> {
  const responses = (moduleResponses ?? {}) as ModuleMap;
  const scores = (moduleScores ?? {}) as ModuleMap;
  const fields: Record<string, unknown> = {};
  for (const [responsesKey, scoresKey] of MODULE_KEYS) {
    fields[responsesKey] =
      responses[responsesKey] && Object.keys(responses[responsesKey]).length ? responses[responsesKey] : undefined;
    fields[scoresKey] = scores[scoresKey] ?? undefined;
  }
  return fields as Partial<SessionState>;
}

const SYNCABLE_KEYS = [
  "parentName",
  "parentMobile",
  "childName",
  "childClass",
  "consentGiven",
  // otpVerified deliberately excluded - the backend only accepts it from
  // POST /otp/verify now (server-side, after a real code check), and rejects
  // the whole PATCH (.strict()) if it's present here at all.
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
  const { moduleResponses, moduleScores } = moduleMaps(session);
  if (Object.keys(moduleResponses).length) body.moduleResponses = moduleResponses;
  if (Object.keys(moduleScores).length) body.moduleScores = moduleScores;
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
