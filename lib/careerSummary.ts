/**
 * The career summary on the results-ready page (/results once the Deep-Dive
 * is done, before its report is paid for): "{N} careers matched across {F}
 * fields", with how many careers fall in each field - but never which
 * careers, their rank or their fit. Seeing the #1 career by name read as the
 * final answer, so the page shows the shape of the result instead.
 *
 * The server builds it (server/routes/careerSummary.ts) so an unpaid
 * browser receives only these counts; scripts/career-summary-check.ts checks
 * that no career name can get into the response.
 *
 * SNAPSHOT_V2 (lib/featureFlags.ts): no fields and no names at all - just
 * the count and one tension line (lib/tension.ts). Every rank, the lowest
 * included, stays blurred until the report is bought.
 */

import { matchCareers } from "@/lib/matching";
import { rankInterestTypes } from "@/lib/scoring";
import { pickTension, type TensionKey } from "@/lib/tension";
import type { RiasecType } from "@/types";

/** "Matched" = Good match or better - the same 6+-of-10-stars line
 *  components/results/CareerGap.tsx labels "Good match". */
export const MATCHED_MIN_STARS = 6;

export interface CareerFieldSummary {
  /** How many careers are a Good match or better */
  matchedCount: number;
  /** How many distinct fields those careers fall in */
  fieldCount: number;
  /** Largest field first; names come from data/careers.json's `field` */
  fields: { name: string; count: number }[];
  /** SNAPSHOT_V2 only - which tension line to show (lib/tension.ts) */
  tension?: TensionKey;
}

/** What GET /session/:token/career-summary returns. A family whose plan
 *  already includes the full report gets { paid: true } and the report. */
export type CareerSummaryResponse = { paid: true } | { paid: false; summary: CareerFieldSummary };

export function buildCareerFieldSummary(scores: Record<RiasecType, number>): CareerFieldSummary {
  const matched = matchedCareers(scores);
  const counts = new Map<string, number>();
  for (const match of matched) {
    const field = match.career.field ?? "Other";
    counts.set(field, (counts.get(field) ?? 0) + 1);
  }
  const fields = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { matchedCount: matched.length, fieldCount: fields.length, fields };
}

function matchedCareers(scores: Record<RiasecType, number>) {
  return matchCareers(scores).filter((match) => match.stars >= MATCHED_MIN_STARS);
}

/** SNAPSHOT_V2: the count and a tension line - no fields, no names */
export function buildCareerSummaryV2(scores: Record<RiasecType, number>): CareerFieldSummary {
  const matched = matchedCareers(scores);
  return {
    matchedCount: matched.length,
    fieldCount: 0,
    fields: [],
    tension: pickTension({
      studentRanked: rankInterestTypes(scores),
      matchedProfiles: matched.map((match) => match.career.profile),
    }),
  };
}

/** The one place the response is shaped */
export function buildCareerSummaryResponse(input: {
  paid: boolean;
  scores: Record<RiasecType, number>;
  /** SNAPSHOT_V2 on the API (lib/featureFlags.ts's snapshotV2OnServer) */
  v2?: boolean;
}): CareerSummaryResponse {
  if (input.paid) return { paid: true };
  return { paid: false, summary: input.v2 ? buildCareerSummaryV2(input.scores) : buildCareerFieldSummary(input.scores) };
}

/** "8 careers matched across 5 fields" - or just the count when there are
 *  too few careers or fields for grouping to mean anything */
export function careerSummaryTitle(summary: CareerFieldSummary, name: string): string {
  const { matchedCount, fieldCount } = summary;
  if (matchedCount === 0) return `${name}'s careers, ranked by fit`;
  const careers = `${matchedCount} ${matchedCount === 1 ? "career" : "careers"} matched`;
  return matchedCount < 3 || fieldCount <= 1 ? careers : `${careers} across ${fieldCount} fields`;
}
