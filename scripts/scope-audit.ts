/**
 * Stage 5 scope audit — run with `npm run audit`.
 *
 * Originally proved this MVP was frontend-only end to end. As of the free
 * RIASEC funnel's backend (register -> OTP -> test -> results — see
 * C:\Users\lenovo\.claude\plans\floating-doodling-tower.md), that's no longer
 * true by design: BACKEND_FILES below really do use fetch()/Prisma/a real
 * SMS provider. This script's job now is narrower but still real:
 *  1. Every OTHER integration this MVP hasn't built yet (payment gateway,
 *     booking, WhatsApp delivery, analytics, auth) is still absent or mocked.
 *  2. The backend additions stay confined to BACKEND_FILES — a database
 *     import or a real fetch() turning up somewhere else (e.g. the checkout
 *     or deep-dive screens, which are still supposed to be 100% mocked)
 *     would mean scope crept without anyone deciding that on purpose.
 *
 * Scans first-party source only — node_modules and .next are framework code.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SCAN_DIRS = ["app", "components", "lib", "types", "scripts", "data"];
/** What actually ships to the browser. Dev scripts name these APIs as literals. */
const SHIPPED = ["app/", "components/", "lib/", "types/", "data/"];
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".css"]);

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ""}`);
  }
}

function heading(text: string) {
  const rule = "=".repeat(72);
  console.log(`\n${rule}\n${text}\n${rule}`);
}

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (CODE_EXT.has(extname(entry))) out.push(full);
    }
  };
  for (const dir of SCAN_DIRS) walk(join(ROOT, dir));
  return out;
}

const files = sourceFiles().map((path) => ({
  path: relative(ROOT, path).replace(/\\/g, "/"),
  text: readFileSync(path, "utf8"),
}));

/** Files that ship to the browser */
const shipped = files.filter((f) => SHIPPED.some((d) => f.path.startsWith(d)));

/**
 * The free-funnel backend (Phase 1 of the plan above) — the one place a real
 * database, a real fetch(), and a real SMS-provider import are all expected
 * and correct. Everything else in `shipped` must still be checked at the old,
 * strict standard.
 */
const BACKEND_FILES = [
  "lib/db.ts",
  "lib/otp.ts",
  "lib/sms/",
  "lib/session/",
  "lib/auth/",
  "lib/api/realSession.ts",
  "lib/api/auth.ts",
  "lib/utm.ts",
  "components/UtmCapture.tsx",
];
const isBackendFile = (path: string) => BACKEND_FILES.some((prefix) => path.startsWith(prefix));
const nonBackend = shipped.filter((f) => !isBackendFile(f.path));

function hits(pattern: RegExp, scope: typeof shipped = shipped) {
  return scope.filter((f) => pattern.test(f.text)).map((f) => f.path);
}

/** Module specifiers imported by the given files */
function importedModules(scope: typeof shipped = shipped): string[] {
  const specs = new Set<string>();
  for (const f of scope) {
    for (const m of f.text.matchAll(
      /from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g,
    )) {
      specs.add(m[1] ?? m[2]);
    }
  }
  return [...specs].sort();
}

/* ------------------------------------------------- 1. no network calls */

heading("1. No network calls outside the free-funnel backend");

// fetch( is expected and correct in BACKEND_FILES (lib/api/realSession.ts,
// lib/session/sync.ts, app/api/**'s own use of it, etc.) — checked against
// nonBackend instead. Everything else here has no legitimate use anywhere.
const found = hits(/\bfetch\s*\(/, nonBackend);
check("no fetch( outside the backend files", found.length === 0, found.join(", "));

const NETWORK_APIS: [string, RegExp][] = [
  ["XMLHttpRequest", /XMLHttpRequest/],
  ["WebSocket", /\bnew\s+WebSocket\b/],
  ["EventSource", /\bnew\s+EventSource\b/],
  ["navigator.sendBeacon", /sendBeacon/],
  ["axios", /\baxios\b/],
  ["node:http / https", /require\(['"]https?['"]\)|from ['"]node:https?['"]/],
  ["form action to a URL", /<form[^>]+action=/],
];

for (const [name, pattern] of NETWORK_APIS) {
  const found = hits(pattern);
  check(`no ${name}`, found.length === 0, found.join(", "));
}

/*
  XML namespaces (http://www.w3.org/...) are identifiers, not endpoints — the
  browser never fetches them. A vendor API URL is expected inside
  BACKEND_FILES (currently only as a not-yet-live reference comment in
  lib/sms/otpProvider.ts, pending the actual smsgw.in API doc). Everything
  else must still be absent.
*/
const NAMESPACE_URL = /^https?:\/\/www\.w3\.org\//;

const externalUrls = nonBackend
  .flatMap((f) =>
    (f.text.match(/https?:\/\/[^\s"'`)]+/g) ?? [])
      .filter((url) => !NAMESPACE_URL.test(url))
      .map((url) => `${f.path}: ${url}`),
  );
check(
  "no absolute http(s) URLs outside the backend files",
  externalUrls.length === 0,
  externalUrls.join("\n        "),
);

/* ------------------------------- 2. out-of-scope integrations absent */

heading("2. Out-of-scope integrations are absent (PRD Section 2)");

const FORBIDDEN_IMPORTS: [string, RegExp][] = [
  ["auth library", /next-auth|clerk|firebase|@auth\//i],
  ["payment SDK", /razorpay|stripe|paytm|payu/i],
  ["WhatsApp API client", /whatsapp/i],
  ["booking / scheduling", /calendly|calcom|cal\.com/i],
  ["analytics / tracking", /gtag|mixpanel|posthog|segment|analytics/i],
];

// database client / SMS-OTP provider are now expected in BACKEND_FILES (the
// free-funnel backend) — checked against nonBackend's imports specifically,
// so a Prisma or SMS import turning up in, say, the checkout/deep-dive
// screens (still supposed to be 100% mocked) is still caught.
const SCOPED_TO_BACKEND: [string, RegExp][] = [
  ["database client", /supabase|^pg$|prisma|drizzle|mongodb|mysql/i],
  ["SMS / OTP provider", /twilio|msg91|textlocal|gupshup|smsgw/i],
];
for (const [name, pattern] of SCOPED_TO_BACKEND) {
  const found = importedModules(nonBackend).filter((spec) => pattern.test(spec));
  check(`no ${name} imported outside the backend files`, found.length === 0, found.join(", "));
}

const imports = importedModules();
for (const [name, pattern] of FORBIDDEN_IMPORTS) {
  const found = imports.filter((spec) => pattern.test(spec));
  check(`no ${name} imported`, found.length === 0, found.join(", "));
}
console.log(`        (shipped code imports: ${imports.join(", ")})`);

const pkg = JSON.parse(
  readFileSync(join(ROOT, "package.json"), "utf8"),
) as { dependencies: Record<string, string> };
const runtimeDeps = Object.keys(pkg.dependencies).sort();
const ALLOWED_RUNTIME_DEPS = [
  "next",
  "react",
  "react-dom",
  "recharts",
  "@react-pdf/renderer",
  // Free-funnel backend (Phase 1) - Postgres client + request validation.
  "@prisma/client",
  "zod",
  // The standalone Express API (server/) - not scanned above since it never
  // ships to the browser, but its deps still show up in package.json.
  "cors",
  "dotenv",
  "express",
];
check(
  `runtime dependencies are framework + charts + client-side PDF + free-funnel backend only (${runtimeDeps.join(", ")})`,
  runtimeDeps.every((d) => ALLOWED_RUNTIME_DEPS.includes(d)),
  runtimeDeps.join(", "),
);

/* --------------------------------- 3. the mocks are actually mocked */

heading("3. Mocked backend behaves as a mock");

const mockApi = files.find((f) => f.path === "lib/mockApi.ts");
check("lib/mockApi.ts exists", Boolean(mockApi));

if (mockApi) {
  check(
    "delays come from setTimeout",
    /setTimeout/.test(mockApi.text) && !/\bfetch\s*\(/.test(mockApi.text),
  );
  for (const fn of [
    "mockRegisterSession",
    "mockSendOtp",
    "mockVerifyOtp",
    "mockCheckout",
  ]) {
    check(`exports ${fn}`, mockApi.text.includes(`export async function ${fn}`));
  }
}

/* ------------------------ 4. out-of-scope items are visible to the user */

heading("4. Out-of-scope items are disclosed on screen, not hidden");

const disclosures: [string, string, RegExp][] = [
  ["WhatsApp delivery", "app/link/page.tsx", /WhatsApp/],
  ["no payment taken", "app/pricing/page.tsx", /no payment/i],
  [
    "consultation scheduling",
    "components/ConsultationScheduler.tsx",
    /no real counsellor calendar/i,
  ],
  // Registration/test data IS genuinely stored now (the free-funnel backend)
  // — this asserts that's disclosed truthfully, not that it's denied.
  ["data storage disclosed accurately", "components/SiteFooter.tsx", /stored\s+to\s+run\s+this\s+assessment/i],
];

for (const [label, path, pattern] of disclosures) {
  const file = files.find((f) => f.path === path);
  check(
    `${label} disclosed in ${path}`,
    Boolean(file && pattern.test(file.text)),
  );
}

/* ------------------------------------------------------------ result */

const rule = "=".repeat(72);
console.log(
  `\n${rule}\n${
    failures === 0
      ? "All scope checks passed — everything outside the free-funnel backend stays frontend-only."
      : `${failures} check(s) FAILED.`
  }\n${rule}`,
);
process.exit(failures === 0 ? 0 : 1);
