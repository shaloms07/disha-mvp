/**
 * Stage 2 scratch test — run with `npm run mockapi`.
 *
 * Calls every mock API function, times it, prints what came back, and checks
 * the file itself contains no network calls.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEMO_OTP,
  MOCK_DELAYS,
  mockCheckout,
  mockRegisterSession,
  mockSendOtp,
  mockVerifyOtp,
} from "../lib/mockApi";

let failures = 0;

function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function heading(text: string) {
  const rule = "=".repeat(72);
  console.log(`\n${rule}\n${text}\n${rule}`);
}

/** Run an async call and report how long it actually took */
async function timed<T>(
  label: string,
  expectedMs: number,
  call: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  const result = await call();
  const elapsed = Date.now() - started;

  console.log(`\n  ${label}`);
  console.log(`    expected delay  ~${expectedMs}ms`);
  console.log(`    actual delay     ${elapsed}ms`);
  console.log(`    resolved with    ${JSON.stringify(result)}`);

  // Generous upper bound so a slow machine doesn't produce a false failure.
  check(
    `${label} waited at least ${expectedMs}ms and resolved promptly`,
    elapsed >= expectedMs && elapsed < expectedMs + 400,
    `${elapsed}ms`,
  );
  return result;
}

async function main() {
  heading("1. No network calls in lib/mockApi.ts");

  const source = readFileSync(
    join(import.meta.dirname, "..", "lib", "mockApi.ts"),
    "utf8",
  );
  const bannedApis = [
    "fetch(",
    "XMLHttpRequest",
    "axios",
    "WebSocket",
    "EventSource",
    "navigator.sendBeacon",
    "node:http",
    "require(",
  ];
  const found = bannedApis.filter((api) => source.includes(api));
  check(
    `source is free of network APIs (${bannedApis.length} patterns checked)`,
    found.length === 0,
    found.join(", "),
  );
  check(
    "delays come from setTimeout, not a real request",
    source.includes("setTimeout"),
  );

  heading("2. mockRegisterSession");

  const registration = {
    parentName: "Anita Sharma",
    parentMobile: "9876543210",
    childName: "Rohan Sharma",
    childClass: "Class 10",
  };
  const reg = await timed("mockRegisterSession(...)", MOCK_DELAYS.registerSession, () =>
    mockRegisterSession(registration),
  );
  check(
    `returns a session token (${reg.sessionToken})`,
    typeof reg.sessionToken === "string" && reg.sessionToken.startsWith("dsh_"),
  );

  const second = await mockRegisterSession(registration);
  check(
    `two registrations produce different tokens (${reg.sessionToken} vs ${second.sessionToken})`,
    reg.sessionToken !== second.sessionToken,
  );

  heading("3. mockSendOtp");

  const sent = await timed("mockSendOtp('9876543210')", MOCK_DELAYS.sendOtp, () =>
    mockSendOtp("9876543210"),
  );
  check("always resolves success (no SMS sent)", sent.success === true);

  heading("4. mockVerifyOtp");

  const withDemoCode = await timed(
    `mockVerifyOtp('${DEMO_OTP}')  — the demo code`,
    MOCK_DELAYS.verifyOtp,
    () => mockVerifyOtp(DEMO_OTP),
  );
  check(`demo code '${DEMO_OTP}' verifies`, withDemoCode.verified);

  const otherCodes = ["0000", "5309", "9999"];
  for (const code of otherCodes) {
    const res = await mockVerifyOtp(code);
    console.log(`    mockVerifyOtp('${code}') -> ${JSON.stringify(res)}`);
    check(`any 4-digit code verifies — '${code}'`, res.verified);
  }

  const badCodes = ["123", "12345", "abcd", "", "12 4"];
  for (const code of badCodes) {
    const res = await mockVerifyOtp(code);
    console.log(`    mockVerifyOtp('${code}') -> ${JSON.stringify(res)}`);
    check(`non 4-digit code is rejected — '${code}'`, !res.verified);
  }

  heading("5. mockCheckout");

  const tiers = { detailedReport: true, roadmap: true, consultation: false };
  const order = await timed(
    "mockCheckout({ report + roadmap })",
    MOCK_DELAYS.checkout,
    () => mockCheckout(tiers),
  );
  check("always succeeds (no money moves)", order.success === true);
  check(
    `returns an order id (${order.orderId})`,
    /^DISHA-\d{8}-[A-Z2-9]{5}$/.test(order.orderId),
  );

  const order2 = await mockCheckout(tiers);
  check(
    `two checkouts produce different order ids (${order.orderId} vs ${order2.orderId})`,
    order.orderId !== order2.orderId,
  );

  const rule = "=".repeat(72);
  console.log(
    `\n${rule}\n${
      failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`
    }\n${rule}`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
