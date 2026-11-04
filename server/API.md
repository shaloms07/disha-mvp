# API contract

Base URL: `https://api.mylifecoach.in` (production) / `http://localhost:4000` (local).
All request/response bodies are JSON. All endpoints are under the base URL directly
(no `/api` prefix).

## Auth

Two independent credentials exist:

- **Session token** (`dsh_...`) — one `AssessmentSession`'s own progress. Returned by
  `POST /register`. Sent as a path segment (`/session/:token`) or body field
  (`sessionToken`) — never as a header. Anyone holding it can read/patch that one
  session; it grants no access to anything else.
- **Auth token** (`auth_...`) — a signed-in parent, scoped to their mobile number
  across every `Parent` row that shares it. Returned by `POST /auth/otp/verify`. Sent
  as `Authorization: Bearer <token>` on every authenticated request. 30-day expiry,
  revocable (`POST /auth/logout`).

The frontend (Vercel) and this API (VPS) are different origins, so the auth token is
a header, not a cookie — no `SameSite`/credentialed-CORS setup needed.

## Errors

Every error response is `{ "error": "<message>" }` (occasionally with extra fields —
see individual endpoints). Common status codes:

- `400` — bad request body (includes zod's `issues` array for `PATCH /session/:token`)
- `401` — missing/invalid/expired/revoked auth token (auth-required endpoints only)
- `404` — session token or ward not found
- `429` — OTP send rate limit hit
- `500` — unhandled server error

---

## Existing endpoints (unchanged response shape — still work exactly as before)

### `POST /register`
```jsonc
// Request
{
  "parentName": "string", "parentMobile": "string",
  "childName": "string", "childClass": "string",
  "schoolCode": "string?", "parentStatedPreference": "string?",
  "utmSource": "string?", "utmMedium": "string?", "utmCampaign": "string?"
}
// Response 200
{ "sessionToken": "dsh_..." }
```
**New, optional:** send `Authorization: Bearer <auth token>` to attach this new
child/session to your *existing* parent record instead of creating a new one — the
request body is unchanged either way. Any `parentMobile` in the body is ignored when
authenticated; the session is always attached to the signed-in number. No auth header
→ behaves exactly as before (new `Parent` row created).

### `POST /otp/send` — unchanged
`{ sessionToken, mobile }` → `{ success: true }` or `400/404/429` with `{ error }`.

### `POST /otp/verify`
`{ sessionToken, code }` → `{ verified: false, error?: string }`, or on success:
```jsonc
{
  "verified": true,
  "authToken": "auth_...",   // same shape/use as POST /auth/otp/verify's token
  "parentName": "string",
  "parentMobile": "string"
}
```
Verifying a mobile number here proves exactly what a sign-in OTP would, so this
now also signs the parent in — no separate `/auth/otp/*` round trip needed
right after registering. The frontend stores `authToken` the same way it
would from `POST /auth/otp/verify`.

### `GET /session/:token`
Same fields as before, **plus**:
```jsonc
{
  // ...unchanged fields...
  "moduleResponses": { "aptitude": { "1": 3 }, "sjt": { "2": 0 } }, // school-pilot/deep-dive
  "moduleScores": { "aptitude": { "numerical": 12 } },
  "status": "REGISTERED" | "IN_PROGRESS" | "COMPLETED" | "TIMED_OUT",
  "answeredCount": 12,
  "totalQuestions": 36,
  "lastQuestionId": 12,          // omitted if nothing answered yet
  "lastActivityAt": "2026-09-29T07:00:52.147Z"
}
```
`status` is computed at read time, not just stored: a session idle for 30+ minutes
reads as `"TIMED_OUT"` regardless of what's persisted, until it resumes.

### `PATCH /session/:token`
Same fields as before, **minus `otpVerified`** (see "Fixed" below), **plus**
`moduleResponses`/`moduleScores` (merged per-module-name, one level deeper than
`responses`/`scores` — patching `{"aptitude": {"3": 5}}` only touches question 3 of
the aptitude module, leaving its other answers and every other module untouched).

No new call is needed for progress tracking — every `responses` patch automatically
bumps `status` (`REGISTERED` → `IN_PROGRESS`), `answeredCount`, `lastQuestionId`, and
`lastActivityAt`. Sending `completedAt` sets `status` to `COMPLETED`. A heartbeat
endpoint wasn't added — a PATCH already fires after every answer, which is dense
enough activity signal on its own.

**Fixed:** `otpVerified` is no longer an accepted field — the schema is `.strict()`,
so including it now gets you a `400`. It can only be set by `POST /otp/verify`.

---

## New endpoints

### `POST /auth/otp/send`
```jsonc
// Request
{ "mobile": "9876543210" }
// Response 200 — ALWAYS this shape, whether or not the number is registered,
// rate-limited, or anything else. Never reveals registration status.
{ "success": true }
```
A code is only actually generated/sent if the number has at least one `Parent` row.
Rate limit: 5 sends/mobile/hour (`lib/otp.ts`'s existing constants), tracked in a
separate budget from the registration-flow OTPs (`purpose: SIGN_IN` vs
`SESSION_VERIFY` on `OtpCode`) — sending one doesn't eat into the other's quota.

### `POST /auth/otp/verify`
```jsonc
// Request
{ "mobile": "9876543210", "code": "1234" }
// Response 200 (success)
{
  "verified": true,
  "token": "auth_...",
  "wards": [ /* same shape as GET /me/wards below */ ]
}
// Response 200 (failure)
{ "verified": false, "error": "string?" }
```
Same attempt-limit (5) and hashing as the existing OTP flow. Returns the wards list
immediately so the frontend doesn't need a second round trip after signing in.

### `GET /me/wards` — requires `Authorization: Bearer <token>`
```jsonc
{
  "wards": [
    {
      "sessionToken": "dsh_...",
      "childName": "string",
      "childClass": "string",
      "schoolCode": "string?",
      "status": "REGISTERED" | "IN_PROGRESS" | "COMPLETED" | "TIMED_OUT",
      "answeredCount": 12,
      "totalQuestions": 36,
      "completedAt": "ISO date?",
      "lastActivityAt": "ISO date",
      "createdAt": "ISO date",
      "scores": { "R": 13, "I": 9, ... } // present only once completed
    }
  ]
}
```
Every `AssessmentSession` whose parent's mobile matches the signed-in number, across
every `Parent` row with that number — newest first. Use `status`/`answeredCount` to
decide what to show: `"Resume RIASEC test (question N of 36)"` for
`IN_PROGRESS`/`TIMED_OUT`, `"View results"` for `COMPLETED`.

### `POST /auth/logout` — requires `Authorization: Bearer <token>`
```jsonc
{ "success": true }
```
Revokes the token (`AuthSession.revokedAt`). Test progress is untouched — only the
sign-in credential is invalidated.

---

## Invite-3-parents, paid-level pricing, WhatsApp journey (this round)

### `POST /register` — new optional fields
```jsonc
{
  // ...existing fields...
  "referredByCode": "string?",   // from a /register?ref=CODE link (lib/invite.ts)
  "whatsappOptIn": "boolean?"    // consent for marketing-kind sends, default false
}
```
`referredByCode` is only stored if it resolves to a real session's `referralCode` —
an unrecognised code is silently ignored, never a validation error. It doesn't count
as an invite yet; that only happens once this mobile number is actually verified
(`POST /otp/verify`, below).

### `POST /otp/verify` — unchanged response, new side effects
On success, this session gets its own `referralCode` (if it doesn't have one yet),
and if it arrived via someone else's invite link, that invite is credited — but only
once, and only if this mobile number has never verified before and isn't the
inviter's own. At the 3rd credited invite, the inviter's session gets
`purchasedTierLevel: 1` for free (`unlockedVia: "REFERRAL"`, no `Order` row).

### `GET /session/:token` — new fields
```jsonc
{
  // ...existing fields...
  "purchasedTierLevel": 1,     // unchanged meaning: what this session can open
  "paidTierLevel": 0,          // highest tier actually PAID for (0 if referral-only)
  "paidAmount": 0,             // NEW: rupees actually paid, summed across PAID orders
  "referralCode": "ABC234",    // this session's own invite code (generated regardless of REFERRALS_ENABLED)
  "referralCount": 2,          // of the 3 needed, capped at 3 — never reveals who joined
  "counsellorCall": {          // NEW: the next SCHEDULED call, or null
    "scheduledAt": "2026-11-08T05:30:00.000Z",
    "meetingLink": "https://meet.google.com/...",
    "rescheduleUrl": "https://calendly.com/reschedulings/..."   // omitted for an admin-booked call
  }
}
```
`counsellorCall` is whichever `SCHEDULED` call on the session has the soonest
`scheduledAt` still in the future (with an hour's grace past it, so a call
running a little late doesn't vanish from the response mid-call).
`components/ConsultationScheduler.tsx` shows this instead of the Calendly
calendar once it's non-null.
`paidAmount` is what `POST /checkout/create-order` credits on an upgrade, via
`lib/pricing.ts`'s `priceAfterCredit(target, paidAmount)` — the real rupees paid,
not the list price of the tier owned. A parent who paid ₹299 for the Career Match
Report before the ₹99 launch gets all ₹299 off a later upgrade, not just ₹99.
`purchasedTierLevel` is still what gates access and is unrelated to pricing; they
diverge whenever `unlockedVia` is `"REFERRAL"` (paidAmount stays 0) or a price
changes after a payment was made. `paidTierLevel` is kept for the admin view but no
longer drives any pricing.

### `POST /session/:token/checkout/create-order` — unchanged request/response
Still blocks with `409` if `purchasedTierLevel` already covers the requested tier.
The charged `amount` is `priceAfterCredit(tierLevel, paidAmount) * 100` paise.

If the session's parent mobile is in `CHECKOUT_BYPASS_MOBILES` (comma-separated,
10 digits, `lib/checkout/testBypass.ts`), Razorpay is skipped entirely — a
synthetic order (`razorpayOrderId` prefixed `TEST-`) is created and marked
`PAID` immediately via the same `markOrderPaid()` a real payment goes
through, so `purchasedTierLevel` updates and the WhatsApp journey fire
exactly as they would for a real payment. The response adds `"bypassed": true`
and an empty `keyId`; the frontend (`app/pricing/page.tsx`, `app/results/page.tsx`)
checks this and skips opening Razorpay Checkout altogether. For internal QA
testers only — works even once real (non-test-mode) Razorpay keys are live.

### Invites switched off (`REFERRALS_ENABLED`)
"Invite 3 parents, get the Career Match Report free" is off by default — set the
`REFERRALS_ENABLED` env var to `"true"` to turn invite-crediting back on
(`server/routes/otp.ts`). With it unset/false: `referralCode` generation, the
`referredByCode`/`referralCountedAt` fields, and `GET /session/:token`'s
`referralCode`/`referralCount` all keep working exactly as before — only the actual
crediting (and `referral_progress`/`referral_unlocked` sends) is skipped, so
re-enabling it later needs no backfill.

### `POST /admin/sessions/:token/counsellor-calls` — requires admin auth
```jsonc
// Request
{ "scheduledAt": "ISO date", "meetingLink": "https://...", "notes": "string?" }
// Response 200
{ "id": "string", "scheduledAt": "ISO date", "status": "SCHEDULED", "meetingLink": "string", "notes": "string?" }
```
`meetingLink` is required and must start with `https://`. Sends `counsellor_confirmed`.
Meant for a tier 4 ("Report + Counsellor") session, but not enforced server-side —
the admin team books these by hand.

### `PATCH /admin/counsellor-calls/:id` — requires admin auth
```jsonc
// Request — any subset
{ "scheduledAt": "ISO date?", "status": "SCHEDULED" | "COMPLETED" | "CANCELLED", "meetingLink": "https://...?", "notes": "string?" }
```
A changed `scheduledAt` (a reschedule) **or** a changed `meetingLink` re-sends
`counsellor_confirmed` with the new details; changing only `status` or `notes` does not.

### Calendly booking - two ways it reaches the backend

Report + Counsellor parents book their own call from an embedded Calendly
calendar (`components/ConsultationScheduler.tsx`), prefilled with their name,
WhatsApp number, child's name, and the session token as `utm_content`. The
actual booking logic (finding the session, creating/updating the
`CounsellorCall`, sending `counsellor_confirmed`) lives once, in
`lib/calendly/bookingSync.ts` (`bookCall`/`rescheduleCall`/`cancelCall`), and
is shared by both of the paths below — so which plan you're on changes
nothing except which one actually fires.

- **Real-time webhook — `POST /webhooks/calendly`** (needs a Calendly
  **Standard-or-above** plan to even create the subscription). Registered
  only when both `CALENDLY_API_TOKEN` and `CALENDLY_WEBHOOK_SIGNING_KEY` are
  set. Verifies the `Calendly-Webhook-Signature: t=<unix>,v1=<hex>` header
  (`HMAC-SHA256(CALENDLY_WEBHOOK_SIGNING_KEY, "<t>.<raw body>")`, rejecting
  with `401` on a mismatch or a timestamp more than 5 minutes old), then
  always answers `200` quickly, same pattern as `/whatsapp/webhook`.
  `invitee.created` books or (if `payload.old_invitee` is set) reschedules;
  `invitee.canceled` cancels, unless `payload.rescheduled` is true, in which
  case the matching `invitee.created` above handles it instead.
- **Polling — `server/jobs/reminderSweep.ts`'s `pollCalendlyBookings`**
  (works on **any** plan, including Free — this is what actually runs today,
  since webhook subscriptions need Standard). Every sweep: lists this
  account's active scheduled events 24h in the past to 30 days out, and for
  each invitee not yet on record, books or reschedules it exactly as the
  webhook would. Separately, every `SCHEDULED` Calendly-booked call still in
  the future is checked directly (`GET` the invitee's own URI) for a
  cancellation. A booking can take up to one sweep interval (15 min) to show
  up this way — the accepted trade-off for not paying for webhooks. Safe to
  leave running even after a real webhook subscription exists later
  (idempotent either way); no-op entirely when `CALENDLY_API_TOKEN` isn't set.

Either way, if a Google Meet link hasn't arrived yet when the booking is
first recorded (Meet links can arrive a few seconds late),
`sweepCalendlyMeetingLinks` (also in `reminderSweep.ts`) catches it up and
sends `counsellor_confirmed` once the link shows up.

### `npm run calendly:subscribe`
One-off script (`server/scripts/calendlySubscribe.ts`) that registers the
`invitee.created`/`invitee.canceled` webhook subscription with Calendly using
`CALENDLY_API_TOKEN` and `CALENDLY_WEBHOOK_SIGNING_KEY`. **Requires a Calendly
Standard-or-above plan** — fails with `403 Permission Denied` on Free/Basic;
until the account is upgraded, polling above is what actually delivers
bookings, and this script is simply not run. Safe to re-run once it is — it
checks for an existing subscription pointed at the same URL first.

### `GET /admin/dashboard` / `GET /admin/sessions/:token` — new fields
Both now also return `paidTierLevel`, `unlockedVia`, and `referralCount` per session.
The single-session view additionally returns `unlockedAt`, `referralCode`,
`whatsappMessages` (the full send ledger — template, key, kind, status,
`metaMessageId`, `error`), and `counsellorCalls` (now including `meetingLink`).

### WhatsApp templates

Every template below is **off by default** — nothing sends until its env var
(`.env.example`) is set to the real, Meta-approved template name. Until then, every
attempted send is logged as a `SKIPPED` row on `WhatsAppMessage`, visible in
`GET /admin/sessions/:token`. `kind: marketing` sends additionally require
`whatsappOptIn: true` and no `whatsappOptOutAt` on the session; `kind: utility`
sends don't. A link is always a URL button's dynamic suffix (the session token),
never body text — the button's base URL (`https://www.mylifecoach.in/results?t=`)
is configured once, in WhatsApp Manager, per template. Two templates
(`counsellor_confirmed`, `counsellor_reminder`) have **no button at all** —
that's deliberate, not an omission. Body-parameter count and
order must match the approved template exactly, or Meta rejects the send
(error 132000); the table below is the exact order each function sends.
`counsellor_book` is the one exception with a button — it's the same dynamic
URL button as the others, landing on `/results` where the Calendly calendar
(or the admin-booking fallback message) is.

| Env var | Template | Kind | Body variables, in order | Fires when |
|---|---|---|---|---|
| `WHATSAPP_RESULT_LINK_TEMPLATE` | `result_link` | utility | parent, child | Free RIASEC test completes — not yet active; `WHATSAPP_RESULT_TEMPLATE`'s existing send still runs until this env var is set (never both) |
| `WHATSAPP_REPORT_OFFER_TEMPLATE` | `report_offer` | marketing | parent, child, Career Match Report price | 1h after test completion, Career Match Report still not owned and the Deep-Dive not finished (completed within the last 7 days) |
| `WHATSAPP_REPORT_PAID_TEMPLATE` | `report_paid` | utility | parent, amount paid, child, Razorpay payment id (PDF attached) | Tier 1 paid |
| `WHATSAPP_UPGRADE_OFFER_TEMPLATE` | `upgrade_offer` | marketing | parent, child, Complete Career Report price, Report + Counsellor price | 1 day after a tier 1 unlock, tier 3 still not owned and the Deep-Dive not finished (unlocked within the last 7 days) |
| `WHATSAPP_PAYMENT_RECEIVED_TEMPLATE` | `payment_received` | utility | parent, amount paid, child, plan name, Razorpay payment id | Tier 3/4 paid — followed by `full_report_ready` (and `counsellor_book` for tier 4) when the Deep-Dive was already finished |
| `WHATSAPP_COUNSELLOR_OFFER_TEMPLATE` | `counsellor_offer` | marketing | parent, child, Report + Counsellor price | 1 day after Deep-Dive finishes, tier 2–3 owned (finished within the last 7 days) |
| `WHATSAPP_DEEPDIVE_REMINDER_TEMPLATE` | `deepdive_reminder` | utility | parent, child, Deep-Dive tests done ("0"–"2") | Tier 3+, Deep-Dive unfinished, idle 24h then 72h (72h only if the 24h one went out ≥48h earlier) |
| `WHATSAPP_FULL_REPORT_READY_TEMPLATE` | `full_report_ready` | utility | parent, child | All three Deep-Dive modules scored on a tier 2+ session, or tier 2+ paid after they were |
| `WHATSAPP_DEEPDIVE_UNLOCK_TEMPLATE` | `deepdive_unlock` | marketing | parent, child, Complete Career Report price | All three Deep-Dive modules scored on a session that hasn't bought tier 2+ (the tests are free to take; the report is paid) |
| `WHATSAPP_COUNSELLOR_BOOK_TEMPLATE` | `counsellor_book` | utility | parent, child | Deep-Dive finishes on a tier 4 session, or tier 4 paid after it finished |
| `WHATSAPP_COUNSELLOR_CONFIRMED_TEMPLATE` | `counsellor_confirmed` | utility | parent, child, date, time, meeting link (no button) | A counsellor call is created, or its time or link changes |
| `WHATSAPP_COUNSELLOR_REMINDER_TEMPLATE` | `counsellor_reminder` | utility | parent, child, time, meeting link (no button) | 2h before a booked counsellor call |
| `WHATSAPP_REFERRAL_PROGRESS_TEMPLATE` | `referral_progress` | utility | parent, invite count | Invite count reaches 1 or 2 — only with `REFERRALS_ENABLED=true` |
| `WHATSAPP_REFERRAL_UNLOCKED_TEMPLATE` | `referral_unlocked` | utility | parent, child (PDF attached) | Invite count reaches 3 — only with `REFERRALS_ENABLED=true` |

No template anywhere names the counsellor — the approved copy says "our counsellor".
Prices have no ₹ sign (the template has it) and use Indian digit grouping, e.g.
`49`, `1,199`, `2,399`. Dates read like "Saturday, 8 November"; times like "11:00 am",
both in IST.

All timed sends above (`server/jobs/reminderSweep.ts`) fire 9am–8pm IST only, with
one exception: `counsellor_reminder` ignores that window entirely, since it's a
reminder for a call the parent already booked — a 9am call still needs its
reminder at 7am. Anything else due outside the window waits for the next sweep
inside it. The existing `exam_link`/`exam_reminder` sends are unaffected by any of
this. The same sweep also runs `pollCalendlyBookings` and `sweepCalendlyMeetingLinks`
outside the window (both no-op unless `CALENDLY_API_TOKEN` is set) — see
"Calendly booking" above for the former; the latter re-fetches a
Calendly-booked call's event from the Calendly API if the Meet link hadn't
arrived yet when it was first recorded, sends `counsellor_confirmed` once it finds one,
and logs a warning for the admin team if it's still missing after 30 minutes.

### WhatsApp webhook (`/whatsapp/webhook`)
Now verifies `X-Hub-Signature-256` against `WHATSAPP_APP_SECRET` before trusting a
POST payload (always replies `200` regardless, per Meta's own guidance). A
`statuses[]` entry updates the matching `WhatsAppMessage` row to
`DELIVERED`/`READ`/`FAILED`. An inbound "Stop promotions" reply sets
`whatsappOptOutAt` on every session belonging to that mobile number.

---

## Known limitations / deliberate simplifications

- **`POST /auth/otp/send` timing side-channel**: an unregistered number returns
  slightly faster (no DB write, no SMS call) than a registered one. Full timing-safe
  padding wasn't implemented this round — flag if this needs closing before ads.
- **`lastQuestionId`** is the highest question id present in the *specific* PATCH
  call that just arrived, not necessarily the highest ever answered — matches how
  the frontend already sends one answer per PATCH.
- **Auth token TTL** is 30 days, fixed (`lib/auth/token.ts`'s `AUTH_TOKEN_TTL_DAYS`).

## Local run steps

```bash
docker compose up -d                  # local Postgres (or point DATABASE_URL at your own)
npx prisma migrate deploy             # applies prisma/migrations/*, including this round's
npm run server:dev                    # Express API on :4000, OTP_PROVIDER=stub logs codes to console
```
