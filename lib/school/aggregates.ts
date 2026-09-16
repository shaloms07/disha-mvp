/**
 * Everything the school dashboards aggregate — SCHOOL_ADMIN_SPEC.md Sections 4 and 6.
 *
 * Reads the same completed SessionState records the consumer flow produces,
 * grouped by schoolId/classId. There is no separate student entity: a row on
 * the Principal's heatmap is just a count over sessions.
 *
 * All of it is derived, nothing is stored — in particular the dissonance flag
 * is recomputed from lib/matching.ts every time rather than being a field in
 * the mock data, so it can never drift away from the ranking the parent is
 * actually shown on /results.
 */

import mockSessionsData from "@/data/school-admin/mockSessions.json";
import mockNormsData from "@/data/school-admin/mockNorms.json";
import { CAREERS, getTopMatches } from "@/lib/matching";
import { ALL_MODULES, responsesFor, type TestModule } from "@/lib/testModules";
import { APTITUDE_MAX_SCORE } from "@/lib/aptitudeScoring";
import { CLASSES, SCHOOL } from "./schoolCode";
import {
  STREAM_IDS,
  bestFitStream,
  streamForCareerTitle,
  type StreamId,
} from "./streams";
import {
  APTITUDE_DOMAINS,
  type AptitudeDomain,
  type SchoolClass,
  type SessionState,
} from "@/types";

/** The demo's pool of students who already went through the consumer flow */
export const ALL_SESSIONS = mockSessionsData as unknown as SessionState[];

export const SCHOOL_SESSIONS = ALL_SESSIONS.filter(
  (s) => s.schoolId === SCHOOL.id,
);

export const NORMS = mockNormsData as {
  label: string;
  disclaimer: string;
  values: Record<AptitudeDomain, number>;
};

/* ------------------------------------------------------------- status ladder */

/** The same ladder as SPEC.md's test_sessions.status, derived not stored */
export type SessionStatus =
  | "registered"
  | "consent_given"
  | "otp_verified"
  | "in_progress"
  | "completed";

export const STATUS_LABELS: Record<SessionStatus, string> = {
  registered: "Registered",
  consent_given: "Consent given",
  otp_verified: "Verified",
  in_progress: "In progress",
  completed: "Completed",
};

export type ModuleStatus = "not_started" | "in_progress" | "completed";

/** How far through one module a session is */
export function moduleStatus(
  session: SessionState,
  module: TestModule,
): ModuleStatus {
  if (session[module.scoresKey]) return "completed";
  return Object.keys(responsesFor(session, module)).length > 0
    ? "in_progress"
    : "not_started";
}

/**
 * A school session is complete only when all four modules are, since that is
 * what /test actually asks a school-tagged student to finish.
 */
export function isFullyComplete(session: SessionState): boolean {
  return ALL_MODULES.every((m) => Boolean(session[m.scoresKey]));
}

export function sessionStatus(session: SessionState): SessionStatus {
  if (isFullyComplete(session)) return "completed";
  if (ALL_MODULES.some((m) => moduleStatus(session, m) !== "not_started")) {
    return "in_progress";
  }
  if (session.otpVerified) return "otp_verified";
  if (session.consentGiven) return "consent_given";
  return "registered";
}

/** Questions answered across every module the student is being asked to do */
export function overallProgress(session: SessionState): {
  answered: number;
  total: number;
  percent: number;
} {
  const total = ALL_MODULES.reduce((sum, m) => sum + m.items.length, 0);
  const answered = ALL_MODULES.reduce(
    (sum, m) => sum + m.answeredCount(responsesFor(session, m)),
    0,
  );
  return { answered, total, percent: Math.round((answered / total) * 100) };
}

/* ---------------------------------------------------------------- grouping */

/** A stable, human-readable id for a session in the demo's tables and modals */
export function sessionKey(session: SessionState): string {
  return session.sessionToken ?? `${session.classId ?? "na"}-${session.childName}`;
}

export const UNASSIGNED = "unassigned";

/**
 * Students who came in on a bare school code carry no section. They are real
 * students of the school, so the Principal must see them — they just cannot be
 * filed under any class teacher until someone assigns them.
 */
export function classIdOf(session: SessionState): string {
  return session.classId ?? UNASSIGNED;
}

export function sessionsInClass(classId: string): SessionState[] {
  return SCHOOL_SESSIONS.filter((s) => classIdOf(s) === classId);
}

export const UNASSIGNED_SESSIONS = sessionsInClass(UNASSIGNED);

/* ----------------------------------------------------- completion heatmap */

export interface ClassCompletion {
  schoolClass: SchoolClass;
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  percent: number;
}

export function completionFor(schoolClass: SchoolClass): ClassCompletion {
  const sessions = sessionsInClass(schoolClass.id);
  const completed = sessions.filter(isFullyComplete).length;
  const inProgress = sessions.filter(
    (s) => sessionStatus(s) === "in_progress",
  ).length;
  return {
    schoolClass,
    total: sessions.length,
    completed,
    inProgress,
    notStarted: sessions.length - completed - inProgress,
    percent: sessions.length
      ? Math.round((completed / sessions.length) * 100)
      : 0,
  };
}

export const CLASS_COMPLETION: ClassCompletion[] = CLASSES.map(completionFor);

/** Grades and sections present, for laying the heatmap out as a grid */
export const GRADES: number[] = [...new Set(CLASSES.map((c) => c.grade))].sort(
  (a, b) => a - b,
);
export const SECTIONS: string[] = [
  ...new Set(CLASSES.map((c) => c.section)),
].sort();

export function completionAt(
  grade: number,
  section: string,
): ClassCompletion | undefined {
  return CLASS_COMPLETION.find(
    (c) => c.schoolClass.grade === grade && c.schoolClass.section === section,
  );
}

export const SCHOOL_TOTALS = {
  students: SCHOOL_SESSIONS.length,
  completed: SCHOOL_SESSIONS.filter(isFullyComplete).length,
  inProgress: SCHOOL_SESSIONS.filter((s) => sessionStatus(s) === "in_progress")
    .length,
  notStarted: SCHOOL_SESSIONS.filter((s) =>
    ["registered", "consent_given", "otp_verified"].includes(sessionStatus(s)),
  ).length,
  get percent() {
    return this.students
      ? Math.round((this.completed / this.students) * 100)
      : 0;
  },
};

/* ------------------------------------------------------- stream forecasting */

export interface StreamDemandRow {
  stream: StreamId;
  /** Students whose parent named a career that implies this stream */
  stated: number;
  /** Students whose RIASEC profile fits this stream best */
  fit: number;
}

/**
 * Two counts per stream, over different populations by necessity: every scored
 * student has a psychometric fit, but only the ones whose parent filled in the
 * optional preference field have a stated one. The screen has to say so, or
 * the two bars read as a like-for-like comparison they are not.
 */
export function streamDemand(
  sessions: SessionState[] = SCHOOL_SESSIONS,
): { rows: StreamDemandRow[]; statedBase: number; fitBase: number } {
  const stated = Object.fromEntries(STREAM_IDS.map((s) => [s, 0])) as Record<
    StreamId,
    number
  >;
  const fit = { ...stated };
  let statedBase = 0;
  let fitBase = 0;

  for (const session of sessions) {
    if (session.scores) {
      const best = bestFitStream(session.scores);
      if (best) {
        fit[best] += 1;
        fitBase += 1;
      }
    }
    if (session.parentStatedPreference) {
      const implied = streamForCareerTitle(
        session.parentStatedPreference,
        CAREERS,
      );
      if (implied) {
        stated[implied] += 1;
        statedBase += 1;
      }
    }
  }

  return {
    rows: STREAM_IDS.map((stream) => ({
      stream,
      stated: stated[stream],
      fit: fit[stream],
    })),
    statedBase,
    fitBase,
  };
}

/* --------------------------------------------------- cognitive benchmarking */

export interface AptitudeBenchmarkRow {
  domain: AptitudeDomain;
  school: number;
  norm: number;
  /** school minus norm, on the 3-15 scale */
  delta: number;
}

/**
 * School averages against the mock norm set.
 *
 * Both sides are illustrative: the school side is self-rated confidence rather
 * than tested ability, and the norm side is invented. Any screen showing this
 * has to say both things.
 */
export function aptitudeBenchmark(
  sessions: SessionState[] = SCHOOL_SESSIONS,
): { rows: AptitudeBenchmarkRow[]; base: number; max: number } {
  const scored = sessions.filter((s) => s.aptitudeScores);
  const rows = APTITUDE_DOMAINS.map((domain) => {
    const total = scored.reduce(
      (sum, s) => sum + (s.aptitudeScores?.[domain] ?? 0),
      0,
    );
    const school = scored.length
      ? Math.round((total / scored.length) * 10) / 10
      : 0;
    const norm = NORMS.values[domain];
    return {
      domain,
      school,
      norm,
      delta: Math.round((school - norm) * 10) / 10,
    };
  });
  return { rows, base: scored.length, max: APTITUDE_MAX_SCORE };
}

/* ------------------------------------------------------- dissonance index */

/**
 * The rule from Section 6, applied live: a parent's stated preference is
 * dissonant when it is not among the child's top three matched careers.
 *
 * One rule at every grade. The parent named a career, so a career ranking is
 * the like-for-like comparison — even where the student is young enough that
 * the product itself talks to them in streams.
 */
export const DISSONANCE_TOP_N = 3;

export interface DissonanceRow {
  session: SessionState;
  statedPreference: string;
  topMatches: string[];
  dissonant: boolean;
}

export function dissonanceRows(
  sessions: SessionState[] = SCHOOL_SESSIONS,
): DissonanceRow[] {
  return sessions
    .filter((s) => s.parentStatedPreference && s.scores)
    .map((session) => {
      const topMatches = getTopMatches(session.scores!, DISSONANCE_TOP_N).map(
        (m) => m.career.title,
      );
      return {
        session,
        statedPreference: session.parentStatedPreference!,
        topMatches,
        dissonant: !topMatches.includes(session.parentStatedPreference!),
      };
    });
}

export interface DissonanceSummary {
  /** Only sessions where the parent actually filled the field are counted */
  base: number;
  dissonant: number;
  percent: number;
}

export function summarise(rows: DissonanceRow[]): DissonanceSummary {
  const dissonant = rows.filter((r) => r.dissonant).length;
  return {
    base: rows.length,
    dissonant,
    percent: rows.length ? Math.round((dissonant / rows.length) * 100) : 0,
  };
}

/** Per-grade breakdown for the table under the headline stat */
export function dissonanceByGrade(
  rows: DissonanceRow[] = dissonanceRows(),
): { grade: number; summary: DissonanceSummary }[] {
  return GRADES.map((grade) => ({
    grade,
    summary: summarise(
      rows.filter((r) => r.session.childClass === `Class ${grade}`),
    ),
  })).filter((entry) => entry.summary.base > 0);
}

/** The careers parents name most often, and how often those are a mismatch */
export function mostStatedPreferences(
  rows: DissonanceRow[] = dissonanceRows(),
  limit = 5,
): { title: string; stated: number; dissonant: number }[] {
  const counts = new Map<string, { stated: number; dissonant: number }>();
  for (const row of rows) {
    const entry = counts.get(row.statedPreference) ?? { stated: 0, dissonant: 0 };
    entry.stated += 1;
    if (row.dissonant) entry.dissonant += 1;
    counts.set(row.statedPreference, entry);
  }
  return [...counts.entries()]
    .map(([title, v]) => ({ title, ...v }))
    .sort((a, b) => b.stated - a.stated || a.title.localeCompare(b.title))
    .slice(0, limit);
}
