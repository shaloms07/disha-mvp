/**
 * POST /session/:token/events - the results paywall's first-party funnel
 * events (lib/funnelEvents.ts). Stored in our own database only; counted on
 * /admin/funnel.
 *
 * The child's class is read from the database, not trusted from the browser.
 * payment_success is never accepted here - lib/checkout/markOrderPaid.ts
 * records it from a verified payment. The exit prompt is answered once per
 * session: a second answer or dismissal is ignored.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  CLIENT_FUNNEL_EVENTS,
  DEVICE_ROLES,
  EXIT_EVENTS,
  EXIT_PROMPT_OPTIONS,
  PLAN_KEYS,
  VARIANT_PATTERN,
} from "@/lib/funnelEvents";

export const eventsRouter = Router();

const BODY_SCHEMA = z.object({
  name: z.enum(CLIENT_FUNNEL_EVENTS as [string, ...string[]]),
  deviceRole: z.enum(DEVICE_ROLES).optional(),
  plan: z.enum(PLAN_KEYS).optional(),
  answer: z.enum(EXIT_PROMPT_OPTIONS.map((o) => o.key) as [string, ...string[]]).optional(),
  /** lib/featureFlags.ts's pageVariant */
  variant: z.string().regex(VARIANT_PATTERN).optional(),
});

const ANSWER_EVENTS = ["exit_prompt_answer", "exit_question_answer"];
const PLAN_EVENTS = ["plan_selected", "cta_pay_498", "cta_bundle_1299", "cta_addon_call_999", "cta_career_list_49"];

eventsRouter.post("/session/:token/events", async (req, res) => {
  const parsed = BODY_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { name, deviceRole, plan, answer, variant } = parsed.data;
  if (ANSWER_EVENTS.includes(name) && !answer) {
    res.status(400).json({ error: "An answer is required" });
    return;
  }

  const session = await prisma.assessmentSession.findUnique({
    where: { token: req.params.token },
    select: { id: true, child: { select: { grade: true } } },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if ((EXIT_EVENTS as readonly string[]).includes(name)) {
    const already = await prisma.funnelEvent.findFirst({
      where: { sessionId: session.id, name: { in: [...EXIT_EVENTS] } },
      select: { id: true },
    });
    if (already) {
      res.json({ ok: true, duplicate: true });
      return;
    }
  }

  await prisma.funnelEvent.create({
    data: {
      sessionId: session.id,
      name,
      deviceRole,
      childClass: session.child.grade,
      variant,
      plan: PLAN_EVENTS.includes(name) ? plan : undefined,
      answer: ANSWER_EVENTS.includes(name) ? answer : undefined,
    },
  });
  res.json({ ok: true });
});
