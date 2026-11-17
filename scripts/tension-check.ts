/**
 * lib/tension.ts checks - run with `npm run tension` (also part of
 * `npm run checks`). Each rule on hand-built profiles, then on thousands of
 * real results that the line chosen is always true.
 */

import { MATCHED_MIN_STARS } from "../lib/careerSummary";
import { matchCareers } from "../lib/matching";
import { MAX_TYPE_SCORE, rankInterestTypes } from "../lib/scoring";
import { pickTension, tensionLine } from "../lib/tension";
import { RIASEC_TYPES, type RiasecType } from "../types";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures += 1;
}
const profile = (values: Partial<Record<RiasecType, number>>) =>
  Object.fromEntries(RIASEC_TYPES.map((type) => [type, values[type] ?? 1])) as Record<RiasecType, number>;

console.log("Rules on hand-built profiles");
check(
  "c: a match led by a type outside the child's top 2 -> outside_interests",
  pickTension({ studentRanked: ["I", "A", "S"], matchedProfiles: [profile({ I: 9 }), profile({ E: 9 })] }) === "outside_interests",
);
check(
  "c: the third interest doesn't count as 'top' -> outside_interests",
  pickTension({ studentRanked: ["I", "A", "S"], matchedProfiles: [profile({ S: 9 })] }) === "outside_interests",
);
check(
  "d: every match led by a top-2 interest -> ranked",
  pickTension({ studentRanked: ["I", "A"], matchedProfiles: [profile({ I: 9 }), profile({ A: 8, R: 3 })] }) === "ranked",
);
check(
  "a tie for a career's strongest type counts if either is a top-2 interest",
  pickTension({ studentRanked: ["I", "A"], matchedProfiles: [profile({ E: 9, I: 9 })] }) === "ranked",
);
check("no matches -> ranked (nothing to contradict)", pickTension({ studentRanked: ["I", "A"], matchedProfiles: [] }) === "ranked");
check("lines use the name, never his/her", !/\b(his|her)\b/i.test(tensionLine("ranked", "Aarav") + tensionLine("outside_interests", "Aarav")));
check("rule c line", tensionLine("outside_interests", "Aarav") === "1 career Aarav may not have considered.");
check("rule d line", tensionLine("ranked", "Aarav") === "Aarav's matches are ranked — the order matters.");

console.log("\nOn 5,000 real results: the chosen line is always true");
let state = 20261117;
const rand = () => ((state = (state * 1664525 + 1013904223) % 2 ** 32), state / 2 ** 32);
let wrong = 0;
const seen = { outside_interests: 0, ranked: 0 };
for (let i = 0; i < 5000; i += 1) {
  const scores = Object.fromEntries(
    RIASEC_TYPES.map((type) => [type, Math.floor(rand() * (MAX_TYPE_SCORE[type] + 1))]),
  ) as Record<RiasecType, number>;
  const top2 = rankInterestTypes(scores).slice(0, 2);
  const matched = matchCareers(scores).filter((m) => m.stars >= MATCHED_MIN_STARS);
  const key = pickTension({ studentRanked: rankInterestTypes(scores), matchedProfiles: matched.map((m) => m.career.profile) });
  seen[key] += 1;
  const reallyOutside = matched.some((m) => {
    const max = Math.max(...RIASEC_TYPES.map((t) => m.career.profile[t]));
    return !RIASEC_TYPES.some((t) => m.career.profile[t] === max && top2.includes(t));
  });
  if ((key === "outside_interests") !== reallyOutside) wrong += 1;
}
check("rule c fires exactly when a matched career is outside the top 2", wrong === 0, `${wrong} wrong`);
console.log(`        lines chosen: outside_interests ${seen.outside_interests}, ranked ${seen.ranked}`);

console.log(failures === 0 ? "\nAll tension checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
