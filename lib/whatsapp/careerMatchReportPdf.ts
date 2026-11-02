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
  // KNOWN ISSUE (not fixed by this round): under tsx, loading this multi-page
  // document deterministically throws ERR_PACKAGE_PATH_NOT_EXPORTED from
  // @react-pdf/textkit's top-level `import ... from "@react-pdf/hyphenate/en-us"`
  // - textkit's own import resolves that subpath via Node's CJS exports
  // algorithm instead of ESM (the package only declares an "import"
  // condition), and this happens regardless of caller. lib/pdf/SnapshotDocument.tsx's
  // simpler one-pager doesn't trigger it (no wrapped body text reaches
  // textkit's hyphenation step), which is why sendResultMessage already works
  // today. Tried and ruled out: Font.registerHyphenationCallback (too late -
  // the crash is at module load, before any of our code runs) and pre-warming
  // the exact specifier with our own import() first (fails identically - this
  // is deterministic, not a load-order race). A real fix needs changing how
  // the backend runs this module graph (e.g. patch-package on
  // @react-pdf/hyphenate's exports map, or running compiled JS instead of
  // tsx) - out of scope here. Until fixed, WHATSAPP_REPORT_PAID_TEMPLATE and
  // WHATSAPP_REFERRAL_UNLOCKED_TEMPLATE should stay unset in production.
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
