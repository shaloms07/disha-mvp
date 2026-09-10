/**
 * Stage 5 end-to-end flow check — run with `npm run flow`.
 *
 * Drives the whole funnel the way the screens do: the same validation, the same
 * mock API calls, the same scoring, matching and pricing functions, in the same
 * order, against a session object shaped like SessionContext's.
 *
 * This proves the data flow start to finish. It does NOT exercise the DOM —
 * rendering, focus and layout still need a real browser pass.
 */

import { mockCheckout, mockRegisterSession, mockSendOtp, mockVerifyOtp } from "../lib/mockApi";
import { PERSONAS, buildResponses } from "../lib/personas";
import { getHollandCode, isTestComplete, scoreResponses } from "../lib/scoring";
import { getTopMatches, matchPercent } from "../lib/matching";
import { getHeadline } from "../lib/interpretation";
import { calculateTotal, formatInr, tiersForLevel } from "../lib/pricing";
import { hasErrors, validateRegistration } from "../lib/validation";
import type { SessionState } from "../types";

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) console.log(`    PASS  ${label}`);
  else {
    failures++;
    console.log(`    FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const EMPTY: SessionState = {
  parentName: "",
  parentMobile: "",
  childName: "",
  childClass: "",
  consentGiven: false,
  otpVerified: false,
  responses: {},
  selectedTiers: { detailedReport: false, roadmap: false, consultation: false },
};

async function runFlow(personaIndex: number, tierLevel: 1 | 2 | 3) {
  const persona = PERSONAS[personaIndex];
  let session: SessionState = { ...EMPTY };
  const patch = (p: Partial<SessionState>) => {
    session = { ...session, ...p };
  };

  console.log(`\n  ${persona.childName} (${persona.childClass}) — tier ${tierLevel}`);

  // ---- /register
  const input = {
    parentName: persona.parentName,
    parentMobile: persona.parentMobile,
    childName: persona.childName,
    childClass: persona.childClass,
  };
  check("registration validates", !hasErrors(validateRegistration(input)));
  const { sessionToken } = await mockRegisterSession(input);
  patch({ ...input, sessionToken });
  check(`session token issued (${sessionToken})`, sessionToken.startsWith("dsh_"));

  // ---- /link
  check("link screen has a token to show", Boolean(session.sessionToken));

  // ---- /resume
  patch({ consentGiven: true });
  const sent = await mockSendOtp(session.parentMobile);
  check("OTP 'sent'", sent.success);
  const { verified } = await mockVerifyOtp("1234");
  patch({ otpVerified: verified });
  check("OTP verified", session.otpVerified);
  check(
    "test gate open (consent AND otp)",
    session.consentGiven && session.otpVerified,
  );

  // ---- /test, one batch of 10 at a time
  const answers = buildResponses(persona);
  for (let page = 0; page < 6; page++) {
    const batch = Object.entries(answers).slice(page * 10, page * 10 + 10);
    patch({
      responses: {
        ...session.responses,
        ...Object.fromEntries(batch.map(([id, v]) => [Number(id), v])),
      },
    });
  }
  check(
    `all 60 answered (${Object.keys(session.responses).length})`,
    isTestComplete(session.responses),
  );

  // ---- scoring -> /results
  const scores = scoreResponses(session.responses);
  patch({ scores, completedAt: new Date().toISOString() });
  const code = getHollandCode(scores);
  console.log(`      headline: ${getHeadline(scores, session.childName)}`);
  check(`Holland code computed (${code})`, code.length === 3);
  check(
    "every type inside 10-50",
    Object.values(scores).every((v) => v >= 10 && v <= 50),
  );

  // ---- matching -> /report-preview
  const matches = getTopMatches(scores, 4);
  console.log(
    `      top 4:    ${matches
      .map((m) => `${m.career.title} ${matchPercent(m.matchScore)}%/${m.stars}★`)
      .join(", ")}`,
  );
  check("4 ranked matches returned", matches.length === 4);
  check(
    "ranked descending",
    matches.every((m, i) => i === 0 || matches[i - 1].matchScore >= m.matchScore),
  );
  check(
    "top match is one the persona was expected to rank",
    persona.expectedTop.includes(matches[0].career.title.split(" (")[0].split(" /")[0]),
    `got ${matches[0].career.title}, expected one of ${persona.expectedTop}`,
  );
  check(
    "top match carries roadmap content",
    Boolean(matches[0].career.roadmap?.exams.length),
  );

  // ---- /pricing
  const tiers = tierLevel === 1 ? tiersForLevel(1) : tiersForLevel(tierLevel);
  patch({ selectedTiers: tiers });
  const total = calculateTotal(tiers);
  const expected = { 1: 199, 2: 499, 3: 1499 }[tierLevel];
  check(`total is ${formatInr(expected)}`, total === expected, formatInr(total));

  const order = await mockCheckout(tiers);
  patch({ orderId: order.orderId });
  check(`order confirmed (${order.orderId})`, order.success);

  // ---- session integrity at the end
  check(
    "session survives round-trip through JSON (sessionStorage)",
    JSON.stringify(JSON.parse(JSON.stringify(session))) === JSON.stringify(session),
  );
  check("final session has everything the report needs",
    Boolean(session.scores && session.orderId && session.childName));
}

async function main() {
  const rule = "=".repeat(72);
  console.log(`${rule}\nEnd-to-end flow: register -> link -> resume -> test -> results -> pricing\n${rule}`);

  await runFlow(0, 1);
  await runFlow(1, 2);
  await runFlow(2, 3);

  console.log(
    `\n${rule}\n${failures === 0 ? "Full funnel passes for all three personas." : `${failures} check(s) FAILED.`}\n${rule}`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
