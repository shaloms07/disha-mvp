/**
 * Stream matching for the school dashboards — SCHOOL_ADMIN_SPEC.md Section 4.
 *
 * Grades 8-10 are choosing a stream, not a career, so the Principal's demand
 * forecast is in streams. Rather than write a second matching engine, the four
 * streams are authored as CareerProfile-shaped records and handed to the
 * existing lib/matching.ts, which already takes the candidate list as an
 * argument. matching.ts is not modified.
 */

import streamsData from "@/data/school-admin/streams.json";
import { getTopMatches, matchCareers } from "@/lib/matching";
import type { CareerMatch, CareerProfile, RiasecType } from "@/types";

export const STREAMS = streamsData as CareerProfile[];

export type StreamId = "science" | "commerce" | "humanities" | "vocational";

export const STREAM_IDS: StreamId[] = [
  "science",
  "commerce",
  "humanities",
  "vocational",
];

export const STREAM_TITLES: Record<StreamId, string> = {
  science: "Science",
  commerce: "Commerce",
  humanities: "Humanities",
  vocational: "Vocational",
};

/**
 * Which stream a stated career preference implies.
 *
 * Kept here rather than added to data/careers.json so the consumer product's
 * data stays exactly as it shipped — this mapping is a school-dashboard
 * concern. Mapped by the stream a student would realistically take in 11th to
 * reach that career in the Indian system.
 */
export const CAREER_STREAM: Record<string, StreamId> = {
  "software-engineer": "science",
  doctor: "science",
  "graphic-designer": "vocational",
  teacher: "humanities",
  entrepreneur: "commerce",
  "chartered-accountant": "commerce",
  "mechanical-engineer": "science",
  psychologist: "humanities",
  "civil-servant": "humanities",
  "content-creator": "vocational",
  "data-scientist": "science",
  "hr-manager": "commerce",
  architect: "science",
  "sales-marketing": "commerce",
};

/** Rank all four streams for one student's RIASEC totals */
export function matchStreams(scores: Record<RiasecType, number>): CareerMatch[] {
  return matchCareers(scores, STREAMS);
}

/** The single best-fit stream — what the forecast counts as "psychometric fit" */
export function bestFitStream(
  scores: Record<RiasecType, number>,
): StreamId | undefined {
  const [top] = getTopMatches(scores, 1, STREAMS);
  return top ? (top.career.id as StreamId) : undefined;
}

/**
 * The stream implied by a parent's stated career preference.
 *
 * Takes a career *title*, because that is what /register stores. Falls back to
 * an id lookup so either form works.
 */
export function streamForCareerTitle(
  title: string,
  careers: CareerProfile[],
): StreamId | undefined {
  const career = careers.find((c) => c.title === title || c.id === title);
  return career ? CAREER_STREAM[career.id] : undefined;
}
