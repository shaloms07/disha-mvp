/**
 * Generates data/school-admin/mockSessions.json — run with `npm run mocks`.
 *
 * The school dashboards aggregate over a pool of students who already went
 * through the ordinary consumer flow, so the mock pool has to be genuinely
 * SessionState-shaped: real question ids, RIASEC totals that actually come out
 * of lib/scoring.ts, and parent preferences whose dissonance flag is decided by
 * the real lib/matching.ts ranking rather than asserted by hand.
 *
 * Everything is deterministic (fixed-seed PRNG), so re-running produces the
 * same file and diffs stay readable.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import schoolData from "../data/school-admin/mockSchool.json";
import { responsesFromBaseline } from "../lib/personas";
import { QUESTIONS, scoreResponses } from "../lib/scoring";
import { getTopMatches, CAREERS } from "../lib/matching";
import {
  APTITUDE_QUESTIONS,
  APTITUDE_QUESTIONS_BY_DOMAIN,
  scoreAptitude,
} from "../lib/aptitudeScoring";
import {
  PERSONALITY_QUESTIONS,
  PERSONALITY_QUESTIONS_BY_TRAIT,
  scorePersonality,
} from "../lib/personalityScoring";
import {
  WORK_VALUES_QUESTIONS,
  WORK_VALUES_QUESTIONS_BY_VALUE,
  scoreWorkValues,
} from "../lib/workValuesScoring";
import type { School } from "../types";
import {
  APTITUDE_DOMAINS,
  BIG_FIVE_TRAITS,
  WORK_VALUES,
  type AptitudeDomain,
  type RiasecType,
  type SessionState,
} from "../types";

const SCHOOL = schoolData as School;

// Read from the school fixture rather than repeating it, so swapping the
// school in mockSchool.json is a one-file change and the generated sessions
// cannot end up tagged to a school that no longer exists.
const SCHOOL_ID = SCHOOL.id;
const OUT = join(process.cwd(), "data", "school-admin", "mockSessions.json");

/* ------------------------------------------------------------------ random */

/** mulberry32 — small, deterministic, good enough for fixture data */
function makeRng(seed: number) {
  let a = seed;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20260915);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/* ----------------------------------------------------------------- roster */

/**
 * How far through the flow a given student got. Mirrors the status ladder in
 * SPEC.md (registered -> consent_given -> otp_verified -> in_progress ->
 * completed); for school sessions "completed" means all four modules, so the
 * middle stages name which module the student stalled on.
 */
type Stage =
  | "registered"
  | "consent_given"
  | "otp_verified"
  | "interest_in_progress"
  | "interest_done"
  | "aptitude_done"
  | "personality_done"
  | "completed";

interface Student {
  name: string;
  parent: string;
  classId: string | null; // null = joined by school code with no section
  stage: Stage;
  baseline: Record<RiasecType, number>;
  /** "aligned" picks from the top 3, "dissonant" deliberately does not */
  preference: "none" | "aligned" | "dissonant";
  /** Part-way through the module after `stage` — answers stored, no score yet */
  partialNext?: true;
  /**
   * Override the self-rated aptitude that would otherwise be derived from the
   * interest baseline. Without this every student's aptitude agrees with their
   * interests by construction, and the interest/aptitude gap flag — the most
   * useful thing on the teacher's flashcard — would never fire on real-looking
   * data. These are the students who want something they don't yet believe
   * they can do.
   */
  aptitudeTwist?: Partial<Record<AptitudeDomain, number>>;
}

/** Shorthand so the roster below stays readable */
function b(
  R: number,
  I: number,
  A: number,
  S: number,
  E: number,
  C: number,
): Record<RiasecType, number> {
  return { R, I, A, S, E, C };
}

const ROSTER: Student[] = [
  // ---- Grade 8 (streams, not careers, in the product — but same data shape)
  {
    name: "Aarav Menon",
    parent: "Deepak Menon",
    classId: "8-A",
    stage: "completed",
    baseline: b(4, 5, 2, 2, 3, 4),
    preference: "aligned",
  },
  {
    name: "Ishita Rao",
    parent: "Sunanda Rao",
    classId: "8-A",
    stage: "completed",
    baseline: b(1, 2, 5, 5, 3, 2),
    preference: "dissonant",
  },
  {
    name: "Kabir Sethi",
    parent: "Ramesh Sethi",
    classId: "8-A",
    stage: "personality_done",
    baseline: b(2, 3, 3, 4, 5, 4),
    preference: "none",
    partialNext: true,
  },
  {
    name: "Tara Bhatt",
    parent: "Nisha Bhatt",
    classId: "8-B",
    stage: "completed",
    baseline: b(5, 2, 5, 3, 3, 2),
    preference: "none",
  },
  {
    name: "Rehan Qureshi",
    parent: "Imran Qureshi",
    classId: "8-B",
    stage: "otp_verified",
    baseline: b(5, 3, 2, 2, 3, 3),
    preference: "none",
  },
  {
    name: "Ananya Pillai",
    parent: "Suresh Pillai",
    classId: "8-B",
    stage: "interest_done",
    baseline: b(2, 5, 3, 4, 2, 3),
    preference: "aligned",
  },

  // ---- Grade 9
  {
    name: "Vihaan Joshi",
    parent: "Manoj Joshi",
    classId: "9-A",
    stage: "completed",
    baseline: b(5, 4, 1, 2, 3, 4),
    preference: "dissonant",
  },
  {
    name: "Saanvi Kulkarni",
    parent: "Prerna Kulkarni",
    classId: "9-A",
    stage: "completed",
    baseline: b(1, 3, 5, 4, 4, 2),
    preference: "aligned",
  },
  {
    name: "Arjun Reddy",
    parent: "Bhaskar Reddy",
    classId: "9-A",
    stage: "interest_in_progress",
    baseline: b(3, 3, 3, 3, 4, 4),
    preference: "none",
  },
  {
    name: "Myra Dsouza",
    parent: "Glenda Dsouza",
    classId: "9-B",
    stage: "completed",
    baseline: b(2, 2, 4, 5, 4, 2),
    preference: "dissonant",
  },
  {
    name: "Dhruv Agarwal",
    parent: "Sanjay Agarwal",
    classId: "9-B",
    stage: "aptitude_done",
    baseline: b(2, 4, 2, 3, 5, 5),
    preference: "aligned",
    partialNext: true,
  },
  {
    name: "Zoya Ansari",
    parent: "Tabassum Ansari",
    classId: "9-B",
    stage: "registered",
    baseline: b(3, 4, 3, 4, 3, 3),
    preference: "none",
  },

  // ---- Grade 10 — the pilot's focus cohort, so it is the most complete
  {
    name: "Aditya Nambiar",
    parent: "Girish Nambiar",
    classId: "10-A",
    stage: "completed",
    baseline: b(4, 5, 2, 2, 3, 4),
    preference: "aligned",
  },
  {
    name: "Riya Chatterjee",
    parent: "Moushumi Chatterjee",
    classId: "10-A",
    stage: "completed",
    baseline: b(1, 2, 5, 4, 3, 2),
    preference: "dissonant",
  },
  {
    name: "Neel Vaidya",
    parent: "Ashutosh Vaidya",
    classId: "10-A",
    stage: "completed",
    baseline: b(2, 5, 2, 3, 3, 5),
    preference: "dissonant",
    aptitudeTwist: { numerical: 1.5 },
  },
  {
    name: "Sara Thomas",
    parent: "Elizabeth Thomas",
    classId: "10-A",
    stage: "completed",
    baseline: b(2, 3, 3, 5, 4, 3),
    preference: "aligned",
  },
  {
    name: "Om Prakash Yadav",
    parent: "Ram Yadav",
    classId: "10-A",
    stage: "personality_done",
    baseline: b(5, 4, 2, 2, 2, 3),
    preference: "dissonant",
  },
  {
    name: "Kiara Shetty",
    parent: "Rohini Shetty",
    classId: "10-B",
    stage: "completed",
    baseline: b(1, 3, 4, 4, 5, 3),
    preference: "aligned",
    aptitudeTwist: { logical: 1.5 },
  },
  {
    name: "Yash Malhotra",
    parent: "Kapil Malhotra",
    classId: "10-B",
    stage: "completed",
    baseline: b(3, 4, 2, 2, 5, 5),
    preference: "dissonant",
  },
  {
    name: "Aleena Fernandes",
    parent: "Joseph Fernandes",
    classId: "10-B",
    stage: "interest_done",
    baseline: b(2, 2, 5, 4, 3, 2),
    preference: "none",
    partialNext: true,
  },
  {
    name: "Harsh Vardhan",
    parent: "Devendra Singh",
    classId: "10-B",
    stage: "consent_given",
    baseline: b(4, 3, 2, 3, 4, 4),
    preference: "none",
  },

  // ---- Grade 11
  {
    name: "Nandini Iyer",
    parent: "Krishnan Iyer",
    classId: "11-A",
    stage: "completed",
    baseline: b(1, 5, 3, 4, 2, 3),
    preference: "aligned",
  },
  {
    name: "Rudra Pratap",
    parent: "Jaiveer Pratap",
    classId: "11-A",
    stage: "completed",
    baseline: b(5, 3, 4, 2, 4, 2),
    preference: "dissonant",
  },
  {
    name: "Simran Kaur",
    parent: "Harpreet Kaur",
    classId: "11-B",
    stage: "completed",
    baseline: b(2, 3, 4, 5, 4, 2),
    preference: "dissonant",
  },
  {
    name: "Aryan Gowda",
    parent: "Mahesh Gowda",
    classId: "11-B",
    stage: "aptitude_done",
    baseline: b(3, 5, 2, 2, 4, 5),
    preference: "none",
  },

  // ---- Grade 12
  {
    name: "Meghna Banerjee",
    parent: "Arup Banerjee",
    classId: "12-A",
    stage: "completed",
    baseline: b(2, 4, 3, 3, 5, 5),
    preference: "aligned",
  },
  {
    name: "Faisal Sayyed",
    parent: "Iqbal Sayyed",
    classId: "12-A",
    stage: "completed",
    baseline: b(4, 5, 1, 2, 3, 4),
    preference: "aligned",
  },
  {
    name: "Trisha Pandey",
    parent: "Vandana Pandey",
    classId: "12-A",
    stage: "interest_done",
    baseline: b(1, 2, 5, 5, 3, 1),
    preference: "dissonant",
  },

  // ---- Joined via the school code with no section suffix, so no classId.
  //      Visible to the Principal, not to any Class Teacher.
  {
    name: "Ved Kamath",
    parent: "Shweta Kamath",
    classId: null,
    stage: "completed",
    baseline: b(3, 4, 3, 3, 4, 3),
    preference: "aligned",
  },
  {
    name: "Laila Merchant",
    parent: "Sharmila Merchant",
    classId: null,
    stage: "interest_done",
    baseline: b(2, 3, 5, 3, 4, 2),
    preference: "none",
  },
];

/* --------------------------------------------------------------- helpers */

const STAGE_ORDER: Stage[] = [
  "registered",
  "consent_given",
  "otp_verified",
  "interest_in_progress",
  "interest_done",
  "aptitude_done",
  "personality_done",
  "completed",
];

function atLeast(stage: Stage, minimum: Stage): boolean {
  return STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(minimum);
}

function mobile(): string {
  const first = pick(["6", "7", "8", "9"]);
  let rest = "";
  for (let i = 0; i < 9; i++) rest += Math.floor(rng() * 10);
  return first + rest;
}

function token(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[Math.floor(rng() * alphabet.length)];
  }
  return `dsh_${out}`;
}

/**
 * Turn a per-trait "typical answer" into real item-level answers, the same way
 * lib/personas.ts expands a RIASEC baseline: a -1/0/+1 wobble across the three
 * items so the answers look like a person's rather than the same digit thrice.
 *
 * Going through the items rather than writing totals directly means the stored
 * scores are whatever the real scoring lib computes from these answers.
 */
function responsesFromTraitCentres<TTrait extends string>(
  traits: readonly TTrait[],
  questionsByTrait: Record<TTrait, { id: number }[]>,
  centres: Record<TTrait, number>,
): Record<number, number> {
  const responses: Record<number, number> = {};
  for (const trait of traits) {
    const centre = centres[trait] + (rng() * 2 - 1) * 0.7;
    questionsByTrait[trait].forEach((question, i) => {
      const wobble = (i % 3) - 1;
      responses[question.id] = clamp(Math.round(centre) + wobble, 1, 5);
    });
  }
  return responses;
}

/**
 * Aptitude is self-rated, and a student's sense of their own numerical or
 * verbal ease tracks their interest profile more than anything else — so the
 * mock derives it from the RIASEC baseline rather than rolling it flat.
 */
function aptitudeResponsesFor(
  baseline: Record<RiasecType, number>,
  twist: Partial<Record<AptitudeDomain, number>> = {},
): Record<number, number> {
  return responsesFromTraitCentres(
    APTITUDE_DOMAINS,
    APTITUDE_QUESTIONS_BY_DOMAIN,
    {
      numerical: (baseline.I + baseline.C) / 2,
      verbal: (baseline.A + baseline.S) / 2,
      spatial: (baseline.A + baseline.R) / 2,
      mechanical: baseline.R,
      logical: (baseline.I + baseline.E) / 2,
      ...twist,
    },
  );
}

function personalityResponsesFor(
  baseline: Record<RiasecType, number>,
): Record<number, number> {
  return responsesFromTraitCentres(
    BIG_FIVE_TRAITS,
    PERSONALITY_QUESTIONS_BY_TRAIT,
    {
      openness: (baseline.A + baseline.I) / 2,
      conscientiousness: baseline.C,
      extraversion: (baseline.E + baseline.S) / 2,
      agreeableness: baseline.S,
      // Nothing in a RIASEC profile predicts this one, so it varies on its own.
      neuroticism: 2 + rng() * 2,
    },
  );
}

function workValuesResponsesFor(
  baseline: Record<RiasecType, number>,
): Record<number, number> {
  return responsesFromTraitCentres(
    WORK_VALUES,
    WORK_VALUES_QUESTIONS_BY_VALUE,
    {
      stability: baseline.C,
      independence: (baseline.I + baseline.A) / 2,
      recognition: baseline.E,
      helping: baseline.S,
      creativity: baseline.A,
      leadership: baseline.E,
    },
  );
}

/** Keep the first N answers of a module and drop the rest */
function firstAnswersOf(
  items: { id: number }[],
  responses: Record<number, number>,
  keep: number,
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const item of items.slice(0, keep)) out[item.id] = responses[item.id];
  return out;
}

/** An "in progress" test has the first N answers filled and the rest missing */
function partialResponses(
  full: Record<number, number>,
  answered: number,
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const q of QUESTIONS.slice(0, answered)) out[q.id] = full[q.id];
  return out;
}

function gradeOf(classId: string | null): string {
  return classId ? `Class ${classId.split("-")[0]}` : "Class 10";
}

/** A day in the pilot window, so the dashboard can sort by recency */
function completedAt(index: number): string {
  const day = 3 + (index % 12);
  const hour = 9 + (index % 9);
  return `2026-09-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}:00.000Z`;
}

/* ----------------------------------------------------------------- build */

const sessions: SessionState[] = ROSTER.map((student, index) => {
  const fullResponses = responsesFromBaseline(student.baseline);
  const interestDone = atLeast(student.stage, "interest_done");

  const session: SessionState = {
    parentName: student.parent,
    parentMobile: mobile(),
    childName: student.name,
    childClass: gradeOf(student.classId),
    consentGiven: atLeast(student.stage, "consent_given"),
    otpVerified: atLeast(student.stage, "otp_verified"),
    responses:
      student.stage === "interest_in_progress"
        ? partialResponses(fullResponses, 22)
        : atLeast(student.stage, "otp_verified") && interestDone
          ? fullResponses
          : {},
    selectedTiers: {
      detailedReport: false,
      roadmap: false,
      consultation: false,
    },
    sessionToken: token(),
    schoolId: SCHOOL_ID,
  };

  if (student.classId) session.classId = student.classId;
  else session.schoolCode = SCHOOL.code;

  // Every module stores its item-level answers and the score the real scoring
  // lib computes from them, exactly as /test writes them.
  const aptitude = aptitudeResponsesFor(
    student.baseline,
    student.aptitudeTwist,
  );
  const personality = personalityResponsesFor(student.baseline);
  const workValues = workValuesResponsesFor(student.baseline);

  if (interestDone) {
    session.scores = scoreResponses(fullResponses);
  }
  if (atLeast(student.stage, "aptitude_done")) {
    session.aptitudeResponses = aptitude;
    session.aptitudeScores = scoreAptitude(aptitude);
  }
  if (atLeast(student.stage, "personality_done")) {
    session.personalityResponses = personality;
    session.personalityScores = scorePersonality(personality);
  }
  if (student.stage === "completed") {
    session.workValuesResponses = workValues;
    session.workValuesScores = scoreWorkValues(workValues);
    session.completedAt = completedAt(index);
  }

  // A student stopped part-way through their next module: answers banked, no
  // score yet. Gives the teacher roster a genuine "half done" cell to show.
  if (student.partialNext && student.stage !== "completed") {
    if (interestDone && !session.aptitudeScores) {
      session.aptitudeResponses = firstAnswersOf(
        APTITUDE_QUESTIONS,
        aptitude,
        7,
      );
    } else if (session.aptitudeScores && !session.personalityScores) {
      session.personalityResponses = firstAnswersOf(
        PERSONALITY_QUESTIONS,
        personality,
        6,
      );
    } else if (session.personalityScores && !session.workValuesScores) {
      session.workValuesResponses = firstAnswersOf(
        WORK_VALUES_QUESTIONS,
        workValues,
        9,
      );
    }
  }

  // The dissonance rule (Section 6) compares the parent's stated preference
  // against the real top-3 from matching.ts, so pick the preference from that
  // ranking rather than guessing which titles happen to disagree.
  if (student.preference !== "none" && session.scores) {
    const top3 = getTopMatches(session.scores, 3).map((m) => m.career.title);
    if (student.preference === "aligned") {
      session.parentStatedPreference = top3[Math.floor(rng() * 3)];
    } else {
      const outside = CAREERS.map((c) => c.title).filter(
        (t) => !top3.includes(t),
      );
      // Prefer the classic Indian-parent defaults when they are genuinely
      // outside this child's top 3 — that is what makes the index believable.
      const classics = [
        "Doctor (Physician)",
        "Software Engineer",
        "Chartered Accountant",
        "Civil Services Officer (IAS/IPS etc.)",
      ];
      const preferred = classics.filter((t) => outside.includes(t));
      session.parentStatedPreference = (preferred.length ? preferred : outside)[
        Math.floor(
          rng() * (preferred.length ? preferred.length : outside.length),
        )
      ];
    }
  }

  return session;
});

/* ----------------------------------------------------------- write + report */

writeFileSync(OUT, `${JSON.stringify(sessions, null, 2)}\n`, "utf8");

const withPreference = sessions.filter((s) => s.parentStatedPreference);
const dissonant = withPreference.filter((s) => {
  const top3 = getTopMatches(s.scores!, 3).map((m) => m.career.title);
  return !top3.includes(s.parentStatedPreference!);
});

console.log(`Wrote ${sessions.length} mock sessions -> ${OUT}`);
console.log(
  `  completed (all 4 modules): ${sessions.filter((s) => s.workValuesScores).length}`,
);
console.log(
  `  interest scored:           ${sessions.filter((s) => s.scores).length}`,
);
console.log(
  `  aptitude scored:           ${sessions.filter((s) => s.aptitudeScores).length}`,
);
console.log(
  `  personality scored:        ${sessions.filter((s) => s.personalityScores).length}`,
);
console.log(
  `  no classId (school code):  ${sessions.filter((s) => !s.classId).length}`,
);
console.log(`  parent preference stated:  ${withPreference.length}`);
console.log(`  of which dissonant:        ${dissonant.length}`);
