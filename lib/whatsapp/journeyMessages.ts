/**
 * One function per new journey template (MyLifeCoach-Backend-Prompt-WhatsApp-Invites.md),
 * each built on lib/whatsapp/journey.ts's sendJourneyMessage - env-var-gated,
 * consent-gated where marketing, and safe to call more than once (the
 * WhatsAppMessage row's unique constraint makes every send idempotent).
 *
 * Every link is a URL button's dynamic suffix, never body text (Meta's own
 * distinction - a body parameter can't itself be a tappable link). The
 * button's base URL is configured in WhatsApp Manager as
 * "https://www.mylifecoach.in/results?t=" with only the session token varying.
 */

import { formatInr } from "@/lib/pricing";
import { sendJourneyMessage } from "@/lib/whatsapp/journey";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";
import { uploadCareerMatchReportPdf } from "@/lib/whatsapp/careerMatchReportPdf";
import type { RiasecType } from "@/types";

function displayName(name: string): string {
  return name.trim() || "there";
}

/** A button component whose only dynamic part is the session token appended
 *  to the template's own configured base URL. */
function linkButton(sessionToken: string) {
  return { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: sessionToken }] };
}

function bodyText(...values: string[]) {
  return { type: "body", parameters: values.map((text) => ({ type: "text", text })) };
}

interface BaseParams {
  sessionId: string;
  parentMobile: string;
  parentName: string;
  childName: string;
  sessionToken: string;
}

/** Fires once a session completes the free RIASEC test - eventually replaces
 *  lib/whatsapp/messages.ts's sendResultMessage once this template is
 *  approved; that older function keeps running the actual send until then,
 *  so this is wired up but not yet the active path (see server/routes/session.ts). */
export async function sendResultLinkMessage(params: BaseParams): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_RESULT_LINK_TEMPLATE",
    template: "result_link",
    kind: "utility",
    build: () => ({
      to: params.parentMobile,
      components: [bodyText(displayName(params.parentName), params.childName), linkButton(params.sessionToken)],
    }),
  });
}

/** Tier 1 ("Career Match Report") paid - sent with the PDF attached, same
 *  document a referral unlock sends (lib/whatsapp/careerMatchReportPdf.ts). */
export async function sendReportPaidMessage(
  params: BaseParams & { orderId: string; scores: Record<RiasecType, number> },
): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_REPORT_PAID_TEMPLATE",
    template: "report_paid",
    kind: "utility",
    build: async () => {
      const provider = getWhatsAppProvider();
      const mediaId = await uploadCareerMatchReportPdf(provider, {
        childName: params.childName,
        orderId: params.orderId,
        scores: params.scores,
      });
      return {
        to: params.parentMobile,
        components: [
          {
            type: "header",
            parameters: [
              { type: "document", document: { id: mediaId, filename: "my-life-coach-career-match-report.pdf" } },
            ],
          },
          bodyText(displayName(params.parentName), params.childName),
        ],
      };
    },
  });
}

/** Tiers 3/4 paid - no PDF attached here (the Deep-Dive isn't finished yet,
 *  so there's no full report to send - see sendFullReportReadyMessage). */
export async function sendPaymentReceivedMessage(params: BaseParams & { tierLevel: number }): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_PAYMENT_RECEIVED_TEMPLATE",
    template: "payment_received",
    kind: "utility",
    build: () => ({
      to: params.parentMobile,
      components: [bodyText(displayName(params.parentName), params.childName), linkButton(params.sessionToken)],
    }),
  });
}

/** Count 1 or 2 of the 3 invites needed - key distinguishes each progress
 *  step so a parent hitting 1 then 2 gets both nudges, not just the first. */
export async function sendReferralProgressMessage(params: {
  sessionId: string;
  parentMobile: string;
  parentName: string;
  referralCount: number;
}): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_REFERRAL_PROGRESS_TEMPLATE",
    template: "referral_progress",
    key: String(params.referralCount),
    kind: "utility",
    build: () => ({
      to: params.parentMobile,
      components: [bodyText(displayName(params.parentName), String(params.referralCount))],
    }),
  });
}

/** The 3rd invite lands - Career Match Report unlocked free, PDF attached. */
export async function sendReferralUnlockedMessage(
  params: BaseParams & { scores: Record<RiasecType, number> },
): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_REFERRAL_UNLOCKED_TEMPLATE",
    template: "referral_unlocked",
    kind: "utility",
    build: async () => {
      const provider = getWhatsAppProvider();
      const mediaId = await uploadCareerMatchReportPdf(provider, {
        childName: params.childName,
        orderId: "INVITE-UNLOCK",
        scores: params.scores,
      });
      return {
        to: params.parentMobile,
        components: [
          {
            type: "header",
            parameters: [
              { type: "document", document: { id: mediaId, filename: "my-life-coach-career-match-report.pdf" } },
            ],
          },
          bodyText(displayName(params.parentName), params.childName),
        ],
      };
    },
  });
}

/** All three Deep-Dive modules now scored - the Complete Career Report is ready. */
export async function sendFullReportReadyMessage(params: BaseParams): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_FULL_REPORT_READY_TEMPLATE",
    template: "full_report_ready",
    kind: "utility",
    build: () => ({
      to: params.parentMobile,
      components: [bodyText(displayName(params.parentName), params.childName), linkButton(params.sessionToken)],
    }),
  });
}

/** Deep-Dive just finished on a Tier 4 ("Report + Counsellor") session -
 *  prompts booking the call they already paid for. */
export async function sendCounsellorBookMessage(params: BaseParams): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_COUNSELLOR_BOOK_TEMPLATE",
    template: "counsellor_book",
    kind: "utility",
    build: () => ({
      to: params.parentMobile,
      components: [bodyText(displayName(params.parentName), params.childName), linkButton(params.sessionToken)],
    }),
  });
}

/** A counsellor call was created or rescheduled (server/routes/admin.ts). */
export async function sendCounsellorConfirmedMessage(params: {
  sessionId: string;
  parentMobile: string;
  parentName: string;
  scheduledAt: Date;
}): Promise<void> {
  const when = params.scheduledAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_COUNSELLOR_CONFIRMED_TEMPLATE",
    template: "counsellor_confirmed",
    key: params.scheduledAt.toISOString(),
    kind: "utility",
    build: () => ({
      to: params.parentMobile,
      components: [bodyText(displayName(params.parentName), when)],
    }),
  });
}

/* ---------------------------------------------------------------------
   Timed, marketing-kind nudges (server/jobs/reminderSweep.ts). Each needs
   whatsappOptIn and no whatsappOptOutAt, enforced by sendJourneyMessage.
   --------------------------------------------------------------------- */

/** 1h after a free test completes, if the Career Match Report still isn't owned. */
export async function sendReportOfferMessage(params: BaseParams): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_REPORT_OFFER_TEMPLATE",
    template: "report_offer",
    kind: "marketing",
    build: () => ({
      to: params.parentMobile,
      components: [bodyText(displayName(params.parentName), params.childName), linkButton(params.sessionToken)],
    }),
  });
}

/** 1 day after unlockedAt (payment or referral), if Tier 3 still isn't owned. */
export async function sendUpgradeOfferMessage(params: BaseParams & { upgradePrice: number }): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_UPGRADE_OFFER_TEMPLATE",
    template: "upgrade_offer",
    kind: "marketing",
    build: () => ({
      to: params.parentMobile,
      components: [
        bodyText(displayName(params.parentName), params.childName, formatInr(params.upgradePrice).slice(1)),
        linkButton(params.sessionToken),
      ],
    }),
  });
}

/** Tier 3+, Deep-Dive not finished, idle 24h then 72h - key distinguishes the two. */
export async function sendDeepDiveReminderMessage(params: BaseParams & { key: "24h" | "72h" }): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_DEEPDIVE_REMINDER_TEMPLATE",
    template: "deepdive_reminder",
    key: params.key,
    kind: "marketing",
    build: () => ({
      to: params.parentMobile,
      components: [bodyText(displayName(params.parentName), params.childName), linkButton(params.sessionToken)],
    }),
  });
}

/** 1 day after deepDiveCompletedAt, if Tier 4 still isn't owned. */
export async function sendCounsellorOfferMessage(params: BaseParams): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_COUNSELLOR_OFFER_TEMPLATE",
    template: "counsellor_offer",
    kind: "marketing",
    build: () => ({
      to: params.parentMobile,
      components: [bodyText(displayName(params.parentName), params.childName), linkButton(params.sessionToken)],
    }),
  });
}

/** 2h before a booked call - a reminder of something already scheduled, not
 *  an upsell, so (unlike the other timed sends above) this one is utility. */
export async function sendCounsellorReminderMessage(params: {
  sessionId: string;
  parentMobile: string;
  parentName: string;
  scheduledAt: Date;
}): Promise<void> {
  const when = params.scheduledAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_COUNSELLOR_REMINDER_TEMPLATE",
    template: "counsellor_reminder",
    key: params.scheduledAt.toISOString(),
    kind: "utility",
    build: () => ({
      to: params.parentMobile,
      components: [bodyText(displayName(params.parentName), when)],
    }),
  });
}
