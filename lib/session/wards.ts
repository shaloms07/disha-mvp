/**
 * Shared by GET /me/wards and POST /auth/otp/verify (which returns the
 * wards list immediately on sign-in, saving the frontend a second round
 * trip). "Wards" = every AssessmentSession whose Parent.mobile matches the
 * signed-in number, across every Parent row with that number - Parent.mobile
 * is intentionally not unique (see server/routes/register.ts), so a single
 * real parent can be spread across several Parent rows.
 */

import { prisma } from "@/lib/db";
import { deriveExposedStatus, type ExposedSessionStatus } from "@/lib/session/status";
import { TOTAL_QUESTIONS } from "@/lib/scoring";

export interface WardSummary {
  sessionToken: string;
  childName: string;
  childClass: string;
  schoolCode?: string;
  status: ExposedSessionStatus;
  answeredCount: number;
  totalQuestions: number;
  completedAt?: string;
  lastActivityAt: string;
  createdAt: string;
  scores?: Record<string, number>;
}

export async function listWardsForMobile(mobile: string): Promise<WardSummary[]> {
  const sessions = await prisma.assessmentSession.findMany({
    where: { parent: { mobile } },
    include: { child: true },
    orderBy: { createdAt: "desc" },
  });

  return sessions.map((session) => ({
    sessionToken: session.token,
    childName: session.child.name,
    childClass: session.child.grade,
    schoolCode: session.schoolCode ?? undefined,
    status: deriveExposedStatus(session),
    answeredCount: session.answeredCount,
    totalQuestions: TOTAL_QUESTIONS,
    completedAt: session.completedAt?.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    scores: (session.scores as Record<string, number> | null) ?? undefined,
  }));
}
