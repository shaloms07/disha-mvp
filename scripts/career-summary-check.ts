/**
 * Results-ready career summary checks - run with `npm run summary` (also part
 * of `npm run checks`).
 *
 *   1. An unpaid family never receives a career name, id, rank or fit score
 *      from the API - checked on the exact JSON GET
 *      /session/:token/career-summary sends (server/routes/careerSummary.ts
 *      sends buildCareerSummaryResponse's output unchanged), across
 *      thousands of possible results.
 *   2. The summary is built from data: every career has a field, field names
 *      come from data/careers.json, and the counts add up.
 *   3. The title's edge cases: fewer than 3 careers or only 1 field drops
 *      "across {F} fields".
 *
 * No database needed.
 */

import careersData from "../data/careers.json";
import {
  MATCHED_MIN_STARS,
  buildCareerFieldSummary,
  buildCareerSummaryResponse,
  careerSummaryTitle,
} from "../lib/careerSummary";
import { matchCareers } from "../lib/matching";
import { MAX_TYPE_SCORE } from "../lib/scoring";
import { RIASEC_TYPES, type CareerProfile, type RiasecType } from "../types";

const careers = careersData as CareerProfile[];
let failures = 0;

function heading(text: string) {
  console.log(`\n${"=".repeat(72)}\n${text}\n${"=".repeat(72)}`);
}

function check(label: string, ok: boolean, detail?: string) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures += 1;
}

/** A seeded PRNG, so a failing score set can be reproduced */
function prng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

function randomScores(rand: () => number): Record<RiasecType, number> {
  return Object.fromEntries(
    RIASEC_TYPES.map((type) => [type, Math.floor(rand() * (MAX_TYPE_SCORE[type] + 1))]),
  ) as Record<RiasecType, number>;
}

/* ------------------------------------------------------------------ 1 */
heading("1. Unpaid families never receive career names, ranks or fit");
{
  const rand = prng(20261110);
  const needles = careers.flatMap((career) => [career.title, career.id]);
  const allowedKeys = new Set(["paid", "summary", "matchedCount", "fieldCount", "fields", "name", "count"]);
  let leaks = 0;
  let firstLeak = "";
  const RUNS = 5000;
  for (let i = 0; i < RUNS; i += 1) {
    const scores = randomScores(rand);
    const json = JSON.stringify(buildCareerSummaryResponse({ paid: false, scores }));
    const leaked = needles.find((needle) => json.includes(needle));
    const keys = json.match(/"([^"]+)":/g)?.map((key) => key.slice(1, -2)) ?? [];
    const badKey = keys.find((key) => !allowedKeys.has(key));
    if (leaked || badKey || /%|stars|matchScore|rank/i.test(json)) {
      leaks += 1;
      firstLeak ||= `${JSON.stringify(scores)} -> ${leaked ?? badKey ?? "fit data"}`;
    }
  }
  check(`${RUNS} random results: no career title or id, only count/field keys`, leaks === 0, leaks ? firstLeak : undefined);

  const paid = JSON.stringify(buildCareerSummaryResponse({ paid: true, scores: randomScores(rand) }));
  check("a paid family gets { paid: true } only", paid === '{"paid":true}', paid);
}

/* ------------------------------------------------------------------ 2 */
heading("2. Field summary comes from data and adds up");
{
  const missing = careers.filter((career) => !career.field);
  check("every career in data/careers.json has a field", missing.length === 0, missing.map((c) => c.id).join(", "));
  const dataFields = new Set(careers.map((career) => career.field));
  console.log(`        fields in data: ${[...dataFields].join(" | ")}`);

  const rand = prng(7);
  let bad = 0;
  for (let i = 0; i < 2000; i += 1) {
    const scores = randomScores(rand);
    const summary = buildCareerFieldSummary(scores);
    const matched = matchCareers(scores).filter((m) => m.stars >= MATCHED_MIN_STARS).length;
    const sum = summary.fields.reduce((total, field) => total + field.count, 0);
    if (
      summary.matchedCount !== matched ||
      sum !== summary.matchedCount ||
      summary.fieldCount !== summary.fields.length ||
      summary.fields.some((field) => !dataFields.has(field.name))
    ) {
      bad += 1;
    }
  }
  check("2,000 random results: counts match lib/matching.ts and sum correctly", bad === 0, `${bad} bad`);

  const sample = buildCareerFieldSummary({ R: 4, I: 10, A: 9, S: 6, E: 5, C: 2 });
  console.log(
    `        sample (I/A student): "${careerSummaryTitle(sample, "Aarav")}" - ` +
      sample.fields.map((f) => `${f.name} · ${f.count}`).join(", "),
  );
}

/* ------------------------------------------------------------------ 3 */
heading("3. Title edge cases");
{
  const field = (name: string, count: number) => ({ name, count });
  check("8 careers in 5 fields", careerSummaryTitle({ matchedCount: 8, fieldCount: 5, fields: [] }, "Aarav") ===
    "8 careers matched across 5 fields");
  check("2 careers: no fields part", careerSummaryTitle({ matchedCount: 2, fieldCount: 2, fields: [field("A", 1), field("B", 1)] }, "Aarav") ===
    "2 careers matched");
  check("4 careers in 1 field: no fields part", careerSummaryTitle({ matchedCount: 4, fieldCount: 1, fields: [field("A", 4)] }, "Aarav") ===
    "4 careers matched");
  check("1 career: singular", careerSummaryTitle({ matchedCount: 1, fieldCount: 1, fields: [field("A", 1)] }, "Aarav") ===
    "1 career matched");
  check("0 careers: no count claimed", careerSummaryTitle({ matchedCount: 0, fieldCount: 0, fields: [] }, "Aarav") ===
    "Aarav's careers, ranked by fit");
}

heading(failures === 0 ? "All career-summary checks passed." : `${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
