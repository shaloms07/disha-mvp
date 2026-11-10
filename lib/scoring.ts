/**
 * RIASEC scoring — real product logic (SPEC.md Section 5).
 *
 * The test is 36 forced-choice pairs (data/questions.json): each item names
 * two activities, and the child picks the one that appeals more. A pick is
 * one point for that option's trait — "RIASEC Choice Tally" per the 96-item
 * master matrix's scoring_rules.module_2.
 */

import questionsData from "@/data/questions.json";
import questionsClass8 from "@/data/questions-class-8.json";
import questionsClass9 from "@/data/questions-class-9.json";
import questionsClass10 from "@/data/questions-class-10.json";
import questionsClass11 from "@/data/questions-class-11.json";
import { RIASEC_TYPES, type Question, type RiasecType } from "@/types";

/** The default bank — Class 12, and the fallback for "Other" or any
 *  unrecognised childClass. Every bank below has the identical trait
 *  distribution (R:13, I:12, A:12, S:11, E:12, C:12), so MAX_TYPE_SCORE
 *  stays valid globally regardless of which bank a given session actually
 *  used - only the question text differs per class, not the scoring shape. */
export const QUESTIONS = questionsData as Question[];

export const TOTAL_QUESTIONS = QUESTIONS.length;

const QUESTION_BANKS_BY_CLASS: Record<string, Question[]> = {
  "Class 8": questionsClass8 as Question[],
  "Class 9": questionsClass9 as Question[],
  "Class 10": questionsClass10 as Question[],
  "Class 11": questionsClass11 as Question[],
};

/** "Class 12", "Other", and anything unrecognised all fall back to QUESTIONS. */
export function questionsForClass(childClass: string | undefined): Question[] {
  return (childClass && QUESTION_BANKS_BY_CLASS[childClass]) || QUESTIONS;
}

/** A stored answer is which option was picked: 1 = optionA, 2 = optionB */
export const CHOICE_A = 1;
export const CHOICE_B = 2;

export function emptyScores(): Record<RiasecType, number> {
  return Object.fromEntries(RIASEC_TYPES.map((t) => [t, 0])) as Record<
    RiasecType,
    number
  >;
}

function isValidAnswer(value: unknown): value is typeof CHOICE_A | typeof CHOICE_B {
  return value === CHOICE_A || value === CHOICE_B;
}

/**
 * How many times each trait appears as either option across the 36 pairs.
 * That count is the true maximum for that trait — every pick could in
 * principle have gone to it. The pairs aren't a perfectly balanced design
 * (R appears 13 times, S appears 11, the rest 12), so this is computed from
 * the data rather than assumed to be a shared constant.
 */
function computeMaxPerType(): Record<RiasecType, number> {
  const counts = emptyScores();
  for (const question of QUESTIONS) {
    counts[question.optionA.trait] += 1;
    counts[question.optionB.trait] += 1;
  }
  return counts;
}

export const MAX_TYPE_SCORE: Record<RiasecType, number> = computeMaxPerType();
export const MIN_TYPE_SCORE = 0;

/**
 * Tally the 36 picks by trait. Missing or out-of-range answers are skipped
 * rather than guessed, so a partially-answered test still scores — the test
 * screen gates completion on isTestComplete() so a real result always
 * reflects all 36 picks.
 */
export function scoreResponses(
  responses: Record<number, number>,
  questions: Question[] = QUESTIONS,
): Record<RiasecType, number> {
  const scores = emptyScores();
  for (const question of questions) {
    const answer = responses[question.id];
    if (!isValidAnswer(answer)) continue;
    const picked = answer === CHOICE_A ? question.optionA : question.optionB;
    scores[picked.trait] += 1;
  }
  return scores;
}

export function getUnansweredQuestionIds(
  responses: Record<number, number>,
  questions: Question[] = QUESTIONS,
): number[] {
  return questions.filter((q) => !isValidAnswer(responses[q.id])).map(
    (q) => q.id,
  );
}

export function getAnsweredCount(
  responses: Record<number, number>,
  questions: Question[] = QUESTIONS,
): number {
  return questions.length - getUnansweredQuestionIds(responses, questions).length;
}

export function isTestComplete(
  responses: Record<number, number>,
  questions: Question[] = QUESTIONS,
): boolean {
  return getUnansweredQuestionIds(responses, questions).length === 0;
}

/**
 * Types ordered strongest first. Ties fall back to the canonical R-I-A-S-E-C
 * order so the ranking is stable and reproducible.
 */
export function rankTypes(scores: Record<RiasecType, number>): RiasecType[] {
  return [...RIASEC_TYPES].sort((a, b) => {
    const diff = scores[b] - scores[a];
    if (diff !== 0) return diff;
    return RIASEC_TYPES.indexOf(a) - RIASEC_TYPES.indexOf(b);
  });
}

/** A type's tally as a share of that type's own max (0-1). The six maxima
 *  differ (R 13, S 11, the rest 12), so this - not the raw tally - is what's
 *  comparable across types. lib/matching.ts rescales the same way. */
function shareOfMax(scores: Record<RiasecType, number>, type: RiasecType): number {
  return MAX_TYPE_SCORE[type] === 0 ? 0 : scores[type] / MAX_TYPE_SCORE[type];
}

const SAME_SHARE = 1e-9;

/**
 * The child's interest types strongest first, compared on the same scale -
 * share of each type's own max - so 7 of 13 Realistic doesn't outrank 7 of
 * 12 Investigative. Ties fall back to R-I-A-S-E-C order. Use this for a
 * child's RIASEC tallies; rankTypes() above stays for career profiles, which
 * are already on one shared 1-10 scale.
 */
export function rankInterestTypes(scores: Record<RiasecType, number>): RiasecType[] {
  return [...RIASEC_TYPES].sort((a, b) => {
    const diff = shareOfMax(scores, b) - shareOfMax(scores, a);
    if (Math.abs(diff) > SAME_SHARE) return diff;
    return RIASEC_TYPES.indexOf(a) - RIASEC_TYPES.indexOf(b);
  });
}

/**
 * The strongest interests as groups of equal score, enough groups to cover
 * at least `count` types - e.g. [["R"], ["I", "A"]] when Investigative and
 * Artistic tie for second. A tie at the edge pulls the whole group in rather
 * than picking one of the tied types arbitrarily.
 */
export function topInterestGroups(
  scores: Record<RiasecType, number>,
  count = 3,
): RiasecType[][] {
  const groups: RiasecType[][] = [];
  let covered = 0;
  for (const type of rankInterestTypes(scores)) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(shareOfMax(scores, last[0]) - shareOfMax(scores, type)) <= SAME_SHARE) {
      last.push(type);
      covered += 1;
    } else if (covered >= count) {
      break;
    } else {
      groups.push([type]);
      covered += 1;
    }
  }
  return groups;
}

/** e.g. "IRC" — the child's three strongest types, Holland-code style */
export function getHollandCode(
  scores: Record<RiasecType, number>,
  length = 3,
): string {
  return rankInterestTypes(scores).slice(0, length).join("");
}

/** A single type total expressed as 0-100, against that type's own max */
export function scoreToPercent(score: number, type: RiasecType): number {
  const max = MAX_TYPE_SCORE[type];
  const pct = (score / max) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}
