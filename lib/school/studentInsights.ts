/**
 * What a teacher needs to read off one student — SCHOOL_ADMIN_SPEC.md Section 4.
 *
 * Everything here is derived from the same four score sets the student's own
 * /results page is built from. No new scoring, and lib/scoring.ts and
 * lib/matching.ts are untouched: this file only decides which of their outputs
 * is the age-appropriate one to show, and where two of them disagree.
 */

import {
  APTITUDE_MAX_SCORE,
  rankAptitudeDomains,
} from "@/lib/aptitudeScoring";
import { CAREERS, getTopMatches, matchPercent } from "@/lib/matching";
import { getHollandCode, rankTypes } from "@/lib/scoring";
import { rankPersonalityTraits } from "@/lib/personalityScoring";
import { rankWorkValues } from "@/lib/workValuesScoring";
import { DISSONANCE_TOP_N } from "./aggregates";
import { STREAMS, bestFitStream, STREAM_TITLES } from "./streams";
import {
  APTITUDE_LABELS,
  BIG_FIVE_LABELS,
  RIASEC_LABELS,
  WORK_VALUE_LABELS,
  type AptitudeDomain,
  type CareerMatch,
  type RiasecType,
  type SessionState,
} from "@/types";

/** "Class 10" -> 10. Returns undefined for anything unparseable. */
export function gradeOf(session: SessionState): number | undefined {
  const match = /(\d{1,2})/.exec(session.childClass ?? "");
  return match ? Number(match[1]) : undefined;
}

/**
 * Grades 8-10 are choosing a stream; 11 and 12 have already chosen one and are
 * choosing a career. Showing a Class 8 student a ranked list of job titles
 * invites a decision they are not making for another two years, so the
 * recommendation switches on grade rather than showing everyone the same list.
 */
export function isStreamStage(session: SessionState): boolean {
  const grade = gradeOf(session);
  return grade === undefined ? false : grade <= 10;
}

export interface Recommendations {
  kind: "stream" | "career";
  heading: string;
  matches: CareerMatch[];
}

export function recommendationsFor(
  session: SessionState,
  count = 3,
): Recommendations | null {
  if (!session.scores) return null;
  return isStreamStage(session)
    ? {
        kind: "stream",
        heading: "Best-fit streams",
        matches: getTopMatches(session.scores, count, STREAMS),
      }
    : {
        kind: "career",
        heading: "Top career matches",
        matches: getTopMatches(session.scores, count, CAREERS),
      };
}

/* ------------------------------------------------- interest / aptitude gaps */

/**
 * Which self-rated aptitude domains each interest type leans on.
 *
 * Deliberately coarse — this is a conversation prompt for a parent meeting,
 * not a diagnostic. It exists to surface the case where a student is drawn to
 * work they do not currently believe they can do, which is the single most
 * useful thing a teacher can act on early.
 */
const INTEREST_APTITUDE_LINK: Record<RiasecType, AptitudeDomain[]> = {
  R: ["mechanical", "spatial"],
  I: ["numerical", "logical"],
  A: ["spatial", "verbal"],
  S: ["verbal"],
  E: ["verbal", "logical"],
  C: ["numerical"],
};

/** Midpoint of the 3-15 module range */
const APTITUDE_MIDPOINT = 9;
const APTITUDE_STRONG = 12;

export interface GapFlag {
  tone: "gap" | "strength";
  headline: string;
  detail: string;
}

/**
 * Where the student's strongest interests and their self-rated ease disagree.
 *
 * Both directions are reported. A gap is the thing to coach; a strength is the
 * thing to tell the parent, and a flashcard that only ever shows problems gets
 * read as a report card.
 */
export function gapFlags(session: SessionState): GapFlag[] {
  if (!session.scores || !session.aptitudeScores) return [];

  const topTypes = rankTypes(session.scores).slice(0, 2);
  const flags: GapFlag[] = [];

  /**
   * One flag per domain, not per interest type.
   *
   * Both of a student's top two interests can lean on the same domain — an
   * Investigative/Conventional student leans on Numerical twice — and the
   * score behind it is a single number either way. Reporting it once, against
   * their strongest interest, keeps the sheet from listing the same finding
   * twice in different words. Types are already in rank order, so the first
   * flag for a domain is the one from the stronger interest.
   */
  const covered = new Set<AptitudeDomain>();

  for (const type of topTypes) {
    for (const domain of INTEREST_APTITUDE_LINK[type]) {
      if (covered.has(domain)) continue;
      covered.add(domain);
      const score = session.aptitudeScores[domain];
      if (score < APTITUDE_MIDPOINT) {
        flags.push({
          tone: "gap",
          headline: `Strong ${RIASEC_LABELS[type]} interest, low confidence in ${APTITUDE_LABELS[domain]}`,
          detail: `Rates ${APTITUDE_LABELS[domain].toLowerCase()} tasks ${score}/${APTITUDE_MAX_SCORE}. Worth checking whether this is a skills gap or a confidence one — the module asks how easy something feels, not whether they get it right.`,
        });
      } else if (score >= APTITUDE_STRONG) {
        flags.push({
          tone: "strength",
          headline: `${RIASEC_LABELS[type]} interest backed by confidence in ${APTITUDE_LABELS[domain]}`,
          detail: `Rates ${APTITUDE_LABELS[domain].toLowerCase()} tasks ${score}/${APTITUDE_MAX_SCORE}, among their strongest.`,
        });
      }
    }
  }

  // Gaps first: on a sheet a teacher reads in the thirty seconds before a
  // parent sits down, the thing to raise should not be below the praise.
  return flags.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "gap" ? -1 : 1));
}

/* --------------------------------------------- parent preference vs the fit */

export interface PreferenceStatus {
  stated: string;
  topMatches: string[];
  dissonant: boolean;
}

/** Null when the parent left the optional field blank, which most will. */
export function preferenceStatus(
  session: SessionState,
): PreferenceStatus | null {
  if (!session.parentStatedPreference || !session.scores) return null;
  const topMatches = getTopMatches(session.scores, DISSONANCE_TOP_N).map(
    (m) => m.career.title,
  );
  return {
    stated: session.parentStatedPreference,
    topMatches,
    dissonant: !topMatches.includes(session.parentStatedPreference),
  };
}

/* --------------------------------------------------------------- summaries */

/** One-line reads of each module, for the flashcard and the PTM sheet */
export interface ModuleSummary {
  hollandCode?: string;
  topInterests?: string[];
  easiestDomains?: string[];
  hardestDomain?: string;
  topTraits?: string[];
  topValues?: string[];
  bestStream?: string;
}

export function summariseStudent(session: SessionState): ModuleSummary {
  const summary: ModuleSummary = {};

  if (session.scores) {
    summary.hollandCode = getHollandCode(session.scores);
    summary.topInterests = rankTypes(session.scores)
      .slice(0, 3)
      .map((t) => RIASEC_LABELS[t]);
    const stream = bestFitStream(session.scores);
    if (stream) summary.bestStream = STREAM_TITLES[stream];
  }

  if (session.aptitudeScores) {
    const ranked = rankAptitudeDomains(session.aptitudeScores);
    summary.easiestDomains = ranked.slice(0, 2).map((d) => APTITUDE_LABELS[d]);
    summary.hardestDomain = APTITUDE_LABELS[ranked[ranked.length - 1]];
  }

  if (session.personalityScores) {
    summary.topTraits = rankPersonalityTraits(session.personalityScores)
      .slice(0, 2)
      .map((t) => BIG_FIVE_LABELS[t]);
  }

  if (session.workValuesScores) {
    summary.topValues = rankWorkValues(session.workValuesScores)
      .slice(0, 3)
      .map((v) => WORK_VALUE_LABELS[v]);
  }

  return summary;
}

/** Re-exported so screens don't reach into lib/matching for one formatter */
export { matchPercent };
