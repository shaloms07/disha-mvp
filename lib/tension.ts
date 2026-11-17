/**
 * The one personalised "tension" line on the Deep-Dive snapshot - a true
 * statement about the child's own matches that the free page can't resolve,
 * so the paid report can. At most one line, and only one that is true.
 *
 * Rules, highest priority first:
 *   a. A top-2 match depends most on an aptitude that isn't the child's
 *      strongest - NOT IMPLEMENTED: data/careers.json gives each career a
 *      RIASEC profile only; nothing links a career to an aptitude.
 *   b. The top career by interest isn't the top career by motivation - NOT
 *      IMPLEMENTED: no career is linked to motivation (work values) either.
 *   c. A matched career sits outside the child's top interests: none of the
 *      career's own strongest RIASEC types is one of the child's top two.
 *   d. Fallback: the matches are ranked and the order matters.
 *
 * Rules a and b need per-career aptitude and motivation tags in
 * data/careers.json first; never approximate them.
 *
 * Pure - no I/O - so scripts/tension-check.ts can test every rule.
 */

import type { RiasecType } from "@/types";
import { RIASEC_TYPES } from "@/types";

export type TensionKey = "outside_interests" | "ranked";

export interface TensionInput {
  /** The child's strongest interests, strongest first (only the first two are used) */
  studentRanked: RiasecType[];
  /** The matched careers' RIASEC profiles, best match first */
  matchedProfiles: Record<RiasecType, number>[];
}

/** A career's strongest type(s) - every type tied for its highest value */
function strongestTypes(profile: Record<RiasecType, number>): RiasecType[] {
  const max = Math.max(...RIASEC_TYPES.map((type) => profile[type]));
  return RIASEC_TYPES.filter((type) => profile[type] === max);
}

export function pickTension({ studentRanked, matchedProfiles }: TensionInput): TensionKey {
  const top2 = studentRanked.slice(0, 2);
  const outside = matchedProfiles.some((profile) => !strongestTypes(profile).some((type) => top2.includes(type)));
  if (outside) return "outside_interests";
  return "ranked";
}

/** The line itself - the child's name, never "his/her" */
export function tensionLine(key: TensionKey, name: string): string {
  switch (key) {
    case "outside_interests":
      return `1 career ${name} may not have considered.`;
    case "ranked":
      return `${name}'s matches are ranked — the order matters.`;
  }
}
