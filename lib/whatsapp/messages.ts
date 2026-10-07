/**
 * The two WhatsApp sends this phase wires up (server/API.md): a welcome
 * message with the exam link right after registration, and the result PDF
 * once the RIASEC test completes. Both are fire-and-forget from the caller's
 * point of view - a WhatsApp failure never blocks registration or scoring,
 * it just gets logged (console.error) for now, same philosophy as
 * server/routes/auth.ts's OTP send.
 *
 * Template names/variable order are configurable via env, since the actual
 * approved template (submitted in Meta's WhatsApp Manager) decides them, not
 * this code - see .env.example.
 */

import { getWhatsAppProvider } from "@/lib/whatsapp/provider";
import { buildSnapshotDocument } from "@/lib/pdf/SnapshotDocument";
import type { RiasecType } from "@/types";

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL ?? "http://localhost:3000";

export function examLink(sessionToken: string): string {
  return `${FRONTEND_BASE_URL}/resume?t=${sessionToken}`;
}

export async function sendExamLinkMessage(params: {
  parentMobile: string;
  parentName: string;
  childName: string;
  sessionToken: string;
}): Promise<void> {
  const templateName = process.env.WHATSAPP_EXAM_LINK_TEMPLATE ?? "exam_link";
  try {
    await getWhatsAppProvider().sendTemplate(params.parentMobile, templateName, [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.parentName },
          { type: "text", text: params.childName },
          { type: "text", text: examLink(params.sessionToken) },
        ],
      },
    ]);
  } catch (error) {
    console.error(`[whatsapp] exam link send failed for ${params.sessionToken}`, error);
  }
}

export async function sendResultMessage(params: {
  parentMobile: string;
  parentName: string;
  childName: string;
  scores: Record<RiasecType, number>;
}): Promise<void> {
  const templateName = process.env.WHATSAPP_RESULT_TEMPLATE ?? "result_ready";
  const provider = getWhatsAppProvider();
  try {
    // Dynamic import for the same reason SnapshotDocument.tsx dynamically
    // imports react-pdf itself - see its file comment.
    const { pdf } = await import("@react-pdf/renderer");
    const doc = await buildSnapshotDocument({ childName: params.childName, scores: params.scores });

    // react-pdf's Node toBuffer() actually returns a readable stream, not a
    // Buffer, despite the name - collected into one here.
    const stream = await pdf(doc).toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const pdfBuffer = Buffer.concat(chunks);

    const mediaId = await provider.uploadMedia(pdfBuffer, "my-life-coach-snapshot.pdf", "application/pdf");

    await provider.sendTemplate(params.parentMobile, templateName, [
      {
        type: "header",
        parameters: [{ type: "document", document: { id: mediaId, filename: "my-life-coach-snapshot.pdf" } }],
      },
      {
        type: "body",
        parameters: [
          { type: "text", text: params.parentName },
          { type: "text", text: params.childName },
        ],
      },
    ]);
  } catch (error) {
    console.error("[whatsapp] result send failed", error);
  }
}
