/**
 * Real replacements for lib/mockApi.ts's mockSendOtp/mockVerifyOtp. Ported
 * from the former app/api/otp/send and app/api/otp/verify Route Handlers —
 * same logic (rate-limiting, hashed codes, attempt limits), Express glue.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  MAX_SENDS_PER_MOBILE_WINDOW,
  MAX_SENDS_PER_SESSION_WINDOW,
  MAX_VERIFY_ATTEMPTS,
  generateOtpCode,
  hashOtpCode,
  otpExpiryDate,
  sendWindowStart,
} from "@/lib/otp";
import { getOtpProvider } from "@/lib/sms/otpProvider";
import { normalizeMobile, isValidMobile } from "@/lib/validation";
import { authTokenExpiryDate, generateAuthToken, hashAuthToken } from "@/lib/auth/token";

const SEND_BODY_SCHEMA = z.object({
  sessionToken: z.string(),
  mobile: z.string(),
});

const VERIFY_BODY_SCHEMA = z.object({
  sessionToken: z.string(),
  code: z.string(),
});

export const otpRouter = Router();

otpRouter.post("/otp/send", async (req, res) => {
  const parsed = SEND_BODY_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const mobile = normalizeMobile(parsed.data.mobile);
  if (!isValidMobile(mobile)) {
    res.status(400).json({ error: "Invalid mobile number" });
    return;
  }

  const session = await prisma.assessmentSession.findUnique({
    where: { token: parsed.data.sessionToken },
    select: { id: true },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const windowStart = sendWindowStart();
  const [sessionSendCount, mobileSendCount] = await Promise.all([
    prisma.otpCode.count({
      where: { sessionId: session.id, purpose: "SESSION_VERIFY", createdAt: { gte: windowStart } },
    }),
    prisma.otpCode.count({
      where: { mobile, purpose: "SESSION_VERIFY", createdAt: { gte: windowStart } },
    }),
  ]);

  if (sessionSendCount >= MAX_SENDS_PER_SESSION_WINDOW || mobileSendCount >= MAX_SENDS_PER_MOBILE_WINDOW) {
    res.status(429).json({ error: "Too many codes requested. Please wait a while before trying again." });
    return;
  }

  const code = generateOtpCode();
  await prisma.otpCode.create({
    data: {
      sessionId: session.id,
      mobile,
      purpose: "SESSION_VERIFY",
      codeHash: hashOtpCode(code, mobile),
      expiresAt: otpExpiryDate(),
    },
  });

  await getOtpProvider().send(mobile, code);

  res.json({ success: true });
});

otpRouter.post("/otp/verify", async (req, res) => {
  const parsed = VERIFY_BODY_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const session = await prisma.assessmentSession.findUnique({
    where: { token: parsed.data.sessionToken },
    select: { id: true, parent: { select: { name: true, mobile: true } } },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const otpCode = await prisma.otpCode.findFirst({
    where: {
      sessionId: session.id,
      purpose: "SESSION_VERIFY",
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpCode) {
    res.json({ verified: false, error: "Code expired - request a new one." });
    return;
  }
  if (otpCode.attempts >= MAX_VERIFY_ATTEMPTS) {
    res.json({ verified: false, error: "Too many attempts - request a new code." });
    return;
  }

  const matches = otpCode.codeHash === hashOtpCode(parsed.data.code, otpCode.mobile);

  if (!matches) {
    await prisma.otpCode.update({ where: { id: otpCode.id }, data: { attempts: { increment: 1 } } });
    res.json({ verified: false });
    return;
  }

  // Verifying a mobile number here proves exactly what a sign-in OTP would -
  // so this also signs the parent in, the same as POST /auth/otp/verify,
  // rather than making them separately visit /signin right after.
  const authToken = generateAuthToken();
  await prisma.$transaction([
    prisma.otpCode.update({ where: { id: otpCode.id }, data: { consumedAt: new Date() } }),
    prisma.assessmentSession.update({ where: { id: session.id }, data: { otpVerified: true } }),
    prisma.authSession.create({
      data: { mobile: otpCode.mobile, tokenHash: hashAuthToken(authToken), expiresAt: authTokenExpiryDate() },
    }),
  ]);

  res.json({
    verified: true,
    authToken,
    parentName: session.parent.name,
    parentMobile: session.parent.mobile,
  });
});
