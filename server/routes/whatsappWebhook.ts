/**
 * Receives WhatsApp Cloud API callbacks - delivery/read/failed status
 * updates and incoming messages. This is the only way to see what actually
 * happens to a sent message after the initial "accepted" response; the
 * Cloud API has no GET endpoint to poll a message's later status.
 *
 * Currently just logs the full payload (temporary, for diagnosing the
 * current "accepted but never delivered" investigation) - not yet wired to
 * update anything in the database.
 */

import { Router } from "express";

export const whatsappWebhookRouter = Router();

/** Meta's one-time verification handshake when you save the webhook config. */
whatsappWebhookRouter.get("/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

whatsappWebhookRouter.post("/whatsapp/webhook", (req, res) => {
  console.log("[whatsapp:webhook]", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});
