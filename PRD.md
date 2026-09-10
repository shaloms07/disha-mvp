# PRD — DISHA Career Interest Funnel (Frontend-Only MVP)

## 1. Purpose

Build a clickable, demo-ready frontend for a parent-facing career interest assessment funnel, based on Holland's RIASEC model. This MVP exists to validate the **user experience and flow** end-to-end before any backend, database, or third-party integration work begins.

This is a **demo artifact**, not a production app. Anywhere real backend logic would exist, it is simulated with mock data and client-side state so the full flow feels real when clicked through, without needing a server.

## 2. Explicitly Out of Scope for This MVP

- No real database (no Supabase/Postgres/etc.) — all data lives in browser memory/localStorage for the session
- No real backend/API server — any "API calls" are mocked client-side functions with artificial delay
- No real authentication or OTP delivery — OTP step is simulated (accept a fixed test code)
- No WhatsApp / SMS integration — link "sending" is simulated (link is just shown on-screen to copy)
- No real payment gateway (Razorpay etc.) — checkout ends in a mocked success state
- No Calendly/Cal.com booking — consultation tier shows a placeholder "scheduling coming soon" state
- No webinar functionality
- No real email/phone verification or data persistence beyond the browser session

These are all planned for later phases (see project roadmap) but must not block this MVP.

## 3. Users

- **Customer (decision-maker & payer):** Parent
- **End user (test-taker):** Child (school-going, roughly grades 8–12)

The UI must be designed so a parent operates most screens, but the actual 60-question test screen should be presentable to a child (larger tap targets, simple language, encouraging tone).

## 4. Core User Flow (must all be clickable in this MVP)

1. **Landing Page** — marketing/intro page, explains the test, CTA to register
2. **Registration Screen** — parent enters: parent name, parent mobile, child name, child's class/standard
3. **Link Generated Screen** — shows a mock unique link/token for this child's test, with a "Copy Link" button (no real sending — WhatsApp/SMS excluded)
4. **Resume Screen** (simulates opening the link later) — same fields prefilled from registration, editable, plus:
   - Parental consent checkbox (required to proceed)
   - Mock OTP verification step (any code, or a fixed demo code, is accepted)
5. **Test Screen** — 60 RIASEC statements, 1–5 Likert scale, paginated (batches of ~10), progress indicator, cannot advance without answering all items on the current screen
6. **Results / Snapshot Screen** — shows the free result: a radar or bar chart of the six RIASEC scores (R/I/A/S/E/C) plus a short plain-language interpretation of the top types
7. **Pricing / Cart Screen** — add-on style tier selection:
   - Detailed Report — ₹199
   - + Roadmap — ₹499 total
   - + 1:1 Consultation — ₹1499 total
   - "Checkout" ends in a mocked success/confirmation screen (no real payment)
8. **Mock Report Preview** (optional stretch) — a static/sample view of what the paid detailed report + top 3–4 recommended careers with match ratings would look like, using mock career-matching data

## 5. Success Criteria for This MVP

- A stakeholder can click through the entire flow above, start to finish, without hitting a dead end or console error
- The flow "feels real" — loading states, transitions, and confirmations are present even though nothing is actually persisted or sent
- The visual design is presentable enough to show to potential investors/partners or use in a demo video
- The scoring logic (60 answers → six RIASEC totals) and the career-matching logic (six scores → ranked mock career list) both genuinely work client-side, using mock data — these are the two pieces of real product logic worth proving out now, even before there's a backend

## 6. Design Notes

- Mobile-first: majority of parent traffic will be on phones
- Keep tone warm and non-alarming — this is about a child's interests, not a pass/fail exam
- Follow the RIASEC type key: R = Realistic, I = Investigative, A = Artistic, S = Social, E = Enterprising, C = Conventional

## 7. What Comes After This MVP (not built now, for context only)

- Real backend + database (parents, children, test_sessions, responses, scores, career_pathways, recommendations, orders, bookings)
- WhatsApp Business API integration for link delivery
- Real OTP verification (MSG91/Twilio)
- Razorpay payment integration
- Cal.com/Calendly consultation booking
- Admin dashboard, webinar tooling
