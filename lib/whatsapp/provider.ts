/**
 * WhatsApp delivery (welcome + exam link, result + PDF), behind one small
 * interface - same pattern as lib/sms/otpProvider.ts.
 *
 * WHATSAPP_PROVIDER=stub (default, and always used outside production) logs
 * to the server console instead of calling Meta - no cost, no real account
 * needed for local development.
 *
 * WHATSAPP_PROVIDER=meta sends through the WhatsApp Cloud API
 * (graph.facebook.com/<version>/<phone_number_id>/messages). Every message is
 * a pre-approved template - Meta rejects free-form business-initiated text
 * outside an open customer-service window, so there is no "plain text" send
 * path here at all.
 */

export interface WhatsAppProvider {
  /** Sends an approved template message. `components` is the Cloud API's own
   *  shape (e.g. a body component with parameter values, or a header with a
   *  document) - passed through as-is rather than re-modelled here, since it
   *  already matches exactly what Meta's template editor shows per template. */
  sendTemplate(to: string, templateName: string, components: unknown[]): Promise<void>;
  /** Uploads a file (e.g. a just-rendered PDF) and returns its Meta media id,
   *  for use in a document header component on a subsequent sendTemplate call. */
  uploadMedia(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
}

const GRAPH_API_VERSION = "v21.0";

function graphUrl(path: string): string {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`;
}

export const stubWhatsAppProvider: WhatsAppProvider = {
  async sendTemplate(to, templateName, components) {
    console.log(`[whatsapp:stub] would send template "${templateName}" to +91${to}`, JSON.stringify(components));
  },
  async uploadMedia(_buffer, filename) {
    console.log(`[whatsapp:stub] would upload media "${filename}"`);
    return "stub-media-id";
  },
};

interface MetaErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number };
}

async function metaSendTemplate(to: string, templateName: string, components: unknown[]): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN must both be set for WHATSAPP_PROVIDER=meta.");
  }

  const response = await fetch(graphUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: `91${to}`,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components,
      },
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as MetaErrorBody | null;
    throw new Error(`whatsapp send failed (${body?.error?.code ?? response.status}): ${body?.error?.message ?? "unknown error"}`);
  }
}

async function metaUploadMedia(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN must both be set for WHATSAPP_PROVIDER=meta.");
  }

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

  const response = await fetch(graphUrl(`${phoneNumberId}/media`), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as MetaErrorBody | null;
    throw new Error(`whatsapp media upload failed (${body?.error?.code ?? response.status}): ${body?.error?.message ?? "unknown error"}`);
  }

  const data = (await response.json()) as { id?: string };
  if (!data.id) throw new Error("whatsapp media upload failed: no media id in response");
  return data.id;
}

export const metaWhatsAppProvider: WhatsAppProvider = {
  sendTemplate: metaSendTemplate,
  uploadMedia: metaUploadMedia,
};

export function getWhatsAppProvider(): WhatsAppProvider {
  const configured = process.env.WHATSAPP_PROVIDER ?? "stub";
  if (process.env.NODE_ENV !== "production" && configured !== "stub") {
    // Never let a dev/local run accidentally hit the real WhatsApp account.
    return stubWhatsAppProvider;
  }
  return configured === "meta" ? metaWhatsAppProvider : stubWhatsAppProvider;
}
