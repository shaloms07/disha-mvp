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
    name: "Deep-Dive Assessment",
    increment: PRICING.detailedReport,
    total: PRICING.detailedReport,
    summary:
      "Three more quick tests — Aptitude, Behavioral and Work Values — plus the full report built from all four.",
    includes: [
      "The Deep-Dive Assessment: Aptitude, Behavioral and Work Values",
      "What every score means, from all four modules",
      "Top career matches with a match rating",
    ],
    note: "Doesn't include the Roadmap or Consultation — you can add either anytime from the report page, at a higher price than buying them in now.",
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
    note: "Consultation costs more if added later from the report page — see the tier below.",
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
    note: "You'll pick a slot on the report page once the Deep-Dive Assessment is done. Demo build — no real counsellor calendar exists behind it.",
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

/* ==========================================================================
   Late add-ons — buying a piece after the fact, from the report page,
   rather than committing to the ladder above upfront.

   Same "no fake discount" rule as the rest of this file: no strikethrough,
   no invented "was" price. One real exception — buying Consultation from a
   Report-only base waives Roadmap's price rather than charging for both (see
   addOnLines below); that waiver is shown plainly as "Free" in the cart, not
   hidden. Buying either piece on its own, or adding Roadmap alone, is still
   the flat price with no bundling. Even with the waiver, piecing things
   together late (₹199+₹1,999 = ₹2,198) costs more than the ₹1,499 bundle
   upfront — that gap is still the incentive to commit to the ladder up front.
   ========================================================================== */

export const LATE_ADD_ON_PRICING = {
  roadmap: 599,
  consultation: 1999,
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
 * ₹1,999 already reflects the full package, so there's no reason to also
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
