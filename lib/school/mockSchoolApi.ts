/**
 * Mocked school-side "backend" — SCHOOL_ADMIN_SPEC.md Sections 2 and 4.
 *
 * Same contract as lib/mockApi.ts: local async functions with an artificial
 * delay, nothing touching the network. Everything here is explicitly out of
 * scope for this build and simulated:
 *
 *   - no CSV/Excel is parsed. A file picker accepts any file and this module
 *     returns a pre-baked roster regardless of what was chosen.
 *   - no WhatsApp or SMS message is sent, for invitations or nudges.
 *   - no webinar is scheduled and no invite goes out.
 *
 * The one thing that is NOT simulated is registration itself: batch onboarding
 * calls the consumer product's own mockRegisterSession once per row, so a
 * school-generated link is the same artefact a parent gets on /link — just
 * created in bulk and tagged with a schoolId/classId up front.
 */

import mockRosterData from "@/data/school-admin/mockRosterUpload.json";
import { mockRegisterSession } from "@/lib/mockApi";
import {
  SCHOOL,
  findClassById,
  linkCodeFor,
  schoolTestLink,
} from "./schoolCode";

export const MOCK_SCHOOL_DELAYS = {
  parseRoster: 900,
  registerRow: 90,
  sendInvitations: 1100,
  sendNudge: 600,
  scheduleWebinar: 800,
} as const;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RosterRow {
  studentName: string;
  parentName: string;
  parentMobile: string;
  classId: string;
}

export const MOCK_ROSTER = mockRosterData as RosterRow[];

/** One generated registration, ready to be sent to a parent */
export interface GeneratedInvite {
  row: RosterRow;
  sessionToken: string;
  /** The branded /CODE-10A/test?t=… link, identical to what /link shows */
  link: string;
  /** The code embedded in that link, section included */
  code: string;
  schoolId: string;
  classId: string;
}

/**
 * Stands in for parsing an uploaded roster file.
 *
 * The file is deliberately ignored — real CSV/Excel parsing is out of scope
 * (Section 2), so any file the presenter picks yields the same rows. The name
 * is echoed back only so the screen can show what was "read".
 */
export async function mockParseRoster(
  file: File | null,
): Promise<{ fileName: string; rows: RosterRow[] }> {
  await delay(MOCK_SCHOOL_DELAYS.parseRoster);
  return {
    fileName: file?.name ?? "roster.xlsx",
    rows: MOCK_ROSTER,
  };
}

/**
 * Run the existing registration flow once per roster row.
 *
 * This is bulk-triggering the consumer path, not a second registration
 * mechanism: each row goes through mockRegisterSession exactly as /register
 * does, and the only addition is that the resulting session is tagged with the
 * school's id and the row's section before the link is handed out.
 */
export async function mockBatchOnboard(
  rows: RosterRow[],
  onProgress?: (done: number, total: number) => void,
): Promise<GeneratedInvite[]> {
  // Same link the consumer flow builds on /link. Falls back to the bare path
  // if there is no window, rather than naming a host this demo does not have.
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const invites: GeneratedInvite[] = [];
  for (const [i, row] of rows.entries()) {
    const { sessionToken } = await mockRegisterSession({
      parentName: row.parentName,
      parentMobile: row.parentMobile,
      childName: row.studentName,
      childClass: `Class ${findClassById(row.classId)?.grade ?? ""}`.trim(),
    });
    const code = linkCodeFor(row.classId);
    invites.push({
      row,
      sessionToken,
      code,
      link: schoolTestLink(code, sessionToken, origin),
      schoolId: SCHOOL.id,
      classId: row.classId,
    });
    onProgress?.(i + 1, rows.length);
    await delay(MOCK_SCHOOL_DELAYS.registerRow);
  }
  return invites;
}

/** No message is sent anywhere. Returns what a real send would have returned. */
export async function mockSendInvitations(
  invites: GeneratedInvite[],
): Promise<{ sent: number; channel: "whatsapp" }> {
  await delay(MOCK_SCHOOL_DELAYS.sendInvitations);
  return { sent: invites.length, channel: "whatsapp" };
}

/** One-click reminder on an incomplete student. Also sends nothing. */
export async function mockSendNudge(
  studentName: string,
): Promise<{ sent: true; studentName: string }> {
  await delay(MOCK_SCHOOL_DELAYS.sendNudge);
  return { sent: true, studentName };
}

/** Parent-webinar invite. Nothing is scheduled and nobody is invited. */
export async function mockScheduleWebinar(topic: string): Promise<{
  scheduled: true;
  topic: string;
  invitesQueued: number;
}> {
  await delay(MOCK_SCHOOL_DELAYS.scheduleWebinar);
  return { scheduled: true, topic, invitesQueued: 0 };
}
