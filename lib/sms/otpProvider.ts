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

interface SmsgwParsed {
  msgid?: string;
  errorCode?: string;
  errorDesc?: string;
}

/**
 * The vendor's success signal is a `msgid` (confirmed against a working
 * reference integration for this same vendor) - `ackid` may or may not be
 * present alongside it, so it is never required for a send to count as
 * successful. Handles both the requested JSON shape and the vendor's XML
 * default, in case responsetype=json isn't honoured for some reason.
 */
function parseSmsgwResponse(raw: string): SmsgwParsed {
  try {
    const json = JSON.parse(raw) as {
      data?: { msgid?: string };
      msgid?: string;
      Error?: { ErrorCode?: string; ErrorDesc?: string };
    };
    return {
      msgid: json.data?.msgid ?? json.msgid,
      errorCode: json.Error?.ErrorCode,
      errorDesc: json.Error?.ErrorDesc,
    };
  } catch {
    return {
      msgid: raw.match(/<msgid>([^<]+)<\/msgid>/)?.[1],
      errorCode: raw.match(/<ErrorCode>([^<]+)<\/ErrorCode>/)?.[1],
      errorDesc: raw.match(/<ErrorDesc>([^<]+)<\/ErrorDesc>/)?.[1],
    };
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
  const text = process.env.SMSGW_OTP_TEMPLATE?.replace(/\{otp\}|\{code\}/, code) ??
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

  const { msgid, errorCode, errorDesc } = parseSmsgwResponse(await response.text());
  if (!msgid) {
    throw new Error(`smsgw send failed (${errorCode ?? "?"}): ${errorDesc ?? "unrecognised response"}`);
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
