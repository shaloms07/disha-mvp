/**
 * One function per new journey template (MyLifeCoach-Backend-Update-99-Plan.md's
 * table), each built on lib/whatsapp/journey.ts's sendJourneyMessage -
 * env-var-gated, consent-gated where marketing, and safe to call more than
 * once (the WhatsAppMessage row's unique constraint makes every send
 * idempotent).
 *
 * Body-parameter count and order must match the approved template EXACTLY -
 * Meta rejects a mismatched send (error 132000). Every link is a URL button's
 * dynamic suffix, never body text (a body parameter can't itself be a
 * tappable link). The button's base URL is configured in WhatsApp Manager as
 * "https://www.mylifecoach.in/results?t=" with only the session token
 * varying - a few templates below have no button at all (counsellor_book,
 * counsellor_confirmed, counsellor_reminder), which is deliberate, not an
 * oversight.
 */

import { formatInr } from "@/lib/pricing";
import { sendJourneyMessage } from "@/lib/whatsapp/journey";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider";
import { reportPdfFileName, uploadCareerMatchReportPdf } from "@/lib/whatsapp/careerMatchReportPdf";
import type { RiasecType } from "@/types";

function displayName(name: string): string {
  return name.trim() || "there";
}

function price(amount: number): string {
  return formatInr(amount).slice(1);
}

/** A button component whose only dynamic part is the session token appended
 *  to the template's own configured base URL. */
function linkButton(sessionToken: string) {
  return { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: sessionToken }] };
}

function bodyText(...values: string[]) {
  return { type: "body", parameters: values.map((text) => ({ type: "text", text })) };
}

/** "Saturday, 8 November" - IST, matching the approved templates' date variable. */
function istDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  });
}

/** "11:00 am" - IST, matching the approved templates' time variable. */
function istTime(date: Date): string {
  return date
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
    .toLowerCase();
}

interface BaseParams {
  sessionId: string;
  parentMobile: string;
  parentName: string;
  childName: string;
  sessionToken: string;
}

/** Fires once a session completes the free RIASEC test - replaces
 *  lib/whatsapp/messages.ts's sendResultMessage once this template is
 *  approved and its env var is set; until then that older function keeps
 *  running the actual send (see server/routes/session.ts - never both). */
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

/** 1h after a free test completes, if the Career Match Report still isn't owned. */
export async function sendReportOfferMessage(params: BaseParams & { reportPrice: number }): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_REPORT_OFFER_TEMPLATE",
    template: "report_offer",
    kind: "marketing",
    build: () => ({
      to: params.parentMobile,
      components: [
        bodyText(displayName(params.parentName), params.childName, price(params.reportPrice)),
        linkButton(params.sessionToken),
      ],
    }),
  });
}

/** Tier 1 ("Career Match Report") paid - sent with the PDF attached, same
 *  document a referral unlock sends (lib/whatsapp/careerMatchReportPdf.ts). */
export async function sendReportPaidMessage(
  params: BaseParams & {
    orderId: string;
    amountPaid: number;
    razorpayPaymentId: string;
    scores: Record<RiasecType, number>;
  },
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
              { type: "document", document: { id: mediaId, filename: reportPdfFileName(params.childName, "career-match-report") } },
            ],
          },
          bodyText(
            displayName(params.parentName),
            price(params.amountPaid),
            params.childName,
            params.razorpayPaymentId,
          ),
          linkButton(params.sessionToken),
        ],
      };
    },
  });
}

/** 1 day after unlockedAt (payment or referral), if Tier 3 still isn't owned. */
export async function sendUpgradeOfferMessage(
  params: BaseParams & { completeReportPrice: number; counsellorPrice: number },
): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_UPGRADE_OFFER_TEMPLATE",
    template: "upgrade_offer",
    kind: "marketing",
    build: () => ({
      to: params.parentMobile,
      components: [
        bodyText(
          displayName(params.parentName),
          params.childName,
          price(params.completeReportPrice),
          price(params.counsellorPrice),
        ),
        linkButton(params.sessionToken),
      ],
    }),
  });
}

/** Tiers 3/4 paid - no PDF attached here (the Deep-Dive isn't finished yet,
 *  so there's no full report to send - see sendFullReportReadyMessage). */
export async function sendPaymentReceivedMessage(
  params: BaseParams & { orderId: string; amountPaid: number; planName: string; razorpayPaymentId: string },
): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_PAYMENT_RECEIVED_TEMPLATE",
    template: "payment_received",
    // One receipt per payment, not per session - a parent who upgrades twice
    // (₹1,299, then the counsellor) gets both.
    key: params.orderId,
    kind: "utility",
    build: () => ({
      to: params.parentMobile,
      components: [
        bodyText(
          displayName(params.parentName),
          price(params.amountPaid),
          params.childName,
          params.planName,
          params.razorpayPaymentId,
        ),
        linkButton(params.sessionToken),
      ],
    }),
  });
}

/** 1 day after deepDiveCompletedAt, if Tier 4 still isn't owned. */
export async function sendCounsellorOfferMessage(params: BaseParams & { counsellorPrice: number }): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_COUNSELLOR_OFFER_TEMPLATE",
    template: "counsellor_offer",
    kind: "marketing",
    build: () => ({
      to: params.parentMobile,
      components: [
        bodyText(displayName(params.parentName), params.childName, price(params.counsellorPrice)),
        linkButton(params.sessionToken),
      ],
    }),
  });
}

/** Tier 3+, Deep-Dive not finished, idle 24h then 72h (72h only after a 24h
 *  send at least 48h earlier - server/jobs/reminderSweep.ts works this out).
 *  Marketing: submitted as utility, but Meta only approved it recategorised -
 *  so it needs the parent's WhatsApp opt-in like the other marketing sends. */
export async function sendDeepDiveReminderMessage(
  params: BaseParams & { key: "24h" | "72h"; testsDone: number },
): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_DEEPDIVE_REMINDER_TEMPLATE",
    template: "deepdive_reminder",
    key: params.key,
    kind: "marketing",
    build: () => ({
      to: params.parentMobile,
      components: [
        bodyText(displayName(params.parentName), params.childName, String(params.testsDone)),
        linkButton(params.sessionToken),
      ],
    }),
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

/** All three Deep-Dive modules scored on a session that hasn't bought a plan
 *  including them (the Deep-Dive is free to take; the report is paid) - the
 *  Complete Career Report is waiting to be unlocked. Marketing: it sells. */
export async function sendDeepDiveUnlockMessage(params: BaseParams & { reportPrice: number }): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_DEEPDIVE_UNLOCK_TEMPLATE",
    template: "deepdive_unlock",
    kind: "marketing",
    build: () => ({
      to: params.parentMobile,
      components: [
        bodyText(displayName(params.parentName), params.childName, price(params.reportPrice)),
        linkButton(params.sessionToken),
      ],
    }),
  });
}

/** Deep-Dive just finished on a Tier 4 ("Report + Counsellor") session -
 *  prompts picking a time. Same dynamic URL button as the others, landing on
 *  /results where components/ConsultationScheduler.tsx's embedded Calendly
 *  calendar (or the admin-booking fallback message) is.
 *  Marketing: Meta only approved it recategorised, so a parent who didn't opt
 *  in to WhatsApp updates doesn't get it - the booking calendar on /results
 *  (and /report-preview) is the way in that never depends on this message. */
export async function sendCounsellorBookMessage(params: BaseParams): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_COUNSELLOR_BOOK_TEMPLATE",
    template: "counsellor_book",
    kind: "marketing",
    build: () => ({
      to: params.parentMobile,
      components: [bodyText(displayName(params.parentName), params.childName), linkButton(params.sessionToken)],
    }),
  });
}

/** A counsellor call was created or rescheduled (server/routes/admin.ts).
 *  No counsellor name anywhere - the template says "our counsellor". */
export async function sendCounsellorConfirmedMessage(params: {
  sessionId: string;
  parentMobile: string;
  parentName: string;
  childName: string;
  scheduledAt: Date;
  meetingLink: string;
}): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_COUNSELLOR_CONFIRMED_TEMPLATE",
    template: "counsellor_confirmed",
    // Either a changed time or a changed link needs a fresh send, so both are
    // part of the idempotency key - a key based on time alone would silently
    // skip a link-only edit, since sendJourneyMessage treats a repeated key as
    // "already sent".
    key: `${params.scheduledAt.toISOString()}:${params.meetingLink}`,
    kind: "utility",
    build: () => ({
      to: params.parentMobile,
      components: [
        bodyText(
          displayName(params.parentName),
          params.childName,
          istDate(params.scheduledAt),
          istTime(params.scheduledAt),
          params.meetingLink,
        ),
      ],
    }),
  });
}

/** 2h before a booked call - a reminder of something already scheduled, not
 *  an upsell, so (like deepdive_reminder) this is utility. Ignores the
 *  9am-8pm IST window entirely (server/jobs/reminderSweep.ts) - a 9am call
 *  needs its reminder at 7am. */
export async function sendCounsellorReminderMessage(params: {
  sessionId: string;
  parentMobile: string;
  parentName: string;
  childName: string;
  scheduledAt: Date;
  meetingLink: string;
}): Promise<void> {
  await sendJourneyMessage({
    sessionId: params.sessionId,
    envVar: "WHATSAPP_COUNSELLOR_REMINDER_TEMPLATE",
    template: "counsellor_reminder",
    key: params.scheduledAt.toISOString(),
    kind: "utility",
    build: () => ({
      to: params.parentMobile,
      components: [
        bodyText(displayName(params.parentName), params.childName, istTime(params.scheduledAt), params.meetingLink),
      ],
    }),
  });
}

/* ---------------------------------------------------------------------
   Invite-3-parents sends (lib/referral.ts) - switched off for now
   (REFERRALS_ENABLED), since they're not submitted to Meta: every attempted
   send writes SKIPPED. Kept, not deleted, so turning the feature back on
   needs no further backend work.
   --------------------------------------------------------------------- */

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
              { type: "document", document: { id: mediaId, filename: reportPdfFileName(params.childName, "career-match-report") } },
            ],
          },
          bodyText(displayName(params.parentName), params.childName),
        ],
      };
    },
  });
}
