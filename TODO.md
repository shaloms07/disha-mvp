# TODO — DISHA Frontend-Only MVP

Reference PRD.md and SPEC.md for context/behavior. Work top to bottom; each stage should leave the app in a runnable, demoable state.

## Stage 0 — Project Setup

- [ ] Scaffold Next.js (App Router) + TypeScript project
- [ ] Install and configure Tailwind CSS
- [ ] Install Recharts
- [ ] Set up folder structure per SPEC.md Section 2
- [ ] Create shared TypeScript types in `types/index.ts`
- [ ] Set up `SessionContext` (React Context) to hold registration/test/pricing state across screens, backed by `sessionStorage` so a refresh doesn't lose progress

## Stage 1 — Content Data

- [ ] Transcribe all 60 RIASEC questions + type mapping into `data/questions.json`
- [ ] Build `data/careers.json` with 10-15 mock career profiles (title, description, RIASEC profile, roadmap placeholder content)
- [ ] Implement `lib/scoring.ts` (responses → six RIASEC totals) — write a quick manual test with sample data to confirm it sums correctly
- [ ] Implement `lib/matching.ts` (six scores → ranked career list with similarity/star rating) — sanity-check with 2-3 sample profiles that the ranking makes intuitive sense

## Stage 2 — Mock API Layer

- [ ] Implement `lib/mockApi.ts` with: `mockRegisterSession`, `mockSendOtp`, `mockVerifyOtp`, `mockCheckout` — all async with artificial delay, no real network calls
- [ ] Confirm each mock function is easy to swap for a real API call later (consistent input/output shape, called from screens via a single import point)

## Stage 3 — Core Screens (build in this order — matches user flow)

- [ ] **Landing page (`/`)** — hero, how-it-works, sample snapshot preview, FAQ, CTA → `/register`
- [ ] **Registration (`/register`)** — form (parent name, mobile, child name, child class), validation, submit → calls `mockRegisterSession`, stores in session context, routes to `/link`
- [ ] **Link generated (`/link`)** — displays mock link/token, "Copy Link" button with copy confirmation, note explaining it can be accessed later
- [ ] **Resume + consent + OTP (`/resume`)** — prefilled editable form from session context, consent checkbox (required), OTP input flow using `mockSendOtp`/`mockVerifyOtp`, routes to `/test` only after both consent + OTP pass
- [ ] **Test (`/test`)** — render questions in batches of ~10 per screen, progress bar, "Next" disabled until all answered on current screen, store answers in session context, on completion run `lib/scoring.ts` and route to `/results`
- [ ] **Results (`/results`)** — radar/bar chart (Recharts) of the six scores, short plain-language blurb on top 1-2 types, CTA into `/pricing`
- [ ] **Pricing/cart (`/pricing`)** — tier selection UI (base report / + roadmap / + consultation) with additive real pricing (no fake strikethrough price), "Checkout" → `mockCheckout` → success confirmation state

## Stage 4 — Stretch (only after Stage 3 is fully clickable end-to-end)

- [ ] **Mock report preview (`/report-preview`)** — static rendering of a sample detailed report using `lib/matching.ts` output: top 3-4 careers, star ratings, roadmap content per career
- [ ] Polish transitions/loading states so mock async calls feel realistic (skeletons/spinners, not instant jumps)
- [ ] Pass on responsive/mobile check for every screen
- [ ] Basic accessibility pass: labels on all form fields, visible focus states, adequate tap target sizes

## Stage 5 — Demo Readiness

- [ ] Full click-through test, start to finish, on both desktop and mobile viewport, checking for console errors
- [ ] Prepare 2-3 sample "test personas" (pre-filled answer sets) that produce visibly different, sensible career recommendations — useful for demoing without manually clicking through 60 questions each time
- [ ] Confirm every explicitly-out-of-scope item (WhatsApp, real OTP, real payment, Calendly, DB/backend) is clearly stubbed/mocked and does not attempt any real network call

## Explicitly Not in This TODO (future phases)

Real backend/database, WhatsApp Business API integration, real OTP/SMS provider, Razorpay integration, Cal.com/Calendly booking, webinar tooling, admin dashboard, full 100-career dataset. See PRD.md Section 7.
