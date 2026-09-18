/**
 * Stage 5 scope audit — run with `npm run audit`.
 *
 * Proves the two claims this MVP rests on:
 *  1. No application code makes a real network call.
 *  2. Every explicitly out-of-scope integration (WhatsApp/SMS, real OTP,
 *     payment gateway, booking, database/backend) is absent or mocked.
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

function hits(pattern: RegExp) {
  return shipped.filter((f) => pattern.test(f.text)).map((f) => f.path);
}

/** Module specifiers imported by shipped code */
function importedModules(): string[] {
  const specs = new Set<string>();
  for (const f of shipped) {
    for (const m of f.text.matchAll(
      /from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g,
    )) {
      specs.add(m[1] ?? m[2]);
    }
  }
  return [...specs].sort();
}

/* ------------------------------------------------- 1. no network calls */

heading("1. No network calls in application code");

const NETWORK_APIS: [string, RegExp][] = [
  ["fetch(", /\bfetch\s*\(/],
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
  browser never fetches them. Everything else must be absent.
*/
const NAMESPACE_URL = /^https?:\/\/www\.w3\.org\//;

const externalUrls = shipped
  .flatMap((f) =>
    (f.text.match(/https?:\/\/[^\s"'`)]+/g) ?? [])
      .filter((url) => !NAMESPACE_URL.test(url))
      .map((url) => `${f.path}: ${url}`),
  );
check(
  "no absolute http(s) URLs anywhere in source",
  externalUrls.length === 0,
  externalUrls.join("\n        "),
);

/* ------------------------------- 2. out-of-scope integrations absent */

heading("2. Out-of-scope integrations are absent (PRD Section 2)");

const FORBIDDEN_IMPORTS: [string, RegExp][] = [
  ["database client", /supabase|^pg$|prisma|drizzle|mongodb|mysql/i],
  ["auth library", /next-auth|clerk|firebase|@auth\//i],
  ["payment SDK", /razorpay|stripe|paytm|payu/i],
  ["SMS / OTP provider", /twilio|msg91|textlocal|gupshup/i],
  ["WhatsApp API client", /whatsapp/i],
  ["booking / scheduling", /calendly|calcom|cal\.com/i],
  ["analytics / tracking", /gtag|mixpanel|posthog|segment|analytics/i],
];

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
check(
  `runtime dependencies are framework + charts only (${runtimeDeps.join(", ")})`,
  runtimeDeps.every((d) =>
    ["next", "react", "react-dom", "recharts"].includes(d),
  ),
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
  ["no SMS sent", "app/resume/page.tsx", /no SMS is sent/i],
  ["no payment taken", "app/pricing/page.tsx", /no payment/i],
  [
    "consultation scheduling",
    "components/ConsultationScheduler.tsx",
    /no real counsellor calendar/i,
  ],
  ["nothing stored", "components/SiteFooter.tsx", /stored beyond/i],
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
      ? "All scope checks passed — frontend-only, nothing leaves the browser."
      : `${failures} check(s) FAILED.`
  }\n${rule}`,
);
process.exit(failures === 0 ? 0 : 1);
