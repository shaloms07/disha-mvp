/**
 * The interest test's 1-5 answer scale.
 *
 * Lifted out of components/TestQuestionCard so lib/testModules.ts can name it
 * alongside the three pilot modules' scales without importing a client
 * component. The wording is unchanged from what shipped.
 */

import type { ScaleOption } from "./traitScoring";

/** 1-5 Likert scale. With one question on screen the full wording fits. */
export const LIKERT_SCALE: readonly ScaleOption[] = [
  { value: 1, label: "Strongly dislike" },
  { value: 2, label: "Dislike" },
  { value: 3, label: "Not sure" },
  { value: 4, label: "Like" },
  { value: 5, label: "Strongly like" },
] as const;
