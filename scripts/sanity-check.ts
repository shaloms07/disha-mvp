/**
 * Stage 1 sanity checks — run with `npm run sanity`.
 *
 * Not a test framework, just a script that (a) asserts the scoring maths is
 * exactly right and (b) prints the career ranking for a few sample personas so
 * the results can be eyeballed for plausibility before any UI is built on top.
 */

import {
  QUESTIONS,
  QUESTIONS_PER_TYPE,
  MAX_TYPE_SCORE,
  MIN_TYPE_SCORE,
  TOTAL_QUESTIONS,
  getAnsweredCount,
  getHollandCode,
  isTestComplete,
  rankTypes,
  scoreResponses,
} from "../lib/scoring";
import {
  CAREERS,
  cosineSimilarity,
  matchCareers,
  matchPercent,
  rescaleScores,
  toVector,
} from "../lib/matching";
import { PERSONAS, responsesFromBaseline } from "../lib/personas";
import { RIASEC_LABELS, RIASEC_TYPES, type RiasecType } from "../types";

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

/* ---------------------------------------------------------------- helpers */

/** Answer every question with the same value */
function uniformResponses(value: number): Record<number, number> {
  return Object.fromEntries(QUESTIONS.map((q) => [q.id, value]));
}

/**
 * Answer set from a per-type baseline. Shared with lib/personas.ts so the
 * profiles demoed on /demo are exactly the ones validated here.
 */
const personaResponses = responsesFromBaseline;

function formatScoreRow(scores: Record<RiasecType, number>): string {
  return RIASEC_TYPES.map(
    (t) => `${t} ${String(scores[t]).padStart(2)}`,
  ).join("   ");
}

function stars(n: number): string {
  return "*".repeat(n).padEnd(10);
}

/* ------------------------------------------------------- 1. scoring maths */

heading("1. Scoring — lib/scoring.ts");

check(
  `question set loads: ${TOTAL_QUESTIONS} questions, ${QUESTIONS_PER_TYPE} per type`,
  TOTAL_QUESTIONS === 60 && QUESTIONS_PER_TYPE === 10,
);
check(
  `score range per type is ${MIN_TYPE_SCORE}-${MAX_TYPE_SCORE}`,
  MIN_TYPE_SCORE === 10 && MAX_TYPE_SCORE === 50,
);

const allOnes = scoreResponses(uniformResponses(1));
check(
  "all answers = 1 -> every type scores the floor (10)",
  RIASEC_TYPES.every((t) => allOnes[t] === 10),
  formatScoreRow(allOnes),
);

const allThrees = scoreResponses(uniformResponses(3));
check(
  "all answers = 3 -> every type scores 30",
  RIASEC_TYPES.every((t) => allThrees[t] === 30),
  formatScoreRow(allThrees),
);

const allFives = scoreResponses(uniformResponses(5));
check(
  "all answers = 5 -> every type scores the ceiling (50)",
  RIASEC_TYPES.every((t) => allFives[t] === 50),
  formatScoreRow(allFives),
);

// Hand-checked case: answer every Artistic item 5 and everything else 2.
const artistOnly: Record<number, number> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q.type === "A" ? 5 : 2]),
);
const artistScores = scoreResponses(artistOnly);
check(
  "A=5 / rest=2 -> A scores 50 and the other five score 20 each",
  artistScores.A === 50 &&
    RIASEC_TYPES.filter((t) => t !== "A").every((t) => artistScores[t] === 20),
  formatScoreRow(artistScores),
);

// The sum of all six totals must equal the sum of the raw answers.
const mixed = personaResponses({ R: 4, I: 2, A: 5, S: 3, E: 1, C: 4 });
const mixedScores = scoreResponses(mixed);
const totalFromScores = RIASEC_TYPES.reduce((s, t) => s + mixedScores[t], 0);
const totalFromAnswers = Object.values(mixed).reduce((s, v) => s + v, 0);
check(
  `six totals sum to the raw answer total (${totalFromScores} = ${totalFromAnswers})`,
  totalFromScores === totalFromAnswers,
);

// Completeness helpers
const partial = { ...mixed };
delete partial[7];
delete partial[31];
check("isTestComplete() true for a full set", isTestComplete(mixed));
check(
  "isTestComplete() false with 2 missing, answered count = 58",
  !isTestComplete(partial) && getAnsweredCount(partial) === 58,
  `answered=${getAnsweredCount(partial)}`,
);

const withGarbage = scoreResponses({ ...uniformResponses(3), 1: 99 });
check(
  "out-of-range answers are ignored, not summed",
  withGarbage.R === 27,
  `R=${withGarbage.R}`,
);

/* ------------------------------------------------------ 2. sample personas */

const SAMPLES = PERSONAS.map((p) => ({
  name: `${p.childName}, ${p.childClass.toLowerCase()}`,
  blurb: p.blurb,
  baseline: p.baseline,
}));

heading("2. Matching — lib/matching.ts");

for (const persona of SAMPLES) {
  const responses = personaResponses(persona.baseline);
  const scores = scoreResponses(responses);
  const rescaled = rescaleScores(scores);
  const ranked = matchCareers(scores);

  console.log(`\n${persona.name} — ${persona.blurb}`);
  console.log("-".repeat(72));
  console.log(`  raw scores (10-50)   ${formatScoreRow(scores)}`);
  console.log(
    `  rescaled (1-10)      ${RIASEC_TYPES.map(
      (t) => `${t} ${rescaled[t].toFixed(1)}`,
    ).join("  ")}`,
  );
  console.log(
    `  ranked types         ${rankTypes(scores)
      .map((t) => RIASEC_LABELS[t])
      .join(" > ")}`,
  );
  console.log(`  Holland code         ${getHollandCode(scores)}`);
  console.log("\n  Top 5 matches");
  ranked.slice(0, 5).forEach((m, i) => {
    const pct = String(matchPercent(m.matchScore)).padStart(3);
    console.log(
      `    ${i + 1}. ${m.career.title.padEnd(24)} ${pct}%  ${stars(m.stars)} ${m.stars}/10`,
    );
  });
  console.log("  Weakest 2 matches");
  ranked.slice(-2).forEach((m) => {
    const pct = String(matchPercent(m.matchScore)).padStart(3);
    console.log(
      `       ${m.career.title.padEnd(24)} ${pct}%  ${stars(m.stars)} ${m.stars}/10`,
    );
  });
}

/* ------------------------------------------------- 3. ranking plausibility */

heading("3. Ranking plausibility");

const rohan = scoreResponses(personaResponses(SAMPLES[0].baseline));
const aisha = scoreResponses(personaResponses(SAMPLES[1].baseline));
const kabir = scoreResponses(personaResponses(SAMPLES[2].baseline));

const topIds = (s: Record<RiasecType, number>, n = 4) =>
  matchCareers(s)
    .slice(0, n)
    .map((m) => m.career.id);

const rohanTop = topIds(rohan);
const aishaTop = topIds(aisha);
const kabirTop = topIds(kabir);

check(
  `Rohan's top 4 are technical/analytical  [${rohanTop.join(", ")}]`,
  rohanTop.some((id) =>
    ["software-engineer", "data-scientist", "mechanical-engineer"].includes(id),
  ) && !rohanTop.includes("content-creator"),
);
check(
  `Aisha's top 4 are creative/people-facing  [${aishaTop.join(", ")}]`,
  aishaTop.some((id) =>
    ["graphic-designer", "content-creator", "teacher", "psychologist"].includes(
      id,
    ),
  ) && !aishaTop.includes("chartered-accountant"),
);
check(
  `Kabir's top 4 are business/organisational  [${kabirTop.join(", ")}]`,
  kabirTop.some((id) =>
    ["entrepreneur", "sales-marketing", "hr-manager", "civil-servant"].includes(
      id,
    ),
  ) && !kabirTop.includes("graphic-designer"),
);
check(
  "the three personas produce different top matches",
  new Set([rohanTop[0], aishaTop[0], kabirTop[0]]).size === 3,
  `${rohanTop[0]} / ${aishaTop[0]} / ${kabirTop[0]}`,
);

// A career profile fed back in as a child profile should match itself first.
let selfMatches = 0;
const selfMisses: string[] = [];
for (const career of CAREERS) {
  const asScores = Object.fromEntries(
    RIASEC_TYPES.map((t) => [
      t,
      // invert rescaleScore: 1-10 back onto 10-50
      Math.round(((career.profile[t] - 1) / 9) * 40 + 10),
    ]),
  ) as Record<RiasecType, number>;
  const winner = matchCareers(asScores)[0].career.id;
  if (winner === career.id) selfMatches++;
  else selfMisses.push(`${career.id}->${winner}`);
}
check(
  `every career profile fed back in ranks itself first (${selfMatches}/${CAREERS.length})`,
  selfMatches === CAREERS.length,
  selfMisses.join(", "),
);

// Flat answers must not crash or fake a confident recommendation.
const flat = scoreResponses(uniformResponses(4));
const flatRanked = matchCareers(flat);
check(
  "an undifferentiated (all-4s) profile returns a neutral 50% / 5-star spread",
  flatRanked.every((m) => m.stars === 5 && matchPercent(m.matchScore) === 50),
  `${matchPercent(flatRanked[0].matchScore)}% ${flatRanked[0].stars}*`,
);

/* ---------------------------------------------- 4. why shape, not raw cosine */

heading("4. Why mean-centred cosine, not plain cosine");

const rohanVec = toVector(rescaleScores(rohan));
const plain = CAREERS.map((c) =>
  cosineSimilarity(rohanVec, toVector(c.profile)),
);
const shaped = matchCareers(rohan).map((m) => m.matchScore);
const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);

console.log(
  `  plain cosine         best ${Math.max(...plain).toFixed(3)}   worst ${Math.min(
    ...plain,
  ).toFixed(3)}   spread ${spread(plain).toFixed(3)}`,
);
console.log(
  `  mean-centred (used)  best ${Math.max(...shaped).toFixed(
    3,
  )}   worst ${Math.min(...shaped).toFixed(3)}   spread ${spread(shaped).toFixed(3)}`,
);
check(
  "mean-centring separates careers more than plain cosine does",
  spread(shaped) > spread(plain),
);

/* -------------------------------------------------------------- conclusion */

const rule = "=".repeat(72);
console.log(
  `\n${rule}\n${
    failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`
  }\n${rule}`,
);

process.exit(failures === 0 ? 0 : 1);
