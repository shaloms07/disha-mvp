/**
 * One send path for every new WhatsApp template in the parent journey
 * (referral progress, payment confirmations, Deep-Dive/counsellor nudges,
 * the timed reminder sweep). lib/whatsapp/messages.ts's older functions
 * (exam link, exam reminder, result) predate this and are left as-is.
 *
 * Three things this guarantees, so call sites don't have to:
 *  - a template switched off (its env var unset) never sends - it just logs
 *    a SKIPPED row, so the backend can ship before Meta approves a template
 *  - a marketing-kind send never goes to a parent who hasn't opted in, or who
 *    has since opted out
 *  - nothing ever sends twice for the same (session, template, key) - the
 *    WhatsAppMessage row is inserted BEFORE the send is attempted, and its
 *    unique constraint is what actually enforces that, not this code
 */

import { prisma } from "@/lib/db";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";

export type JourneyMessageKind = "utility" | "marketing";

export interface JourneyMessageTarget {
  to: string;
  components: unknown[];
}

export interface SendJourneyMessageParams {
  sessionId: string;
  /** The template's env-var name, e.g. "WHATSAPP_REPORT_OFFER_TEMPLATE" */
  envVar: string;
  /** Stored as WhatsAppMessage.template - the logical template name, e.g. "report_offer" */
  template: string;
  /** Disambiguates a repeatable template (e.g. a reminder fired at both 24h
   *  and 72h) - leave as "" for a template that only ever sends once per session. */
  key?: string;
  kind: JourneyMessageKind;
  /** Builds the actual send only once every gate above has passed - avoids
   *  rendering a PDF or formatting copy for a send that's about to be skipped. */
  build(): Promise<JourneyMessageTarget> | JourneyMessageTarget;
}

const PRISMA_UNIQUE_CONSTRAINT_ERROR = "P2002";

/** Never throws - a WhatsApp failure must never break the caller's own flow
 *  (payment verification, OTP verify, a PATCH). Every outcome is instead
 *  recorded on the WhatsAppMessage row for later inspection (server/routes/admin.ts). */
export async function sendJourneyMessage(params: SendJourneyMessageParams): Promise<void> {
  const { sessionId, envVar, template, key = "", kind, build } = params;

  const templateName = process.env[envVar];
  if (!templateName) {
    await prisma.whatsAppMessage
      .create({ data: { sessionId, template, key, kind, status: "SKIPPED" } })
      .catch(() => {});
    return;
  }

  if (kind === "marketing") {
    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      select: { whatsappOptIn: true, whatsappOptOutAt: true },
    });
    if (!session?.whatsappOptIn || session.whatsappOptOutAt) {
      await prisma.whatsAppMessage
        .create({ data: { sessionId, template, key, kind, status: "SKIPPED" } })
        .catch(() => {});
      return;
    }
  }

  let claimed;
  try {
    claimed = await prisma.whatsAppMessage.create({
      data: { sessionId, template, key, kind, status: "FAILED" },
    });
  } catch (error) {
    if ((error as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT_ERROR) return; // already sent
    console.error(`[whatsapp:journey] failed to claim send for ${template}`, error);
    return;
  }

  try {
    const { to, components } = await build();
    const messageId = await getWhatsAppProvider().sendTemplate(to, templateName, components);
    await prisma.whatsAppMessage.update({
      where: { id: claimed.id },
      data: { status: "SENT", metaMessageId: messageId },
    });
  } catch (error) {
    console.error(`[whatsapp:journey] send failed for ${template}`, error);
    await prisma.whatsAppMessage
      .update({ where: { id: claimed.id }, data: { status: "FAILED", error: String(error) } })
      .catch(() => {});
  }
}
