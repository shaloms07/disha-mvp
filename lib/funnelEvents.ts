/**
 * The paywall funnel's first-party events - shared by the page that sends
 * them (app/results/page.tsx), the API that stores them
 * (server/routes/events.ts, prisma FunnelEvent) and the admin page that
 * counts them (/admin/funnel). Nothing here goes to a third party.
 */

export const FUNNEL_EVENT_NAMES = [
  /** The Complete Career Report card came into view */
  "paywall_view",
  /** A Complete Career Report / Report + Counsellor Unlock button was tapped */
  "unlock_tap",
  /** Checkout started for a plan (any tier) */
  "plan_selected",
  "send_to_parent_tap",
  "free_call_tap",
  /** Recorded by the server from a verified payment - never sent by the browser */
  "payment_success",
  "exit_prompt_answer",
  "exit_prompt_dismissed",
] as const;
export type FunnelEventName = (typeof FUNNEL_EVENT_NAMES)[number];

/** What the browser may send - payment_success only comes from the server */
export const CLIENT_FUNNEL_EVENTS = FUNNEL_EVENT_NAMES.filter((name) => name !== "payment_success");

export const DEVICE_ROLES = ["parent", "child", "unknown"] as const;
export type DeviceRole = (typeof DEVICE_ROLES)[number];

/** Price-neutral, so a price change doesn't make old rows misleading -
 *  app/admin/funnel/page.tsx labels them with lib/pricing.ts's prices */
export const PLAN_KEYS = ["list", "report", "report+call"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

/** lib/pricing.ts's tier level -> the plan names the funnel reports in */
export function planKeyForLevel(level: number): PlanKey | undefined {
  if (level === 1) return "list";
  if (level === 3) return "report";
  if (level === 4) return "report+call";
  return undefined;
}

/** "What's stopping you?" - key stored, label shown */
export const EXIT_PROMPT_OPTIONS = [
  { key: "know_enough", label: "Already know enough" },
  { key: "price", label: "Price" },
  { key: "ask_parent", label: "Need to ask my parent" },
  { key: "accuracy", label: "Not sure it's accurate" },
  { key: "later", label: "Later" },
] as const;
export type ExitPromptAnswer = (typeof EXIT_PROMPT_OPTIONS)[number]["key"];
