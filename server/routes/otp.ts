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
    prisma.otpCode.count({ where: { sessionId: session.id, createdAt: { gte: windowStart } } }),
    prisma.otpCode.count({ where: { mobile, createdAt: { gte: windowStart } } }),
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
    select: { id: true },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const otpCode = await prisma.otpCode.findFirst({
    where: { sessionId: session.id, consumedAt: null, expiresAt: { gt: new Date() } },
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

  await prisma.$transaction([
    prisma.otpCode.update({ where: { id: otpCode.id }, data: { consumedAt: new Date() } }),
    prisma.assessmentSession.update({ where: { id: session.id }, data: { otpVerified: true } }),
  ]);

  res.json({ verified: true });
});
