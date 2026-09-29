/**
 * Sign-in for an existing parent, independent of any single AssessmentSession
 * token - lets someone who closed the tab mid-test (or on a new device) come
 * back and see/resume every ward on their number. See server/API.md.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  MAX_SENDS_PER_MOBILE_WINDOW,
  MAX_VERIFY_ATTEMPTS,
  generateOtpCode,
  hashOtpCode,
  otpExpiryDate,
  sendWindowStart,
} from "@/lib/otp";
import { getOtpProvider } from "@/lib/sms/otpProvider";
import { normalizeMobile, isValidMobile } from "@/lib/validation";
import { requireAuth } from "@/lib/auth/middleware";
import { authTokenExpiryDate, generateAuthToken, hashAuthToken } from "@/lib/auth/token";
import { listWardsForMobile } from "@/lib/session/wards";

const SEND_BODY_SCHEMA = z.object({ mobile: z.string() });
const VERIFY_BODY_SCHEMA = z.object({ mobile: z.string(), code: z.string() });

export const authRouter = Router();

authRouter.post("/auth/otp/send", async (req, res) => {
  const parsed = SEND_BODY_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const mobile = normalizeMobile(parsed.data.mobile);

  // Always the same success-shaped response, whether or not this number is
  // registered, is rate-limited, or anything else - never a signal an
  // attacker (or a nosy ex) can use to enumerate who has an account here.
  if (isValidMobile(mobile)) {
    const parent = await prisma.parent.findFirst({ where: { mobile } });
    if (parent) {
      const windowStart = sendWindowStart();
      const sendCount = await prisma.otpCode.count({
        where: { mobile, purpose: "SIGN_IN", createdAt: { gte: windowStart } },
      });

      if (sendCount < MAX_SENDS_PER_MOBILE_WINDOW) {
        const code = generateOtpCode();
        await prisma.otpCode.create({
          data: {
            mobile,
            purpose: "SIGN_IN",
            codeHash: hashOtpCode(code, mobile),
            expiresAt: otpExpiryDate(),
          },
        });
        await getOtpProvider().send(mobile, code).catch((error: unknown) => {
          console.error("[auth] otp send failed", error);
        });
      }
    }
  }

  res.json({ success: true });
});

authRouter.post("/auth/otp/verify", async (req, res) => {
  const parsed = VERIFY_BODY_SCHEMA.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const mobile = normalizeMobile(parsed.data.mobile);

  const otpCode = await prisma.otpCode.findFirst({
    where: { mobile, purpose: "SIGN_IN", consumedAt: null, expiresAt: { gt: new Date() } },
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

  const matches = otpCode.codeHash === hashOtpCode(parsed.data.code, mobile);
  if (!matches) {
    await prisma.otpCode.update({ where: { id: otpCode.id }, data: { attempts: { increment: 1 } } });
    res.json({ verified: false });
    return;
  }

  const token = generateAuthToken();
  await prisma.$transaction([
    prisma.otpCode.update({ where: { id: otpCode.id }, data: { consumedAt: new Date() } }),
    prisma.authSession.create({
      data: { mobile, tokenHash: hashAuthToken(token), expiresAt: authTokenExpiryDate() },
    }),
  ]);

  const wards = await listWardsForMobile(mobile);
  res.json({ verified: true, token, wards });
});

authRouter.post("/auth/logout", requireAuth, async (_req, res) => {
  await prisma.authSession.update({
    where: { id: res.locals.authSessionId as string },
    data: { revokedAt: new Date() },
  });
  res.json({ success: true });
});
