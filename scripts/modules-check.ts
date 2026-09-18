/**
 * Stage B checks — run with `npm run modules`.
 *
 * Same shape as scripts/sanity-check.ts: assert the maths for the three new
 * modules is exactly right, then print sample answer sets through each scoring
 * function so the output can be eyeballed before any dashboard is built on it.
 *
 * Also guards the two things most likely to break quietly:
 *   - a non-school session must still be a 36-question RIASEC-only run
 *   - every score stored in mockSessions.json must be reproducible from the
 *     answers stored alongside it
 */

import mockSessionsData from "../data/school-admin/mockSessions.json";
import {
  APTITUDE_ITEMS_PER_DOMAIN,
  APTITUDE_MAX_SCORE,
  APTITUDE_MIN_SCORE,
  APTITUDE_QUESTIONS,
  APTITUDE_SCALE,
  APTITUDE_TOTAL_QUESTIONS,
  aptitudeScoreToPercent,
  getAptitudeAnsweredCount,
  isAptitudeComplete,
  rankAptitudeDomains,
  scoreAptitude,
} from "../lib/aptitudeScoring";
import {
  PERSONALITY_ITEMS_PER_TRAIT,
  PERSONALITY_MAX_SCORE,
  PERSONALITY_MIN_SCORE,
  PERSONALITY_QUESTIONS,
  PERSONALITY_SCALE,
  PERSONALITY_TOTAL_QUESTIONS,
  rankPersonalityTraits,
  scorePersonality,
} from "../lib/personalityScoring";
import {
  WORK_VALUES_ITEMS_PER_VALUE,
  WORK_VALUES_MAX_SCORE,
  WORK_VALUES_MIN_SCORE,
  WORK_VALUES_QUESTIONS,
  WORK_VALUES_SCALE,
  WORK_VALUES_TOTAL_QUESTIONS,
  rankWorkValues,
  scoreWorkValues,
} from "../lib/workValuesScoring";
import { MAX_TYPE_SCORE, QUESTIONS, scoreResponses } from "../lib/scoring";
import {
  ALL_MODULES,
  modulesForSession,
  responsesFor,
} from "../lib/testModules";
import {
  APTITUDE_DOMAINS,
  APTITUDE_LABELS,
  BIG_FIVE_LABELS,
  BIG_FIVE_TRAITS,
  WORK_VALUES,
  WORK_VALUE_LABELS,
  type SessionState,
  type TraitQuestion,
} from "../types";

const MOCK_SESSIONS = mockSessionsData as unknown as SessionState[];

let failures = 0;

function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function heading(text: string) {
  const rule = "=".repeat(72);
  console.log(`\n${rule}\n${text}\n${rule}`);
}

/** Answer every item in a set with the same value */
function answerAll(
  questions: { id: number }[],
  value: number,
): Record<number, number> {
  return Object.fromEntries(questions.map((q) => [q.id, value]));
}

/** Answer one trait's items high and everything else low */
function answerOneTraitHigh(
  questions: TraitQuestion<string>[],
  trait: string,
  high = 5,
  low = 2,
): Record<number, number> {
  return Object.fromEntries(
    questions.map((q) => [q.id, q.trait === trait ? high : low]),
  );
}

function row(label: string, scores: Record<string, number>, max: number) {
  const cells = Object.entries(scores)
    .map(([k, v]) => `${k.slice(0, 4)} ${String(v).padStart(2)}/${max}`)
    .join("   ");
  console.log(`    ${label.padEnd(22)} ${cells}`);
}

/** Interest's six per-type maxima differ slightly, unlike the other modules */
function rowVaried(
  label: string,
  scores: Record<string, number>,
  maxByKey: Record<string, number>,
) {
  const cells = Object.entries(scores)
    .map(([k, v]) => `${k} ${String(v).padStart(2)}/${maxByKey[k]}`)
    .join("   ");
  console.log(`    ${label.padEnd(22)} ${cells}`);
}

/* ------------------------------------------------------- 1. item set shape */

heading("1. Item sets are well formed (SCHOOL_ADMIN_SPEC.md Section 7)");

check(
  `aptitude: ${APTITUDE_TOTAL_QUESTIONS} items, ${APTITUDE_ITEMS_PER_DOMAIN} per domain`,
  APTITUDE_TOTAL_QUESTIONS === 15 && APTITUDE_ITEMS_PER_DOMAIN === 3,
);
check(
  `personality: ${PERSONALITY_TOTAL_QUESTIONS} items, ${PERSONALITY_ITEMS_PER_TRAIT} per trait`,
  PERSONALITY_TOTAL_QUESTIONS === 15 && PERSONALITY_ITEMS_PER_TRAIT === 3,
);
check(
  `work values: ${WORK_VALUES_TOTAL_QUESTIONS} items, ${WORK_VALUES_ITEMS_PER_VALUE} per value`,
  WORK_VALUES_TOTAL_QUESTIONS === 18 && WORK_VALUES_ITEMS_PER_VALUE === 3,
);

const allIds = [
  ...QUESTIONS.map((q) => q.id),
  ...APTITUDE_QUESTIONS.map((q) => q.id),
  ...PERSONALITY_QUESTIONS.map((q) => q.id),
  ...WORK_VALUES_QUESTIONS.map((q) => q.id),
];
check(
  "question ids are unique across all four modules",
  new Set(allIds).size === allIds.length,
  `${allIds.length - new Set(allIds).size} duplicate(s)`,
);

check(
  "every module answers on a 1-5 scale",
  [APTITUDE_SCALE, PERSONALITY_SCALE, WORK_VALUES_SCALE].every(
    (scale) =>
      scale.length === 5 &&
      scale[0].value === 1 &&
      scale[4].value === 5 &&
      scale.every((o) => o.label.trim().length > 0),
  ),
);

check(
  "no item text is duplicated",
  new Set(
    [
      ...APTITUDE_QUESTIONS,
      ...PERSONALITY_QUESTIONS,
      ...WORK_VALUES_QUESTIONS,
    ].map((q) => q.text),
  ).size === 48,
);

/* ---------------------------------------------------------- 2. score bounds */

heading("2. Scoring maths — floors, ceilings and midpoints");

const modulesUnderTest = [
  {
    name: "Aptitude",
    questions: APTITUDE_QUESTIONS,
    score: scoreAptitude,
    traits: APTITUDE_DOMAINS,
    min: APTITUDE_MIN_SCORE,
    max: APTITUDE_MAX_SCORE,
  },
  {
    name: "Personality",
    questions: PERSONALITY_QUESTIONS,
    score: scorePersonality,
    traits: BIG_FIVE_TRAITS,
    min: PERSONALITY_MIN_SCORE,
    max: PERSONALITY_MAX_SCORE,
  },
  {
    name: "Work Values",
    questions: WORK_VALUES_QUESTIONS,
    score: scoreWorkValues,
    traits: WORK_VALUES,
    min: WORK_VALUES_MIN_SCORE,
    max: WORK_VALUES_MAX_SCORE,
  },
] as const;

for (const m of modulesUnderTest) {
  // Each module keeps its precise trait type in its own lib; this loop walks
  // all three, so the scores are read back through a widened record.
  const widen = (r: object): Record<string, number> =>
    r as Record<string, number>;
  const floor = widen(m.score(answerAll(m.questions, 1)));
  const middle = widen(m.score(answerAll(m.questions, 3)));
  const ceiling = widen(m.score(answerAll(m.questions, 5)));

  check(
    `${m.name}: all 1s -> every trait scores the floor (${m.min})`,
    Object.values(floor).every((v) => v === m.min),
    JSON.stringify(floor),
  );
  check(
    `${m.name}: all 3s -> every trait scores ${m.min * 3}`,
    Object.values(middle).every((v) => v === 9),
    JSON.stringify(middle),
  );
  check(
    `${m.name}: all 5s -> every trait scores the ceiling (${m.max})`,
    Object.values(ceiling).every((v) => v === m.max),
    JSON.stringify(ceiling),
  );

  const target: string = m.traits[0];
  const focused = widen(
    m.score(answerOneTraitHigh(m.questions as TraitQuestion<string>[], target)),
  );
  check(
    `${m.name}: "${target}" answered 5, rest 2 -> ${target}=${m.max}, others=${
      m.min * 2
    }`,
    focused[target] === m.max &&
      (m.traits as readonly string[])
        .filter((t) => t !== target)
        .every((t) => focused[t] === m.min * 2),
    JSON.stringify(focused),
  );

  const partial = Object.fromEntries(
    m.questions.slice(0, 3).map((q) => [q.id, 4]),
  );
  const partialScores = widen(m.score(partial));
  check(
    `${m.name}: a partly-answered set scores what is there and skips the rest`,
    Object.values(partialScores).reduce((a, v) => a + v, 0) === 12,
    JSON.stringify(partialScores),
  );
}

/* ------------------------------------------------- 3. completion + ranking */

heading("3. Completion tracking and ranking");

check(
  "aptitude: empty responses -> 0 answered, not complete",
  getAptitudeAnsweredCount({}) === 0 && !isAptitudeComplete({}),
);
check(
  "aptitude: all answered -> 15 answered, complete",
  getAptitudeAnsweredCount(answerAll(APTITUDE_QUESTIONS, 3)) === 15 &&
    isAptitudeComplete(answerAll(APTITUDE_QUESTIONS, 3)),
);
check(
  "aptitude: an out-of-range answer does not count as answered",
  getAptitudeAnsweredCount({ ...answerAll(APTITUDE_QUESTIONS, 3), 101: 9 }) ===
    14,
);
check(
  "aptitude: percent maps floor->0 and ceiling->100",
  aptitudeScoreToPercent(APTITUDE_MIN_SCORE) === 0 &&
    aptitudeScoreToPercent(APTITUDE_MAX_SCORE) === 100 &&
    aptitudeScoreToPercent(9) === 50,
);
check(
  "ranking puts the deliberately-high trait first, in every module",
  rankAptitudeDomains(
    scoreAptitude(answerOneTraitHigh(APTITUDE_QUESTIONS, "spatial")),
  )[0] === "spatial" &&
    rankPersonalityTraits(
      scorePersonality(answerOneTraitHigh(PERSONALITY_QUESTIONS, "openness")),
    )[0] === "openness" &&
    rankWorkValues(
      scoreWorkValues(answerOneTraitHigh(WORK_VALUES_QUESTIONS, "helping")),
    )[0] === "helping",
);

/* ------------------------------------------------- 4. the /test module branch */

heading("4. /test branches on schoolId, and only on schoolId");

const individual = modulesForSession({});
const schoolTagged = modulesForSession({ schoolId: "sch-bvm-ngp" });

check(
  "no schoolId -> one module (Interest), 36 questions, exactly as today",
  individual.length === 1 &&
    individual[0].id === "interest" &&
    individual[0].items.length === 36,
  `${individual.map((m) => m.id).join(", ")}`,
);
check(
  "schoolId present -> all four modules in spec order",
  schoolTagged.map((m) => m.id).join(",") ===
    "interest,aptitude,personality,workValues",
  schoolTagged.map((m) => m.id).join(","),
);
check(
  "school run is 84 questions (36 + 15 + 15 + 18)",
  schoolTagged.reduce((sum, m) => sum + m.items.length, 0) === 84,
);
check(
  "every module writes to its own session keys",
  new Set(ALL_MODULES.map((m) => m.responsesKey)).size === 4 &&
    new Set(ALL_MODULES.map((m) => m.scoresKey)).size === 4,
);
check(
  "the interest module still scores through lib/scoring.ts untouched",
  JSON.stringify(individual[0].score(answerAll(QUESTIONS, 1))) ===
    JSON.stringify(scoreResponses(answerAll(QUESTIONS, 1))),
);

/* --------------------------------------------- 5. mock pool is self-consistent */

heading("5. Mock session pool re-scores to what it stores");

let mismatches = 0;
for (const session of MOCK_SESSIONS) {
  for (const testModule of ALL_MODULES) {
    const stored = session[testModule.scoresKey];
    if (!stored) continue;
    const recomputed = testModule.score(responsesFor(session, testModule));
    if (JSON.stringify(stored) !== JSON.stringify(recomputed)) {
      mismatches++;
      console.log(
        `        ${session.childName} / ${testModule.id}: stored ${JSON.stringify(
          stored,
        )} vs recomputed ${JSON.stringify(recomputed)}`,
      );
    }
  }
}
check(
  `every stored score in mockSessions.json comes back from its own answers (${MOCK_SESSIONS.length} sessions)`,
  mismatches === 0,
  `${mismatches} mismatch(es)`,
);

const partway = MOCK_SESSIONS.filter((s) =>
  ALL_MODULES.some(
    (m) =>
      !session_hasScore(s, m.scoresKey) &&
      Object.keys(responsesFor(s, m)).length > 0,
  ),
);
function session_hasScore(
  s: SessionState,
  key: (typeof ALL_MODULES)[number]["scoresKey"],
) {
  return Boolean(s[key]);
}
check(
  `the pool contains part-finished modules to show on the roster (${partway.length} students)`,
  partway.length >= 3,
);

/* ------------------------------------------------------ 6. eyeball the output */

heading("6. Sample answer sets through each scoring function");

const SAMPLES = [
  {
    label: "all 3s (neutral)",
    aptitude: answerAll(APTITUDE_QUESTIONS, 3),
    personality: answerAll(PERSONALITY_QUESTIONS, 3),
    workValues: answerAll(WORK_VALUES_QUESTIONS, 3),
  },
  {
    label: "numerical/logical high",
    aptitude: {
      ...answerAll(APTITUDE_QUESTIONS, 2),
      101: 5,
      102: 5,
      103: 4,
      113: 5,
      114: 5,
      115: 4,
    },
    personality: {
      ...answerAll(PERSONALITY_QUESTIONS, 3),
      204: 5,
      205: 5,
      206: 4,
      207: 1,
      208: 2,
      209: 1,
    },
    workValues: {
      ...answerAll(WORK_VALUES_QUESTIONS, 2),
      301: 5,
      302: 5,
      303: 4,
      304: 5,
      305: 4,
      306: 4,
    },
  },
  {
    label: "verbal/social/creative",
    aptitude: {
      ...answerAll(APTITUDE_QUESTIONS, 2),
      104: 5,
      105: 5,
      106: 5,
      110: 1,
      111: 1,
      112: 1,
    },
    personality: {
      ...answerAll(PERSONALITY_QUESTIONS, 3),
      201: 5,
      202: 5,
      203: 5,
      210: 5,
      211: 4,
      212: 5,
    },
    workValues: {
      ...answerAll(WORK_VALUES_QUESTIONS, 2),
      310: 5,
      311: 5,
      312: 4,
      313: 5,
      314: 5,
      315: 5,
    },
  },
];

for (const sample of SAMPLES) {
  console.log(`\n  ${sample.label}`);
  const apt = scoreAptitude(sample.aptitude);
  const per = scorePersonality(sample.personality);
  const wv = scoreWorkValues(sample.workValues);
  row("Aptitude (3-15)", apt, APTITUDE_MAX_SCORE);
  console.log(
    `      strongest: ${rankAptitudeDomains(apt)
      .slice(0, 2)
      .map((d) => APTITUDE_LABELS[d])
      .join(", ")}`,
  );
  row("Personality (3-15)", per, PERSONALITY_MAX_SCORE);
  console.log(
    `      strongest: ${rankPersonalityTraits(per)
      .slice(0, 2)
      .map((t) => BIG_FIVE_LABELS[t])
      .join(", ")}`,
  );
  row("Work values (3-15)", wv, WORK_VALUES_MAX_SCORE);
  console.log(
    `      top values: ${rankWorkValues(wv)
      .slice(0, 3)
      .map((v) => WORK_VALUE_LABELS[v])
      .join(", ")}`,
  );
}

heading("7. Two students from the mock pool, end to end");

for (const name of ["Aditya Nambiar", "Riya Chatterjee"]) {
  const s = MOCK_SESSIONS.find((x) => x.childName === name);
  if (!s) continue;
  console.log(
    `\n  ${name} — ${s.childClass}, section ${s.classId ?? "unassigned"}`,
  );
  if (s.scores) rowVaried("Interest (tally)", s.scores, MAX_TYPE_SCORE);
  if (s.aptitudeScores) {
    row("Aptitude (3-15)", s.aptitudeScores, 15);
    console.log(
      `      reads as easiest: ${rankAptitudeDomains(s.aptitudeScores)
        .slice(0, 2)
        .map((d) => APTITUDE_LABELS[d])
        .join(", ")} (self-rated confidence, not tested ability)`,
    );
  }
  if (s.personalityScores) row("Personality (3-15)", s.personalityScores, 15);
  if (s.workValuesScores) {
    row("Work values (3-15)", s.workValuesScores, 15);
    console.log(
      `      top values: ${rankWorkValues(s.workValuesScores)
        .slice(0, 3)
        .map((v) => WORK_VALUE_LABELS[v])
        .join(", ")}`,
    );
  }
}

heading(
  failures === 0 ? "All module checks passed." : `${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
