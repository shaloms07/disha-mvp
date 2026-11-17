/**
 * SNAPSHOT_V2 - the free snapshots describe the child; the paid report makes
 * the decision. On: the quick-test snapshot shows only an unlabelled radar
 * chart (everything else blurred), and the Deep-Dive snapshot shows a career
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
