/**
 * Free callback requests (RESULT_PAGE_V2) - one place that creates them,
 * whichever way the parent asked: the paywall's "Request a free callback",
 * the exit question, or a "CALL" reply on WhatsApp. No slot and no booking:
 * the counsellor calls at their discretion, working down /admin/callbacks.
 *
 * One open request per session - asking again returns the existing one
 * (its preferred time updated), so a double tap never makes two calls.
 * Server-only (prisma).
 */

import { prisma } from "@/lib/db";
import { recordServerFunnelEvent } from "@/lib/checkout/markOrderPaid";
import { sendCallbackConfirmMessage } from "@/lib/whatsapp/journeyMessages";
import type { CallbackStatus, PreferredTime } from "@/lib/callbackShared";

export { CALLBACK_STATUSES, PREFERRED_TIMES, type CallbackStatus, type PreferredTime } from "@/lib/callbackShared";

export type CallbackSource = "page" | "exit_question" | "whatsapp";

/** Pay taps that mark a session "tapped Pay without paying" - old and V2 page events */
const PAY_TAP_EVENTS = ["cta_pay_498", "cta_bundle_1299", "cta_addon_call_999", "unlock_tap", "plan_selected"];

/** Still waiting for a call - a new request isn't made while one of these exists */
const OPEN_STATUSES: CallbackStatus[] = ["requested", "no_answer"];

export async function requestCallback(
  sessionId: string,
  options: { preferredTime?: PreferredTime; source: CallbackSource },
): Promise<{ id: string; created: boolean } | null> {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      token: true,
      parentId: true,
      childId: true,
      deepDiveCompletedAt: true,
      parent: { select: { name: true, mobile: true } },
      child: { select: { name: true, grade: true } },
    },
  });
  if (!session) return null;

  const existing = await prisma.callbackRequest.findFirst({
    where: { sessionId, status: { in: OPEN_STATUSES } },
    orderBy: { requestedAt: "desc" },
    select: { id: true },
  });
  if (existing) {
    if (options.preferredTime) {
      await prisma.callbackRequest.update({
        where: { id: existing.id },
        data: { preferredTime: options.preferredTime },
      });
    }
    return { id: existing.id, created: false };
  }

  const tappedPay = await prisma.funnelEvent.count({ where: { sessionId, name: { in: PAY_TAP_EVENTS } } });
  const callback = await prisma.callbackRequest.create({
    data: {
      sessionId,
      parentId: session.parentId,
      childId: session.childId,
      childClass: session.child.grade,
      deepDiveDone: Boolean(session.deepDiveCompletedAt),
      tappedPay: tappedPay > 0,
      preferredTime: options.preferredTime,
      source: options.source,
    },
    select: { id: true },
  });

  recordServerFunnelEvent(sessionId, "callback_requested", { deviceRole: "parent" });
  // Never throws - a WhatsApp failure is recorded on its own row
  void sendCallbackConfirmMessage({
    sessionId,
    sessionToken: session.token,
    parentMobile: session.parent.mobile,
    parentName: session.parent.name,
    childName: session.child.name,
    callbackId: callback.id,
  });

  return { id: callback.id, created: true };
}

/**
 * The counsellors' order (the spec's priority): 1. Deep-Dive done and tapped
 * Pay without paying, 2. Class 10 and 12, 3. everyone else - oldest first
 * within each. Lower is sooner.
 */
export function callbackPriority(request: { deepDiveDone: boolean; tappedPay: boolean; childClass: string | null }): 1 | 2 | 3 {
  if (request.deepDiveDone && request.tappedPay) return 1;
  if (/\b(10|12)\b/.test(request.childClass ?? "")) return 2;
  return 3;
}

