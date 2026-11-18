/**
 * Free callbacks (RESULT_PAGE_V2) - the parent's one-tap request from the
 * results page, and the counsellors' list on /admin/callbacks.
 *
 *  POST  /session/:token/callback             the page's "Request a free callback"
 *  GET   /admin/callbacks                     open requests, in priority order
 *  PATCH /admin/callbacks/:id                 { status } - called / no_answer / ...
 *  POST  /admin/callbacks/:id/send-pay-link   WhatsApp the parent the pay link
 *
 * No form: the number called is the session's verified parent mobile. Test
 * records (lib/admin/testRecords.ts) are left out of the list unless
 * ?includeTest=1.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminAuth } from "./admin";
import { CALLBACK_STATUSES, PREFERRED_TIMES, callbackPriority, requestCallback } from "@/lib/callbacks/requestCallback";
import { recordServerFunnelEvent } from "@/lib/checkout/markOrderPaid";
import { isTestRecord } from "@/lib/admin/testRecords";
import { sendCallbackPayLinkMessage } from "@/lib/whatsapp/journeyMessages";

export const callbacksRouter = Router();

const REQUEST_SCHEMA = z.object({
  preferredTime: z.enum(PREFERRED_TIMES).optional(),
  source: z.enum(["page", "exit_question"]).optional(),
});

callbacksRouter.post("/session/:token/callback", async (req, res) => {
  const parsed = REQUEST_SCHEMA.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const session = await prisma.assessmentSession.findUnique({
    where: { token: req.params.token },
    select: { id: true, otpVerified: true },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  // Only a verified number gets called
  if (!session.otpVerified) {
    res.status(403).json({ error: "The parent's number isn't verified." });
    return;
  }
  const result = await requestCallback(session.id, {
    preferredTime: parsed.data.preferredTime,
    source: parsed.data.source ?? "page",
  });
  if (!result) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({ ok: true, created: result.created });
});

const LIST_SCHEMA = z.object({
  /** "open" (requested + no_answer, the default) or one status, or "all" */
  status: z.enum(["open", "all", ...CALLBACK_STATUSES]).optional(),
  includeTest: z.enum(["0", "1"]).optional(),
});

callbacksRouter.get("/admin/callbacks", requireAdminAuth, async (req, res) => {
  const parsed = LIST_SCHEMA.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const status = parsed.data.status ?? "open";
  const includeTest = parsed.data.includeTest === "1";

  const rows = await prisma.callbackRequest.findMany({
    where:
      status === "all"
        ? {}
        : status === "open"
          ? { status: { in: ["requested", "no_answer"] } }
          : { status },
    orderBy: { requestedAt: "asc" },
    take: 500,
    include: {
      session: {
        select: {
          token: true,
          purchasedTierLevel: true,
          parent: { select: { name: true, mobile: true } },
          child: { select: { name: true } },
        },
      },
    },
  });

  const callbacks = rows
    .map((row) => ({
      id: row.id,
      sessionToken: row.session.token,
      parentName: row.session.parent.name,
      parentMobile: row.session.parent.mobile,
      childName: row.session.child.name,
      childClass: row.childClass,
      deepDiveDone: row.deepDiveDone,
      tappedPay: row.tappedPay,
      paidTierLevel: row.session.purchasedTierLevel ?? 0,
      preferredTime: row.preferredTime,
      source: row.source,
      status: row.status,
      priority: callbackPriority(row),
      requestedAt: row.requestedAt.toISOString(),
      calledAt: row.calledAt?.toISOString(),
      payLinkSentAt: row.payLinkSentAt?.toISOString(),
      isTest: isTestRecord({
        parentMobile: row.session.parent.mobile,
        parentName: row.session.parent.name,
        childName: row.session.child.name,
      }),
    }))
    .filter((row) => includeTest || !row.isTest)
    // Priority first, then oldest first (rows are already oldest first)
    .sort((a, b) => a.priority - b.priority);

  res.json({ status, includeTest, callbacks });
});

const UPDATE_SCHEMA = z.object({ status: z.enum(CALLBACK_STATUSES) });

callbacksRouter.patch("/admin/callbacks/:id", requireAdminAuth, async (req, res) => {
  const parsed = UPDATE_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const existing = await prisma.callbackRequest.findUnique({
    where: { id: req.params.id as string },
    select: { id: true, sessionId: true, status: true, calledAt: true },
  });
  if (!existing) {
    res.status(404).json({ error: "Callback not found" });
    return;
  }
  const { status } = parsed.data;
  const firstCall = status === "called" && !existing.calledAt;
  await prisma.callbackRequest.update({
    where: { id: existing.id },
    data: { status, ...(firstCall ? { calledAt: new Date() } : {}) },
  });
  if (firstCall) recordServerFunnelEvent(existing.sessionId, "callback_called", { deviceRole: "parent" });
  res.json({ ok: true });
});

callbacksRouter.post("/admin/callbacks/:id/send-pay-link", requireAdminAuth, async (req, res) => {
  const callback = await prisma.callbackRequest.findUnique({
    where: { id: req.params.id as string },
    select: {
      id: true,
      sessionId: true,
      session: {
        select: { token: true, parent: { select: { name: true, mobile: true } }, child: { select: { name: true } } },
      },
    },
  });
  if (!callback) {
    res.status(404).json({ error: "Callback not found" });
    return;
  }
  if (!process.env.WHATSAPP_CALLBACK_PAY_LINK_TEMPLATE) {
    res.status(503).json({ error: "The callback_pay_link WhatsApp template isn't set up yet." });
    return;
  }
  const sentAt = new Date();
  await sendCallbackPayLinkMessage({
    sessionId: callback.sessionId,
    sessionToken: callback.session.token,
    parentMobile: callback.session.parent.mobile,
    parentName: callback.session.parent.name,
    childName: callback.session.child.name,
    key: `${callback.id}:${sentAt.toISOString()}`,
  });
  await prisma.callbackRequest.update({ where: { id: callback.id }, data: { payLinkSentAt: sentAt } });
  res.json({ ok: true, sentAt: sentAt.toISOString() });
});
