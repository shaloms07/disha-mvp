import { Router } from "express";
import { requireAuth } from "@/lib/auth/middleware";
import { listWardsForMobile } from "@/lib/session/wards";

export const meRouter = Router();

meRouter.get("/me/wards", requireAuth, async (_req, res) => {
  const wards = await listWardsForMobile(res.locals.mobile as string);
  res.json({ wards });
});
