/**
 * The results-page offer copy that changes with the child's class. A Class 8
 * parent isn't choosing a stream yet, and a Class 11-12 parent already has -
 * so one headline ("Which stream should…") only fits Class 10. Anything
 * unknown (an old "Other" registration, a missing class) reads as Class 10.
 *
 * Copy only - prices still come from lib/pricing.ts, and the report's
 * bullet list stays TIER_OPTIONS[].includes with at most one line swapped.
 */

export type ClassBand = "explore" | "stream" | "senior";

/** "Class 8"…"Class 12" (lib/validation.ts's CLASS_OPTIONS) to a band. */
export function classBand(childClass?: string): ClassBand {
  const match = childClass?.match(/\b(8|9|10|11|12)\b/);
  const grade = match ? Number(match[1]) : undefined;
  if (grade === 8 || grade === 9) return "explore";
  if (grade === 11 || grade === 12) return "senior";
  return "stream";
}

/** The line in TIER_OPTIONS[3].includes that a band may reword */
const STREAM_LINE = "Stream and subject advice";

interface BandCopy {
  /** Above the ₹999 card on the results-ready page */
  headline(firstName: string): string;
  /** Replaces STREAM_LINE in the report's bullet list, when set */
  streamLine?: string;
  /** The results-ready page's locked row about streams */
  lockedStreamRow: string;
}

const OFFER_COPY: Record<ClassBand, BandCopy> = {
  explore: {
    headline: (name) => `What is ${name} naturally good at, and where could it lead?`,
    lockedStreamRow: "Which stream to aim for in Class 11, and which subjects",
  },
  stream: {
    headline: (name) => `Which stream should ${name} choose?`,
    lockedStreamRow: "Which stream to choose, and which subjects",
  },
  senior: {
    headline: (name) => `Which courses, colleges and entrance exams suit ${name}?`,
    streamLine: "Courses, entrance exams and education routes for each career",
    lockedStreamRow: "Which courses and entrance exams to aim for",
  },
};

/** "Which stream should Aarav choose? See Aarav's full plan." */
export function offerHeadline(childClass: string | undefined, firstName: string): string {
  const name = firstName || "this student";
  const plan = firstName ? `${firstName}'s` : "the";
  return `${OFFER_COPY[classBand(childClass)].headline(name)} See ${plan} full plan.`;
}

/** The report's bullet list, with the stream line reworded for this class */
export function offerIncludes(includes: readonly string[], childClass: string | undefined): string[] {
  const streamLine = OFFER_COPY[classBand(childClass)].streamLine;
  return includes.map((item) => (streamLine && item === STREAM_LINE ? streamLine : item));
}

export function lockedStreamRow(childClass: string | undefined): string {
  return OFFER_COPY[classBand(childClass)].lockedStreamRow;
}
