/**
 * Standalone Express API for the free RIASEC funnel — runs on the same VPS
 * as the database (so Postgres never has to be reachable from the public
 * internet), while the Next.js frontend itself stays on Vercel. See
 * lib/api/realSession.ts on the frontend side, which calls this over HTTPS
 * via NEXT_PUBLIC_API_BASE_URL.
 *
 * Deliberately reuses the exact same business logic the former Next.js
 * Route Handlers used (lib/otp.ts, lib/validation.ts, lib/session/*, the
 * Prisma client) - only the request/response glue changed.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import { registerRouter } from "./routes/register";
import { otpRouter } from "./routes/otp";
import { sessionRouter } from "./routes/session";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";

const PORT = Number(process.env.PORT ?? 4000);

/**
 * Fixed allow-list (mylifecoach.in + local dev) plus any *.vercel.app preview
 * URL, since those change per-deployment and can't be listed individually.
 */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === "https:" && hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (curl, server-to-server, health checks) - allow.
      // A disallowed origin gets `false`, not a thrown error - the browser
      // still blocks it (no CORS headers reach it), but this avoids logging
      // routine internet background noise as a scary "unhandled error".
      callback(null, !origin || isAllowedOrigin(origin));
    },
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(registerRouter);
app.use(otpRouter);
app.use(sessionRouter);
app.use(authRouter);
app.use(meRouter);

// Express 5's route handlers already forward rejected promises to this,
// so a plain 4-arg error handler is enough - no per-route try/catch needed.
// The unused `next` param must still be present - Express detects an error
// handler by function arity (exactly 4 args), not by name.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[server] unhandled error", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
