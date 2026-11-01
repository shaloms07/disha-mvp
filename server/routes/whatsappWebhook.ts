/**
 * Receives WhatsApp Cloud API callbacks - delivery/read/failed status
 * updates for messages this backend sent (lib/whatsapp/journey.ts's
 * WhatsAppMessage ledger), and incoming replies, specifically an opt-out
 * ("Stop promotions"). This is the only way to see what happens to a sent
 * message after the initial "accepted" response - the Cloud API has no GET
 * endpoint to poll a message's later status.
 *
 * Mounted in server/index.ts with express.raw() BEFORE the app-wide
 * express.json(), same reason as server/routes/razorpayWebhook.ts: Meta's
 * X-Hub-Signature-256 is computed over the exact raw request bytes.
 */

import type { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { normalizeMobile } from "@/lib/validation";

/** Meta's one-time verification handshake when you save the webhook config. */
export function whatsappWebhookVerifyHandler(req: Request, res: Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

const META_STATUS_TO_DB = {
  sent: "SENT",
  delivered: "DELIVERED",
  read: "READ",
  failed: "FAILED",
} as const;

interface WhatsAppStatusEntry {
  id?: string;
  status?: keyof typeof META_STATUS_TO_DB;
}

interface WhatsAppInboundMessage {
  from?: string;
  text?: { body?: string };
  button?: { text?: string };
}

interface WhatsAppWebhookPayload {
  entry?: {
    changes?: {
      value?: {
        statuses?: WhatsAppStatusEntry[];
        messages?: WhatsAppInboundMessage[];
      };
    }[];
  }[];
}

async function handleStatuses(statuses: WhatsAppStatusEntry[]): Promise<void> {
  for (const status of statuses) {
    if (!status.id || !status.status) continue;
    const dbStatus = META_STATUS_TO_DB[status.status];
    if (!dbStatus) continue;
    await prisma.whatsAppMessage
      .updateMany({ where: { metaMessageId: status.id }, data: { status: dbStatus } })
      .catch((error) => console.error("[whatsapp:webhook] failed to update message status", error));
  }
}

const STOP_PROMOTIONS_PATTERN = /stop promotions?/i;

async function handleInboundMessages(messages: WhatsAppInboundMessage[]): Promise<void> {
  for (const message of messages) {
    const text = message.text?.body ?? message.button?.text ?? "";
    if (!message.from || !STOP_PROMOTIONS_PATTERN.test(text)) continue;

    const mobile = normalizeMobile(message.from);
    await prisma.assessmentSession
      .updateMany({
        where: { parent: { mobile }, whatsappOptOutAt: null },
        data: { whatsappOptOutAt: new Date() },
      })
      .catch((error) => console.error("[whatsapp:webhook] failed to record opt-out", error));
  }
}

export async function whatsappWebhookEventHandler(req: Request, res: Response): Promise<void> {
  // Always reply 200 quickly, even on a bad signature - Meta retries
  // aggressively on anything else, and a bad signature is never fixed by a retry.
  res.sendStatus(200);

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const signatureHeader = req.headers["x-hub-signature-256"];
  const rawBody = req.body as Buffer;

  if (!appSecret || typeof signatureHeader !== "string") return;

  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  if (!timingSafeEqualStrings(expected, signatureHeader)) {
    console.error("[whatsapp:webhook] signature mismatch - ignoring payload");
    return;
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as WhatsAppWebhookPayload;
  } catch {
    return;
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (value?.statuses?.length) await handleStatuses(value.statuses);
      if (value?.messages?.length) await handleInboundMessages(value.messages);
    }
  }
}
