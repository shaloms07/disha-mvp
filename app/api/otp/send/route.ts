/**
 * Real replacement for lib/mockApi.ts's mockSendOtp. Rate-limited two ways
 * (per session, per mobile - see lib/otp.ts's constants) since this sits
 * behind public ad traffic, not just this app's own screens.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  MAX_SENDS_PER_MOBILE_WINDOW,
  MAX_SENDS_PER_SESSION_WINDOW,
  generateOtpCode,
  hashOtpCode,
  otpExpiryDate,
  sendWindowStart,
} from "@/lib/otp";
import { getOtpProvider } from "@/lib/sms/otpProvider";
import { normalizeMobile, isValidMobile } from "@/lib/validation";

const SEND_BODY_SCHEMA = z.object({
  sessionToken: z.string(),
  mobile: z.string(),
});

export async function POST(request: Request) {
  const parsed = SEND_BODY_SCHEMA.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const mobile = normalizeMobile(parsed.data.mobile);
  if (!isValidMobile(mobile)) {
    return NextResponse.json({ error: "Invalid mobile number" }, { status: 400 });
  }

  const session = await prisma.assessmentSession.findUnique({
    where: { token: parsed.data.sessionToken },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const windowStart = sendWindowStart();
  const [sessionSendCount, mobileSendCount] = await Promise.all([
    prisma.otpCode.count({ where: { sessionId: session.id, createdAt: { gte: windowStart } } }),
    prisma.otpCode.count({ where: { mobile, createdAt: { gte: windowStart } } }),
  ]);

  if (sessionSendCount >= MAX_SENDS_PER_SESSION_WINDOW || mobileSendCount >= MAX_SENDS_PER_MOBILE_WINDOW) {
    return NextResponse.json(
      { error: "Too many codes requested. Please wait a while before trying again." },
      { status: 429 },
    );
  }

  const code = generateOtpCode();
  await prisma.otpCode.create({
    data: {
      sessionId: session.id,
      mobile,
      codeHash: hashOtpCode(code, mobile),
      expiresAt: otpExpiryDate(),
    },
  });

  await getOtpProvider().send(mobile, code);

  return NextResponse.json({ success: true });
}
