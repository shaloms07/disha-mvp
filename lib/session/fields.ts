/**
 * The explicit, typed contract for PATCH /session/:token (see
 * server/routes/session.ts). `responses`/`scores` are JSON objects on the
 * wire, so their keys arrive as strings even though SessionState types them
 * as Record<number, number> - the route handler is what turns them back into
 * numeric-keyed objects.
 *
 * `otpVerified` is deliberately NOT patchable here - it must only ever be set
 * by POST /otp/verify, server-side, after a real code is checked. Accepting
 * it from the client would let anyone holding a session token mark
 * themselves verified without ever proving they control the phone number.
 */

import { z } from "zod";

const MODULE_ANSWERS_SCHEMA = z.record(z.string(), z.record(z.string(), z.number()));

export const SESSION_PATCH_SCHEMA = z
  .object({
    parentName: z.string().min(1).optional(),
    parentMobile: z.string().optional(),
    childName: z.string().min(1).optional(),
    childClass: z.string().optional(),
    childClassOther: z.string().optional(),
    consentGiven: z.boolean().optional(),
    schoolCode: z.string().optional(),
    schoolId: z.string().optional(),
    classId: z.string().optional(),
    parentStatedPreference: z.string().optional(),
    responses: z.record(z.string(), z.number()).optional(),
    scores: z.record(z.string(), z.number()).optional(),
    /** Keyed by module name, e.g. { aptitude: { "1": 3 }, sjt: { "2": 0 } } */
    moduleResponses: MODULE_ANSWERS_SCHEMA.optional(),
    moduleScores: MODULE_ANSWERS_SCHEMA.optional(),
    completedAt: z.string().optional(),
  })
  .strict();

export type SessionPatchBody = z.infer<typeof SESSION_PATCH_SCHEMA>;

type PatchTarget = "parent" | "child" | "session";

/** Which table each syncable field belongs to — explicit, not name-sniffed. */
export const FIELD_TABLE_MAP: Record<keyof SessionPatchBody, PatchTarget> = {
  parentName: "parent",
  parentMobile: "parent",
  childName: "child",
  childClass: "child",
  childClassOther: "child",
  consentGiven: "session",
  schoolCode: "session",
  schoolId: "session",
  classId: "session",
  parentStatedPreference: "session",
  responses: "session",
  scores: "session",
  moduleResponses: "session",
  moduleScores: "session",
  completedAt: "session",
};

/** JSON-shaped fields merged one level deep server-side, never blindly
 *  replaced - this is what keeps two devices working the same test link
 *  from clobbering each other's answers. */
export const MERGE_FIELDS = new Set<keyof SessionPatchBody>(["responses", "scores"]);

/** Same idea as MERGE_FIELDS, but merged two levels deep (per module name,
 *  then per question id within it) since these are Record<moduleName, Record<...>>. */
export const NESTED_MERGE_FIELDS = new Set<keyof SessionPatchBody>([
  "moduleResponses",
  "moduleScores",
]);
