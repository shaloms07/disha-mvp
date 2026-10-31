/**
 * Client-side pricing (SPEC.md Section 7).
 *
 * Strictly additive: each tier builds on the one before it. The one
 * strikethrough anywhere is COMPARE_AT_PRICES below - the regular price the
 * results page's offer shows beside the launch price. It has to stay a price
 * that's genuinely charged once the launch period ends, not an invented one.
 */

import type { SelectedTiers } from "@/types";

export const PRICING = {
  reportPdf: 299, // Career Match Report
  deepDive: 700, // + reportPdf = 999
  roadmapAddOn: 300, // + reportPdf + deepDive = 1,299 (Complete Career Report)
  consultationAddOn: 1200, // + everything above = 2,499
} as const;

/**
 * The tiers are a ladder, not a pick-and-mix: each one builds on the one
 * before it. Level 0 means nothing selected. Level 1 (the report PDF) is
 * deliberately NOT part of the Deep-Dive - lib/testModules.ts's hasDeepDive
 * checks `detailedReport` specifically, not "any tier bought", so a parent
 * who only pays for the PDF never gets the paid modules unlocked.
 */
export type TierLevel = 0 | 1 | 2 | 3 | 4;

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
    name: "Career Match Report",
    increment: PRICING.reportPdf,
    total: PRICING.reportPdf,
    summary: "Every career ranked against your child's interests, with stream and subject advice.",
    includes: [
      "All careers ranked for your child's interests",
      "Stream recommendation and subject choices",
      "Roadmap preview for the top 3 careers",
    ],
    note: "Interest-based only — the Complete Career Report adds aptitude and personality. What you pay now is credited if you upgrade.",
  },
  {
    level: 2,
    name: "Deep-Dive Assessment",
    increment: PRICING.deepDive,
    total: PRICING.reportPdf + PRICING.deepDive,
    summary:
      "Three more quick tests — Aptitude, Behavioral and Work Values — plus the full report built from all four.",
    includes: [
      "Everything in Career Match Report",
      "The Deep-Dive Assessment: Aptitude, Behavioral and Work Values",
      "What every score means, from all four modules",
      "Top career matches with a match rating",
    ],
    note: "Doesn't include the Roadmap or Consultation — you can add either anytime from the report page, at a higher price than buying them in now.",
  },
  {
    level: 3,
    name: "Complete Career Report",
    increment: PRICING.roadmapAddOn,
    total: PRICING.reportPdf + PRICING.deepDive + PRICING.roadmapAddOn,
    summary: "The Deep-Dive plus the full roadmap — careers matched on interest, ability and personality.",
    includes: [
      "Everything in Career Match Report",
      "Deep-Dive: Aptitude, Behaviour and Work Values",
      "Careers matched on interest + ability + personality",
      "Full roadmap: exams, courses, step-by-step plan",
    ],
    recommended: true,
    note: "Consultation costs more if added later from the report page — see the tier below.",
  },
  {
    level: 4,
    name: "Report + Counsellor",
    increment: PRICING.consultationAddOn,
    total:
      PRICING.reportPdf + PRICING.deepDive + PRICING.roadmapAddOn + PRICING.consultationAddOn,
    summary: "Everything above, plus a call with a counsellor.",
    includes: [
      "A 45-minute call with a career counsellor",
      "Questions answered against your child's actual result",
      "A written summary after the call",
    ],
    note: "You'll pick a slot on the report page once the Deep-Dive Assessment is done.",
  },
];

/** The three options the results page sells (level 2, Deep-Dive without the
 *  roadmap, stays available on /pricing but isn't offered there). */
export const RESULTS_PAGE_LEVELS = [1, 3, 4] as const;

/**
 * Regular price, struck through beside each results-page option's launch
 * price (components/results/OfferCards.tsx). Only ever shown against a full
 * price - never against an upgrade, where the credit is already the saving.
 */
export const COMPARE_AT_PRICES: Partial<Record<TierLevel, number>> = {
  1: 499,
  3: 1999,
  4: 3999,
};

export function totalForLevel(level: TierLevel): number {
  return level === 0 ? 0 : TIER_OPTIONS.find((t) => t.level === level)?.total ?? 0;
}

/**
 * What moving from an owned tier to a higher one costs: the target's total
 * minus what the owned tier already cost, minus ₹1. Every tier total ends in
 * 99, so a plain difference would always land on a round number (₹1,000,
 * ₹2,200); the ₹1 keeps upgrades at ₹999 / ₹2,199 / ₹1,199 like every other
 * price, and only ever in the parent's favour. server/routes/checkout.ts
 * charges this same amount, from the session's verified purchasedTierLevel.
 */
export function upgradeCost(target: TierLevel, owned: TierLevel): number {
  if (owned === 0) return totalForLevel(target);
  return Math.max(0, totalForLevel(target) - totalForLevel(owned) - 1);
}

export function tiersForLevel(level: TierLevel): SelectedTiers {
  return {
    reportPdf: level >= 1,
    detailedReport: level >= 2,
    roadmap: level >= 3,
    consultation: level >= 4,
  };
}

/** Clamps a raw number (e.g. the server's AssessmentSession.purchasedTierLevel)
 *  into a valid TierLevel - used wherever that column crosses back into the
 *  client, since Prisma's Int? column has no 0-4 constraint of its own. */
export function clampTierLevel(level: number | undefined): TierLevel {
  if (level === undefined || level < 0) return 0;
  if (level > 4) return 4;
  return level as TierLevel;
}

export function levelForTiers(tiers: SelectedTiers): TierLevel {
  if (tiers.consultation) return 4;
  if (tiers.roadmap) return 3;
  if (tiers.detailedReport) return 2;
  if (tiers.reportPdf) return 1;
  return 0;
}

export function calculateTotal(tiers: SelectedTiers): number {
  return (
    (tiers.reportPdf ? PRICING.reportPdf : 0) +
    (tiers.detailedReport ? PRICING.deepDive : 0) +
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
  if (tiers.reportPdf) {
    items.push({ name: "Career Match Report", amount: PRICING.reportPdf });
  }
  if (tiers.detailedReport) {
    items.push({ name: "Deep-Dive Assessment", amount: PRICING.deepDive });
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

/* ==========================================================================
   Late add-ons — buying a piece after the fact, from the report page,
   rather than committing to the ladder above upfront.

   Same "no fake discount" rule as the rest of this file: no strikethrough,
   no invented "was" price. One real exception — buying Consultation from a
   Report-only base waives Roadmap's price rather than charging for both (see
   addOnLines below); that waiver is shown plainly as "Free" in the cart, not
   hidden. Buying either piece on its own, or adding Roadmap alone, is still
   the flat price with no bundling. Even with the waiver, piecing things
   together late (already-paid ₹999 + ₹2,199 now = ₹3,198) costs more than the
   ₹2,499 bundle upfront — that gap is still the incentive to commit to the
   ladder up front. Consultation's late price is deliberately not Tier 4's
   upfront total: an identical number would read as "paying the
   same late as upfront", even though the parent has already sunk ₹999 into
   Tier 2 by the time this screen can appear (see availableAddOns' detailedReport
   gate below) and so is never actually paying the same total.
   ========================================================================== */

export const LATE_ADD_ON_PRICING = {
  roadmap: 599,
  consultation: 2199,
} as const;

export type AddOnKey = "roadmap" | "consultation";

export interface AddOnItem {
  key: AddOnKey;
  name: string;
  price: number;
  includes: string[];
  /** Selecting this item also requires (and auto-selects) this one */
  requires?: AddOnKey;
}

export const ADD_ON_CATALOG: AddOnItem[] = [
  {
    key: "roadmap",
    name: "Roadmap",
    price: LATE_ADD_ON_PRICING.roadmap,
    includes: [
      "Entrance exams to aim for, per career",
      "Courses and college paths",
      "Step-by-step actions from now to admission",
    ],
  },
  {
    key: "consultation",
    name: "1:1 Consultation",
    price: LATE_ADD_ON_PRICING.consultation,
    includes: [
      "A 45-minute call with a career counsellor",
      "Questions answered against your child's actual result",
      "A written summary after the call",
    ],
    requires: "roadmap",
  },
];

/** Which catalog items are still worth showing, given what's already been bought */
export function availableAddOns(tiers: SelectedTiers): AddOnItem[] {
  if (!tiers.detailedReport) return [];
  return ADD_ON_CATALOG.filter((item) => !tiers[item.key]);
}

/** Expands a raw selection with anything it `requires`, so the cart total and
 *  the resulting tiers always account for a dependency the shopper didn't
 *  explicitly tick themselves. */
export function resolveAddOnSelection(selected: ReadonlySet<AddOnKey>): Set<AddOnKey> {
  const resolved = new Set(selected);
  for (const item of ADD_ON_CATALOG) {
    if (resolved.has(item.key) && item.requires) resolved.add(item.requires);
  }
  return resolved;
}

export interface AddOnLine {
  item: AddOnItem;
  /** What this line actually costs, after the bundle waiver below */
  price: number;
  /** True when this line is Roadmap, waived because Consultation was added with it */
  waived: boolean;
}

/**
 * Per-item pricing for what's actually being newly added, after resolving
 * dependencies and one bundle rule: buying Consultation from a Report-only
 * base waives Roadmap's own price, rather than charging for both. Roadmap
 * only has its own ₹599 charge when it's bought on its own — Consultation's
 * late price already reflects the full package, so there's no reason to also
 * charge for the Roadmap it requires on top of that. This is a real,
 * disclosed waiver (shown as "Free" in the cart), not a strikethrough or an
 * invented "was" price.
 */
export function addOnLines(
  tiers: SelectedTiers,
  selected: ReadonlySet<AddOnKey>,
): AddOnLine[] {
  const resolved = resolveAddOnSelection(selected);
  const addingConsultation = resolved.has("consultation") && !tiers.consultation;

  return ADD_ON_CATALOG.filter(
    (item) => resolved.has(item.key) && !tiers[item.key],
  ).map((item) => {
    const waived = item.key === "roadmap" && addingConsultation;
    return { item, price: waived ? 0 : item.price, waived };
  });
}

export function addOnTotal(
  tiers: SelectedTiers,
  selected: ReadonlySet<AddOnKey>,
): number {
  return addOnLines(tiers, selected).reduce((sum, line) => sum + line.price, 0);
}

/** Merge a resolved add-on selection into the tiers already owned */
export function applyAddOns(
  tiers: SelectedTiers,
  selected: ReadonlySet<AddOnKey>,
): SelectedTiers {
  const resolved = resolveAddOnSelection(selected);
  return {
    ...tiers,
    roadmap: tiers.roadmap || resolved.has("roadmap"),
    consultation: tiers.consultation || resolved.has("consultation"),
  };
}
