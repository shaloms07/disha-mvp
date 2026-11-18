/**
 * SNAPSHOT_V2 - the free snapshots describe the child; the paid report makes
 * the decision. On: the quick-test snapshot shows an unlabelled radar
 * chart and the three Holland letters (their meaning locked), and the Deep-Dive snapshot shows a career
 * count, one tension line and the lowest-ranked match instead of fields and
 * aptitude. On unless set to "off".
 *
 * Two switches, because the website and the API deploy separately:
 *  - NEXT_PUBLIC_SNAPSHOT_V2 - the website (read at build time by Next.js,
 *    so it must stay a literal process.env.NEXT_PUBLIC_... access)
 *  - SNAPSHOT_V2 - the API (what the career-summary endpoint returns)
 */

export const SNAPSHOT_V2 = process.env.NEXT_PUBLIC_SNAPSHOT_V2 !== "off";

/** Server side only - read per request so a restart picks up a change */
export function snapshotV2OnServer(): boolean {
  return process.env.SNAPSHOT_V2 !== "off";
}

/**
 * RESULT_PAGE_V2 - the result-page redesign (18 Nov 2026): one clear path
 * on the snapshot (the 3 tests), reach the parent, the ₹498 / bundle
 * paywall only after the tests, a free callback and a trust block. OFF
 * unless NEXT_PUBLIC_RESULT_PAGE_V2 is "on" - with it off, /results is
 * exactly the previous page. Website only; the API's additions (callbacks,
 * events) are harmless with the flag off.
 */
export const RESULT_PAGE_V2 = process.env.NEXT_PUBLIC_RESULT_PAGE_V2 === "on";

/**
 * A/B test `snapshot_type_names` (RESULT_PAGE_V2 only): variant A shows the
 * Holland letters only ("SRI"), variant B adds the type names (Social ·
 * Realistic · Investigative) - still no career meaning. Off (everyone gets
 * A) unless NEXT_PUBLIC_AB_SNAPSHOT_TYPE_NAMES is "on"; then 50/50, fixed
 * per session.
 */
export const AB_SNAPSHOT_TYPE_NAMES = process.env.NEXT_PUBLIC_AB_SNAPSHOT_TYPE_NAMES === "on";

/** A session token's stable 50/50 bucket */
function bucket(token: string): 0 | 1 {
  let hash = 0;
  for (let i = 0; i < token.length; i++) hash = (hash * 31 + token.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 2) as 0 | 1;
}

/** The page variant every funnel event carries: "v1" (old page), "v2-A" or "v2-B" */
export function pageVariant(sessionToken: string | undefined): "v1" | "v2-A" | "v2-B" {
  if (!RESULT_PAGE_V2) return "v1";
  if (!AB_SNAPSHOT_TYPE_NAMES || !sessionToken) return "v2-A";
  return bucket(sessionToken) === 1 ? "v2-B" : "v2-A";
}
