/**
 * The results funnel's first-party events - shared by the page that sends
 * them (app/results/page.tsx), the API that stores them
 * (server/routes/events.ts, prisma FunnelEvent) and the admin page that
 * counts them (/admin/funnel). Nothing here goes to a third party.
 *
 * Every event carries the viewer (deviceRole: parent / child / unknown), the
 * child's class (read from the database, never the browser) and the page
 * variant (lib/featureFlags.ts's pageVariant: "v1", "v2-A" or "v2-B").
 */

export const FUNNEL_EVENT_NAMES = [
  // ---- RESULT_PAGE_V2 (the result-page redesign, 18 Nov 2026)
  /** The result page was opened (snapshot, or results-ready after the tests) */
  "result_view",
  /** "Start the 3 tests" */
  "cta_start_tests",
  /** The ₹49 career list link */
  "cta_career_list_49",
  /** "Send my results to my parent" */
  "cta_send_to_parent",
  /** Opened by the parent - the ?pay=1 link or signed in as the parent */
  "parent_link_open",
  /** Pay on the Complete Career Report card */
  "cta_pay_498",
  /** The launch-offer bundle card */
  "cta_bundle_1299",
  /** Pay with the +₹999 counsellor call ticked (after the offer) */
  "cta_addon_call_999",
  /** "Request a free callback" (the server records callback_requested) */
  "cta_callback",
  "exit_question_answer",

  // ---- both pages
  /** The Complete Career Report card came into view (V2: post-tests only) */
  "paywall_view",

  // ---- the old page (flag off)
  /** A Complete Career Report / Report + Counsellor Unlock button was tapped */
  "unlock_tap",
  /** Checkout started for a plan (any tier) */
  "plan_selected",
  "send_to_parent_tap",
  "free_call_tap",
  "exit_prompt_answer",
  "exit_prompt_dismissed",

  // ---- recorded by the server only (SERVER_FUNNEL_EVENTS)
  "razorpay_order_created",
  /** From a verified payment, with the product (plan) and amount */
  "payment_success",
  "callback_requested",
  /** A counsellor marked the callback as called (/admin/callbacks) */
  "callback_called",
  /** Paid within 48 hours of requesting a callback */
  "callback_paid_48h",
] as const;
export type FunnelEventName = (typeof FUNNEL_EVENT_NAMES)[number];

/** Never accepted from a browser */
export const SERVER_FUNNEL_EVENTS = [
  "razorpay_order_created",
  "payment_success",
  "callback_requested",
  "callback_called",
  "callback_paid_48h",
] as const satisfies readonly FunnelEventName[];
export type ServerFunnelEventName = (typeof SERVER_FUNNEL_EVENTS)[number];

/** What the browser may send */
export const CLIENT_FUNNEL_EVENTS = FUNNEL_EVENT_NAMES.filter(
  (name) => !(SERVER_FUNNEL_EVENTS as readonly string[]).includes(name),
);

/** The once-per-session exit questions (old and V2 names) */
export const EXIT_EVENTS = ["exit_prompt_answer", "exit_prompt_dismissed", "exit_question_answer"] as const;

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
  { key: "later", label: "Need to think / later" },
] as const;
export type ExitPromptAnswer = (typeof EXIT_PROMPT_OPTIONS)[number]["key"];

/** RESULT_PAGE_V2: answers that get the free-callback offer (parent view) */
export const CALLBACK_EXIT_ANSWERS: readonly ExitPromptAnswer[] = ["price", "accuracy", "later"];

/** The funnel's page variant - "v1" (old page), "v2-A" (letters only) or
 *  "v2-B" (letters + type names) */
export const VARIANT_PATTERN = /^(v1|v2-A|v2-B)$/;
