/**
 * GET /session/:token/career-summary - the results-ready page's career
 * summary (lib/careerSummary.ts): how many careers matched and in which
 * fields, never which careers. Built here rather than in the browser so an
 * unpaid family's page receives only the counts.
 *
 * A session whose plan already includes the Deep-Dive report (level 2+,
 * lib/testModules.ts's hasDeepDive) gets { paid: true } - it sees its full
 * report instead.
 */

import { Router } from "express";
import { prisma } from "@/lib/db";
import { buildCareerSummaryResponse } from "@/lib/careerSummary";
import { RIASEC_TYPES, type RiasecType } from "@/types";

export const careerSummaryRouter = Router();

function isScores(value: unknown): value is Record<RiasecType, number> {
  return (
    typeof value === "object" &&
    value !== null &&
    RIASEC_TYPES.every((type) => typeof (value as Record<string, unknown>)[type] === "number")
  );
}

careerSummaryRouter.get("/session/:token/career-summary", async (req, res) => {
  const session = await prisma.assessmentSession.findUnique({
    where: { token: req.params.token },
    select: { scores: true, purchasedTierLevel: true },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (!isScores(session.scores)) {
    res.status(409).json({ error: "The interest test isn't finished yet." });
    return;
  }

  // purchasedTierLevel is access (a paid plan or a referral unlock)
  const paid = (session.purchasedTierLevel ?? 0) >= 2;
  res.json(buildCareerSummaryResponse({ paid, scores: session.scores }));
});
