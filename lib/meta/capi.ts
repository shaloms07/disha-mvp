/**
 * Server-side half of ad-funnel tracking (Meta Conversions API) - the
 * durable twin to the browser Pixel (lib/meta/pixel.ts), since a blocked or
 * ad-blocked browser never fires its own copy. Every event carries only a
 * SHA-256 hash of the parent's mobile number for matching - never a name,
 * never the child's answers or scores. Matches the browser Pixel's event_id
 * for CompleteRegistration specifically, so Meta counts that pair once.
 *
 * Silently a no-op if META_PIXEL_ID / META_CAPI_ACCESS_TOKEN aren't set, or
 * outside production - same "never send from a dev/local run" guard as
 * lib/whatsapp/provider.ts and lib/sms/otpProvider.ts.
 */

import { createHash } from "node:crypto";

const GRAPH_API_VERSION = "v21.0";

function hashMobile(mobile: string): string {
  return createHash("sha256").update(`91${mobile}`).digest("hex");
}

export interface CapiEventParams {
  eventName: string;
  /** Parent's mobile (unhashed) - hashed here, never sent or logged in the clear. */
  mobile?: string;
  /** Shared with the browser Pixel's call for the same conversion, so Meta dedupes. */
  eventId?: string;
  customData?: Record<string, unknown>;
  clientIp?: string;
  userAgent?: string;
}

export async function sendCapiEvent(params: CapiEventParams): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (process.env.NODE_ENV !== "production") {
    console.log(`[meta-capi:stub] would send "${params.eventName}"`, params.customData ?? {});
    return;
  }
  if (!pixelId || !accessToken) return;

  const userData: Record<string, unknown> = {};
  if (params.mobile) userData.ph = [hashMobile(params.mobile)];
  if (params.clientIp) userData.client_ip_address = params.clientIp;
  if (params.userAgent) userData.client_user_agent = params.userAgent;

  // Set only while running the Test Events tool in Events Manager (Settings ->
  // Conversions API -> Test Events gives you this code) - remove it from
  // api.env once testing is done, or every real event gets flagged as a test
  // and never counts toward actual ad delivery/optimisation.
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE;

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: params.eventName,
              event_time: Math.floor(Date.now() / 1000),
              event_id: params.eventId,
              action_source: "website",
              user_data: userData,
              custom_data: params.customData,
            },
          ],
          ...(testEventCode ? { test_event_code: testEventCode } : {}),
        }),
      },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[meta-capi] ${params.eventName} failed (${response.status}): ${body}`);
    }
  } catch (error) {
    console.error(`[meta-capi] ${params.eventName} request failed`, error);
  }
}
