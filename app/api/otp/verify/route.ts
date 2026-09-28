/**
 * Real replacement for lib/mockApi.ts's mockVerifyOtp. Checks against the
 * most recent unconsumed, unexpired code sent for this session (lib/otp.ts's
 * hashOtpCode - plaintext is never stored, so this hashes the submitted code
 * with the same mobile used at send time and compares).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { MAX_VERIFY_ATTEMPTS, hashOtpCode } from "@/lib/otp";

const VERIFY_BODY_SCHEMA = z.object({
  sessionToken: z.string(),
  code: z.string(),
});

export async function POST(request: Request) {
  const parsed = VERIFY_BODY_SCHEMA.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const session = await prisma.assessmentSession.findUnique({
    where: { token: parsed.data.sessionToken },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const otpCode = await prisma.otpCode.findFirst({
    where: { sessionId: session.id, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otpCode) {
    return NextResponse.json({ verified: false, error: "Code expired - request a new one." });
  }
  if (otpCode.attempts >= MAX_VERIFY_ATTEMPTS) {
    return NextResponse.json({ verified: false, error: "Too many attempts - request a new code." });
  }

  const matches = otpCode.codeHash === hashOtpCode(parsed.data.code, otpCode.mobile);

  if (!matches) {
    await prisma.otpCode.update({ where: { id: otpCode.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ verified: false });
  }

  await prisma.$transaction([
    prisma.otpCode.update({ where: { id: otpCode.id }, data: { consumedAt: new Date() } }),
    prisma.assessmentSession.update({ where: { id: session.id }, data: { otpVerified: true } }),
  ]);

  return NextResponse.json({ verified: true });
}
