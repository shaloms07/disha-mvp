/**
 * The explicit, typed contract for PATCH /api/session/[token] (see
 * app/api/session/[token]/route.ts). Only fields this phase's funnel
 * actually persists — deep-dive/school-pilot module fields on SessionState
 * aren't in the Prisma schema at all and are never sent (lib/session/sync.ts
 * whitelists to exactly this set before the request goes out).
 *
 * `responses`/`scores` are JSON objects on the wire, so their keys arrive as
 * strings even though SessionState types them as Record<number, number> -
 * the route handler is what turns them back into numeric-keyed objects.
 */

import { z } from "zod";

export const SESSION_PATCH_SCHEMA = z
  .object({
    parentName: z.string().min(1).optional(),
    parentMobile: z.string().optional(),
    childName: z.string().min(1).optional(),
    childClass: z.string().optional(),
    consentGiven: z.boolean().optional(),
    otpVerified: z.boolean().optional(),
    schoolCode: z.string().optional(),
    schoolId: z.string().optional(),
    classId: z.string().optional(),
    parentStatedPreference: z.string().optional(),
    responses: z.record(z.string(), z.number()).optional(),
    scores: z.record(z.string(), z.number()).optional(),
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
  consentGiven: "session",
  otpVerified: "session",
  schoolCode: "session",
  schoolId: "session",
  classId: "session",
  parentStatedPreference: "session",
  responses: "session",
  scores: "session",
  completedAt: "session",
};

/** JSON-shaped fields that must be merged server-side, never blindly replaced -
 *  see the plan's cross-device data-loss note. */
export const MERGE_FIELDS = new Set<keyof SessionPatchBody>(["responses", "scores"]);
