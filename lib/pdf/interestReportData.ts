/**
 * Data shaping for the Tier 1 "Download Report" PDF (lib/pdf/InterestReportDocument.tsx) -
 * the paid ₹299 report, built from the free RIASEC test alone. Deliberately
 * lighter than lib/pdf/reportData.ts's BaseReportData: that shape requires
 * aptitude/behavioral/work-value scores from the (separately paid) Deep-Dive
 * modules, which no Tier 1-only session has. This covers exactly the six
 * interest-type scores every completed free test produces, nothing more -
 * in particular, it never touches lib/matching.ts, so this report cannot
 * name or rank specific careers (that stays exclusive to Tier 2+, see the
 * discussion captured in this project's "tier pricing report content" notes).
 */

import type { RiasecType } from "@/types";
import { RIASEC_LABELS } from "@/types";
import { MAX_TYPE_SCORE, getHollandCode, rankTypes, scoreToPercent } from "@/lib/scoring";
import { assessmentIdFrom, type InterestRow } from "./reportData";
import { buildInterestInterpretation } from "./reportInterpretation";

export interface InterestReportData {
  childName: string;
  who: string;
  generatedOn: string;
  assessmentId: string;
  hollandCode: string;
  interestRows: InterestRow[];
  interest: ReturnType<typeof buildInterestInterpretation>;
}

export interface BuildInterestReportDataInput {
  childName: string;
  orderId?: string;
  scores: Record<RiasecType, number>;
}

export function buildInterestReportData(input: BuildInterestReportDataInput): InterestReportData {
  const { childName, orderId, scores } = input;
  const who = childName || "You";

  const ranked = rankTypes(scores);
  const interestRows: InterestRow[] = ranked.map((type) => ({
    type,
    label: RIASEC_LABELS[type],
    score: scores[type],
    max: MAX_TYPE_SCORE[type],
    percent: scoreToPercent(scores[type], type),
  }));

  return {
    childName,
    who,
    generatedOn: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    assessmentId: assessmentIdFrom(orderId, childName),
    hollandCode: getHollandCode(scores),
    interestRows,
    interest: buildInterestInterpretation(interestRows, who),
  };
}
