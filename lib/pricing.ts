/**
 * Client-side pricing (SPEC.md Section 7).
 *
 * Strictly additive and strictly real: each tier builds on the one before it,
 * and the only numbers shown anywhere are the ones below. No invented
 * "original price", no strikethrough, no discount framing.
 */

import type { SelectedTiers } from "@/types";

export const PRICING = {
  detailedReport: 199,
  roadmapAddOn: 300, // + report = 499
  consultationAddOn: 1000, // + report + roadmap = 1499
} as const;

/**
 * The tiers are a ladder, not a pick-and-mix: the roadmap builds on the report,
 * and the consultation builds on both. Level 0 means nothing selected.
 */
export type TierLevel = 0 | 1 | 2 | 3;

export interface TierOption {
  level: Exclude<TierLevel, 0>;
  name: string;
  /** What this step alone costs */
  increment: number;
  /** Running total at this level */
  total: number;
  summary: string;
  includes: string[];
  note?: string;
  /** Presentational only — the one tier given visual weight on /pricing */
  recommended?: boolean;
}

export const TIER_OPTIONS: TierOption[] = [
  {
    level: 1,
    name: "Detailed Report",
    increment: PRICING.detailedReport,
    total: PRICING.detailedReport,
    summary: "The full read on all six scores, plus ranked career matches.",
    includes: [
      "What each of the six scores means",
      "Top career matches with a match rating",
      "Why each career fits this profile",
    ],
  },
  {
    level: 2,
    name: "+ Roadmap",
    increment: PRICING.roadmapAddOn,
    total: PRICING.detailedReport + PRICING.roadmapAddOn,
    summary: "Everything above, plus what to actually do next.",
    includes: [
      "Entrance exams to aim for, per career",
      "Courses and college paths",
      "Step-by-step actions from now to admission",
    ],
    recommended: true,
  },
  {
    level: 3,
    name: "+ 1:1 Consultation",
    increment: PRICING.consultationAddOn,
    total:
      PRICING.detailedReport + PRICING.roadmapAddOn + PRICING.consultationAddOn,
    summary: "Everything above, plus a call with a counsellor.",
    includes: [
      "A 45-minute call with a career counsellor",
      "Questions answered against your child's actual result",
      "A written summary after the call",
    ],
    note: "Scheduling is coming soon — booking isn't available in this demo.",
  },
];

export function tiersForLevel(level: TierLevel): SelectedTiers {
  return {
    detailedReport: level >= 1,
    roadmap: level >= 2,
    consultation: level >= 3,
  };
}

export function levelForTiers(tiers: SelectedTiers): TierLevel {
  if (tiers.consultation) return 3;
  if (tiers.roadmap) return 2;
  if (tiers.detailedReport) return 1;
  return 0;
}

export function calculateTotal(tiers: SelectedTiers): number {
  return (
    (tiers.detailedReport ? PRICING.detailedReport : 0) +
    (tiers.roadmap ? PRICING.roadmapAddOn : 0) +
    (tiers.consultation ? PRICING.consultationAddOn : 0)
  );
}

/** Indian digit grouping, done by hand so server and client always agree */
function groupIndian(amount: number): string {
  const digits = String(Math.abs(Math.round(amount)));
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`;
}

export function formatInr(amount: number): string {
  return `₹${groupIndian(amount)}`;
}

/** Line items for the order summary and the confirmation screen */
export function lineItems(tiers: SelectedTiers) {
  const items: { name: string; amount: number }[] = [];
  if (tiers.detailedReport) {
    items.push({ name: "Detailed Report", amount: PRICING.detailedReport });
  }
  if (tiers.roadmap) {
    items.push({ name: "Roadmap add-on", amount: PRICING.roadmapAddOn });
  }
  if (tiers.consultation) {
    items.push({
      name: "1:1 Consultation add-on",
      amount: PRICING.consultationAddOn,
    });
  }
  return items;
}
