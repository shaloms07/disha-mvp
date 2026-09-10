/**
 * Demo personas — pre-filled answer sets for showing the product without
 * tapping through 60 questions each time.
 *
 * These are a demo aid, not product data. They're also the fixtures the
 * Stage 1 sanity script checks the ranking against, so the profiles shown in
 * a demo are exactly the ones that were validated.
 */

import { QUESTIONS } from "./scoring";
import type { RiasecType } from "@/types";

export interface Persona {
  id: string;
  childName: string;
  childClass: string;
  parentName: string;
  parentMobile: string;
  /** One line a presenter can read out */
  blurb: string;
  /** What the ranking should come back with, for a sanity check on stage */
  expectedTop: string;
  /** Typical answer per RIASEC type, 1-5 */
  baseline: Record<RiasecType, number>;
}

export const PERSONAS: Persona[] = [
  {
    id: "rohan",
    childName: "Rohan",
    childClass: "Class 10",
    parentName: "Anita Sharma",
    parentMobile: "9876543210",
    blurb: "Takes things apart, codes, loves the maths olympiad.",
    expectedTop: "Mechanical Engineer, Software Engineer, Data Scientist",
    baseline: { R: 4, I: 5, A: 2, S: 2, E: 3, C: 4 },
  },
  {
    id: "aisha",
    childName: "Aisha",
    childClass: "Class 9",
    parentName: "Farah Khan",
    parentMobile: "9812345678",
    blurb: "Sketches constantly, runs the drama club, tutors juniors.",
    expectedTop: "Content Creator, Graphic Designer, Teacher",
    baseline: { R: 1, I: 2, A: 5, S: 5, E: 3, C: 2 },
  },
  {
    id: "kabir",
    childName: "Kabir",
    childClass: "Class 12",
    parentName: "Vikram Mehta",
    parentMobile: "9900112233",
    blurb: "Head boy, runs a resale side hustle, keeps meticulous accounts.",
    expectedTop: "Civil Services Officer, HR Manager, Chartered Accountant",
    baseline: { R: 2, I: 3, A: 2, S: 4, E: 5, C: 5 },
  },
];

/**
 * Expand a per-type baseline into all 60 answers, with a deterministic -1/0/+1
 * wobble so the answers look like a real person's rather than the same digit
 * ten times over.
 */
export function responsesFromBaseline(
  baseline: Record<RiasecType, number>,
): Record<number, number> {
  const seen: Record<string, number> = {};
  const responses: Record<number, number> = {};

  for (const question of QUESTIONS) {
    const n = (seen[question.type] = (seen[question.type] ?? 0) + 1);
    const wobble = (n % 3) - 1;
    responses[question.id] = Math.min(
      5,
      Math.max(1, baseline[question.type] + wobble),
    );
  }

  return responses;
}

export function buildResponses(persona: Persona): Record<number, number> {
  return responsesFromBaseline(persona.baseline);
}
