/**
 * The results snapshot's WhatsApp opt-in (components/results/ResultsOptIn.tsx)
 * - the same marketing consent /register records (AssessmentSession.
 * whatsappOptIn, which lib/whatsapp/journey.ts checks before any marketing
 * send), asked again at the moment the parent sees the result.
 *
 * Signed-in parent only: the session token is in the results link the child
 * holds too, so the token alone must never be enough to consent on the
 * parent's behalf. The sign-in token's mobile has to be this session's
 * parent's mobile.
 *
 * A parent who replied STOP (whatsappOptOutAt, set by
 * server/routes/whatsappWebhook.ts on every session of that mobile at the
 * time) is never opted back in from here - on any of their sessions,
 * including ones registered after the STOP.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/middleware";
import { WHATSAPP_OPT_IN_VERSIONS } from "@/lib/consent";
import { normalizeMobile } from "@/lib/validation";

export const whatsappOptInRouter = Router();

const BODY_SCHEMA = z.object({ optIn: z.boolean() });

async function findOwnedSession(token: string, mobile: string) {
  const session = await prisma.assessmentSession.findUnique({
    where: { token },
    select: {
      id: true,
      whatsappOptIn: true,
      whatsappOptInAt: true,
      parent: { select: { mobile: true } },
    },
  });
  if (!session) return { error: 404 as const };
  if (normalizeMobile(session.parent.mobile) !== normalizeMobile(mobile)) return { error: 403 as const };
  return { session };
}

/** Any session of this mobile that replied STOP - the parent's choice, not just this session's. */
async function hasStopped(mobile: string): Promise<boolean> {
  const stopped = await prisma.assessmentSession.findFirst({
    where: { parent: { mobile: normalizeMobile(mobile) }, whatsappOptOutAt: { not: null } },
    select: { id: true },
  });
  return Boolean(stopped);
}

whatsappOptInRouter.get("/session/:token/whatsapp-opt-in", requireAuth, async (req, res) => {
  const mobile = res.locals.mobile as string;
  const found = await findOwnedSession(req.params.token as string, mobile);
  if (!found.session) {
    res.status(found.error ?? 404).json({ error: found.error === 404 ? "Session not found" : "Not this parent's session" });
    return;
  }
  res.json({ optedIn: found.session.whatsappOptIn, stopped: await hasStopped(mobile) });
});

whatsappOptInRouter.post("/session/:token/whatsapp-opt-in", requireAuth, async (req, res) => {
  const parsed = BODY_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const mobile = res.locals.mobile as string;
  const found = await findOwnedSession(req.params.token as string, mobile);
  if (!found.session) {
    res.status(found.error ?? 404).json({ error: found.error === 404 ? "Session not found" : "Not this parent's session" });
    return;
  }

  if (parsed.data.optIn) {
    if (await hasStopped(mobile)) {
      res.status(409).json({ error: "This number has asked us to stop WhatsApp offers.", stopped: true });
      return;
    }
    await prisma.assessmentSession.update({
      where: { id: found.session.id },
      data: {
        whatsappOptIn: true,
        whatsappOptInAt: new Date(),
        whatsappOptInVersion: WHATSAPP_OPT_IN_VERSIONS.results,
      },
    });
  } else {
    // Unticking withdraws consent - nothing marketing goes out after this.
    // Not a STOP: the parent can tick it again later.
    await prisma.assessmentSession.update({
      where: { id: found.session.id },
      data: { whatsappOptIn: false, whatsappOptInAt: null, whatsappOptInVersion: null },
    });
  }

  res.json({ optedIn: parsed.data.optIn, stopped: false });
});
