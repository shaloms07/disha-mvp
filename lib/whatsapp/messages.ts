/**
 * The two original WhatsApp sends (server/API.md): a welcome message with the
 * exam link right after registration, and the exam reminder for a test left
 * unfinished. (The result now goes out as lib/whatsapp/journeyMessages.ts's
 * result_link.) Both are fire-and-forget from the caller's
 * point of view - a WhatsApp failure never blocks registration or scoring,
 * it just gets logged (console.error) for now, same philosophy as
 * server/routes/auth.ts's OTP send.
 *
 * Template names/variable order are configurable via env, since the actual
 * approved template (submitted in Meta's WhatsApp Manager) decides them, not
 * this code - see .env.example.
 */

import { getWhatsAppProvider } from "@/lib/whatsapp/provider";
import { sendCapiEvent } from "@/lib/meta/capi";
import { displayName, displayChildName } from "@/lib/whatsapp/textParams";

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL ?? "http://localhost:3000";

export function examLink(sessionToken: string): string {
  return `${FRONTEND_BASE_URL}/resume?t=${sessionToken}`;
}

export async function sendExamLinkMessage(params: {
  parentMobile: string;
  parentName: string;
  childName: string;
  sessionToken: string;
}): Promise<void> {
  const templateName = process.env.WHATSAPP_EXAM_LINK_TEMPLATE ?? "exam_link";
  try {
    await getWhatsAppProvider().sendTemplate(params.parentMobile, templateName, [
      {
        type: "body",
        parameters: [
          { type: "text", text: displayName(params.parentName) },
          { type: "text", text: displayChildName(params.childName) },
          { type: "text", text: examLink(params.sessionToken) },
        ],
      },
    ]);
    void sendCapiEvent({
      eventName: "TestLinkSent",
      mobile: params.parentMobile,
      customData: { channel: "whatsapp" },
    });
  } catch (error) {
    console.error(`[whatsapp] exam link send failed for ${params.sessionToken}`, error);
  }
}

/**
 * Nudges a parent whose session has gone idle without finishing the test -
 * see server/jobs/reminderSweep.ts for when this actually fires. Variable
 * order confirmed against the real approved template: parent name, child
 * name, link - "Hi {{1}}, ... {{2}}'s My Life Coach career test is still
 * waiting ... {{3}}".
 */
export async function sendExamReminderMessage(params: {
  parentMobile: string;
  parentName: string;
  childName: string;
  sessionToken: string;
}): Promise<void> {
  const templateName = process.env.WHATSAPP_REMINDER_TEMPLATE ?? "exam_reminder";
  try {
    await getWhatsAppProvider().sendTemplate(params.parentMobile, templateName, [
      {
        type: "body",
        parameters: [
          { type: "text", text: displayName(params.parentName) },
          { type: "text", text: displayChildName(params.childName) },
          { type: "text", text: examLink(params.sessionToken) },
        ],
      },
    ]);
  } catch (error) {
    console.error(`[whatsapp] reminder send failed for ${params.sessionToken}`, error);
  }
}
