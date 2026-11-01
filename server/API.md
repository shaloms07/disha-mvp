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
  "paidTierLevel": 0,          // NEW: highest tier actually PAID for (0 if referral-only)
  "referralCode": "ABC234",    // this session's own invite code
  "referralCount": 2           // of the 3 needed, capped at 3 — never reveals who joined
}
```
`paidTierLevel` is what `POST /checkout/create-order` credits on an upgrade —
`purchasedTierLevel` is what gates access. They diverge exactly when `unlockedVia`
is `"REFERRAL"`: that session can open the Career Match Report, but still pays full
price for the Complete Career Report, not a credited upgrade.

### `POST /session/:token/checkout/create-order` — unchanged request/response
Still blocks with `409` if `purchasedTierLevel` already covers the requested tier.
The charged `amount` is now based on `paidTierLevel`, not `purchasedTierLevel` —
the only behavioural change, and only for a referral-unlocked session.

### `POST /admin/sessions/:token/counsellor-calls` — requires admin auth
```jsonc
// Request
{ "scheduledAt": "ISO date", "notes": "string?" }
// Response 200
{ "id": "string", "scheduledAt": "ISO date", "status": "SCHEDULED", "notes": "string?" }
```
Sends `counsellor_confirmed`. Meant for a tier 4 ("Report + Counsellor") session,
but not enforced server-side — the admin team books these by hand.

### `PATCH /admin/counsellor-calls/:id` — requires admin auth
```jsonc
// Request — any subset
{ "scheduledAt": "ISO date?", "status": "SCHEDULED" | "COMPLETED" | "CANCELLED", "notes": "string?" }
```
A changed `scheduledAt` (a reschedule) re-sends `counsellor_confirmed` with the new
time; changing only `status` or `notes` does not.

### `GET /admin/dashboard` / `GET /admin/sessions/:token` — new fields
Both now also return `paidTierLevel`, `unlockedVia`, and `referralCount` per session.
The single-session view additionally returns `unlockedAt`, `referralCode`,
`whatsappMessages` (the full send ledger — template, key, kind, status,
`metaMessageId`, `error`), and `counsellorCalls`.

### WhatsApp templates

Every template below is **off by default** — nothing sends until its env var
(`.env.example`) is set to the real, Meta-approved template name. Until then, every
attempted send is logged as a `SKIPPED` row on `WhatsAppMessage`, visible in
`GET /admin/sessions/:token`. `kind: marketing` sends additionally require
`whatsappOptIn: true` and no `whatsappOptOutAt` on the session; `kind: utility`
sends don't. A link is always a URL button's dynamic suffix (the session token),
never body text — the button's base URL (`https://www.mylifecoach.in/results?t=`)
is configured once, in WhatsApp Manager, per template.

| Env var | Template | Kind | Fires when |
|---|---|---|---|
| `WHATSAPP_RESULT_LINK_TEMPLATE` | `result_link` | utility | Free RIASEC test completes — not yet active; `WHATSAPP_RESULT_TEMPLATE`'s existing send still runs until this one is approved |
| `WHATSAPP_REPORT_PAID_TEMPLATE` | `report_paid` | utility | Tier 1 paid (PDF attached) |
| `WHATSAPP_PAYMENT_RECEIVED_TEMPLATE` | `payment_received` | utility | Tier 3/4 paid |
| `WHATSAPP_REFERRAL_PROGRESS_TEMPLATE` | `referral_progress` | utility | Invite count reaches 1 or 2 |
| `WHATSAPP_REFERRAL_UNLOCKED_TEMPLATE` | `referral_unlocked` | utility | Invite count reaches 3 (PDF attached) |
| `WHATSAPP_FULL_REPORT_READY_TEMPLATE` | `full_report_ready` | utility | All three Deep-Dive modules scored |
| `WHATSAPP_COUNSELLOR_BOOK_TEMPLATE` | `counsellor_book` | utility | Deep-Dive finishes on a tier 4 session |
| `WHATSAPP_COUNSELLOR_CONFIRMED_TEMPLATE` | `counsellor_confirmed` | utility | A counsellor call is created or rescheduled |
| `WHATSAPP_REPORT_OFFER_TEMPLATE` | `report_offer` | marketing | 1h after test completion, Career Match Report still not owned |
| `WHATSAPP_UPGRADE_OFFER_TEMPLATE` | `upgrade_offer` | marketing | 1 day after a tier 1 unlock, tier 3 still not owned |
| `WHATSAPP_DEEPDIVE_REMINDER_TEMPLATE` | `deepdive_reminder` | marketing | Tier 3+, Deep-Dive unfinished, idle 24h then 72h |
| `WHATSAPP_COUNSELLOR_OFFER_TEMPLATE` | `counsellor_offer` | marketing | 1 day after Deep-Dive finishes, tier 4 still not owned |
| `WHATSAPP_COUNSELLOR_REMINDER_TEMPLATE` | `counsellor_reminder` | utility | 2h before a booked counsellor call |

All timed sends above (`server/jobs/reminderSweep.ts`) only fire 9am–8pm IST —
anything due outside that window waits for the next sweep inside it. The existing
`exam_link`/`exam_reminder` sends are unaffected by this window.

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
