/**
 * Renders the Tier 1 "Career Match Report" PDF (lib/pdf/InterestReportDocument.tsx)
 * and uploads it to WhatsApp, for the two moments a parent gets it for free or
 * by paying: a referral unlock (server/routes/otp.ts) and an actual ₹299
 * payment (lib/checkout/markOrderPaid.ts). Same dynamic-import-and-stream
 * pattern as lib/whatsapp/messages.ts's sendResultMessage.
 */

import type { RiasecType } from "@/types";
import type { WhatsAppProvider } from "@/lib/whatsapp/provider";

export async function uploadCareerMatchReportPdf(
  provider: WhatsAppProvider,
  params: { childName: string; orderId?: string; scores: Record<RiasecType, number> },
): Promise<string> {
  // Loading this multi-page document used to throw ERR_PACKAGE_PATH_NOT_EXPORTED
  // under tsx, from @react-pdf/textkit's top-level `import ... from
  // "@react-pdf/hyphenate/en-us"` - that package's exports map only declared
  // an "import" condition, so tsx's CJS/ESM interop resolved the subpath via
  // Node's CJS exports algorithm and failed outright. Fixed by
  // patches/@react-pdf+hyphenate+0.1.0.patch (adds a "require" condition
  // pointing at the same file - safe because Node 22+ can require() an ESM
  // module directly), applied automatically by the "postinstall" script.
  const [{ pdf }, { InterestReportDocument }, { buildInterestReportData }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/lib/pdf/InterestReportDocument"),
    import("@/lib/pdf/interestReportData"),
  ]);

  const data = buildInterestReportData({
    childName: params.childName,
    orderId: params.orderId,
    scores: params.scores,
  });

  // react-pdf's Node toBuffer() actually returns a readable stream, not a
  // Buffer, despite the name - collected into one here (same as sendResultMessage).
  const stream = await pdf(InterestReportDocument({ data })).toBuffer();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const pdfBuffer = Buffer.concat(chunks);

  return provider.uploadMedia(pdfBuffer, "my-life-coach-career-match-report.pdf", "application/pdf");
}
