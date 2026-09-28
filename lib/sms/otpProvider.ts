/**
 * OTP delivery, behind one small interface so swapping providers (or running
 * against the stub in dev) never touches app/api/otp/send/route.ts.
 *
 * OTP_PROVIDER=stub (default, and always used outside production) logs the
 * code to the server console instead of sending a real SMS — no cost, no
 * vendor account needed for local development.
 *
 * OTP_PROVIDER=smsgw sends through web.smsgw.in's HTTP(S) API (see their
 * "End User Manual for HTTP(S)/XML/JSON API"). Its httpapi.jsp endpoint is a
 * plain GET with username/password/to/from/text/pe_id/template_id as query
 * params, and returns JSON when responsetype=json is set — see
 * sendViaSmsgw() below for the exact shape.
 */

export interface OtpProvider {
  send(mobile: string, code: string): Promise<void>;
}

export const stubOtpProvider: OtpProvider = {
  async send(mobile, code) {
    console.log(`[otp:stub] would send ${code} to +91${mobile}`);
  },
};

const SMSGW_BASE_URL = "https://web.smsgw.in/smsapi/httpapi.jsp";

/** The vendor's two response shapes (JSON, since responsetype=json is requested below). */
interface SmsgwSuccess {
  data: { ackid: string; msgid: string };
}
interface SmsgwError {
  Error: { ErrorCode: string; ErrorDesc: string };
}

function parseSmsgwResponse(raw: string): SmsgwSuccess | SmsgwError | null {
  try {
    return JSON.parse(raw) as SmsgwSuccess | SmsgwError;
  } catch {
    // responsetype=json wasn't honoured for some reason - fall back to the
    // vendor's documented default XML shape rather than failing outright.
    const ackid = raw.match(/<ackid>([^<]+)<\/ackid>/)?.[1];
    if (ackid) return { data: { ackid, msgid: raw.match(/<msgid>([^<]+)<\/msgid>/)?.[1] ?? "" } };
    const errorCode = raw.match(/<ErrorCode>([^<]+)<\/ErrorCode>/)?.[1];
    const errorDesc = raw.match(/<ErrorDesc>([^<]+)<\/ErrorDesc>/)?.[1];
    if (errorCode) return { Error: { ErrorCode: errorCode, ErrorDesc: errorDesc ?? "" } };
    return null;
  }
}

async function sendViaSmsgw(mobile: string, code: string): Promise<void> {
  const username = process.env.SMSGW_USERNAME;
  const password = process.env.SMSGW_PASSWORD;
  const senderId = process.env.SMSGW_SENDER_ID;
  const peId = process.env.SMSGW_PE_ID;
  const templateId = process.env.SMSGW_TEMPLATE_ID;

  if (!username || !password || !senderId || !peId || !templateId) {
    throw new Error(
      "SMSGW_USERNAME / SMSGW_PASSWORD / SMSGW_SENDER_ID / SMSGW_PE_ID / SMSGW_TEMPLATE_ID " +
        "must all be set for OTP_PROVIDER=smsgw.",
    );
  }

  // This text must match the DLT-approved template registered under
  // SMSGW_TEMPLATE_ID *exactly* (only the {#var#} slot may differ) or the
  // vendor's DLT scrubber will silently drop the message. Configurable via
  // env since the approved wording is decided at DLT registration time, not
  // something this code can know in advance.
  const text = process.env.SMSGW_OTP_TEMPLATE?.replace("{code}", code) ??
    `Your DISHA verification code is ${code}. Valid for 10 minutes.`;

  const params = new URLSearchParams({
    username,
    password,
    to: mobile,
    from: senderId,
    text,
    pe_id: peId,
    template_id: templateId,
    responsetype: "json",
  });

  let response: Response;
  try {
    response = await fetch(`${SMSGW_BASE_URL}?${params.toString()}`);
  } catch (error) {
    // Never include `params` (carries username/password) in a thrown/logged error.
    throw new Error(`smsgw request failed: ${error instanceof Error ? error.message : "network error"}`);
  }

  if (!response.ok) {
    throw new Error(`smsgw request failed: HTTP ${response.status}`);
  }

  const body = parseSmsgwResponse(await response.text());
  if (!body || "Error" in body) {
    const errorCode = body && "Error" in body ? body.Error.ErrorCode : "?";
    const errorDesc = body && "Error" in body ? body.Error.ErrorDesc : "unrecognised response";
    throw new Error(`smsgw send failed (${errorCode}): ${errorDesc}`);
  }
}

export const smsgwOtpProvider: OtpProvider = {
  send: sendViaSmsgw,
};

export function getOtpProvider(): OtpProvider {
  const configured = process.env.OTP_PROVIDER ?? "stub";
  if (process.env.NODE_ENV !== "production" && configured !== "stub") {
    // Never let a dev/local run accidentally hit a real SMS vendor.
    return stubOtpProvider;
  }
  return configured === "smsgw" ? smsgwOtpProvider : stubOtpProvider;
}
