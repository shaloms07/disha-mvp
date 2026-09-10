# Technical Spec — DISHA Frontend-Only MVP

Companion to PRD.md. This defines the tech stack, project structure, data shapes, and page-by-page behavior needed to scaffold the project. No backend, database, or third-party service is wired up in this phase — everything below is designed to run entirely in the browser.

## 1. Tech Stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts (for the RIASEC radar/bar chart on the results screen)
- **State management:** React Context + `useState`/`useReducer` — no external state library needed at this scale
- **"Persistence":** `sessionStorage`/in-memory state only, to simulate the registration → later resume flow within one browser session. No real backend calls.
- **Routing:** File-based routing via Next.js App Router, one route per screen (see Section 3)
- **No auth library, no DB client, no payment SDK** in this phase — these are stubbed with fake async functions (see Section 5)

## 2. Project Structure

```
disha-mvp/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── register/page.tsx           # Registration screen
│   ├── link/page.tsx               # Link-generated screen
│   ├── resume/page.tsx             # Resume + consent + mock OTP screen
│   ├── test/page.tsx                # 60-question test screen
│   ├── results/page.tsx             # Snapshot results screen
│   ├── pricing/page.tsx             # Pricing/cart screen
│   ├── report-preview/page.tsx      # Mock detailed report (stretch goal)
│   └── layout.tsx
├── components/
│   ├── ui/                          # Buttons, cards, progress bar, form fields
│   ├── TestQuestionCard.tsx
│   ├── RiasecRadarChart.tsx
│   ├── PricingTierCard.tsx
│   └── ConsentCheckbox.tsx
├── lib/
│   ├── mockApi.ts                   # Fake async functions simulating backend calls
│   ├── scoring.ts                   # RIASEC scoring logic
│   ├── matching.ts                  # Career similarity/matching logic
│   └── context/
│       └── SessionContext.tsx       # Holds parent/child/test-session state across screens
├── data/
│   ├── questions.json               # 60 RIASEC statements + type mapping
│   └── careers.json                 # ~10-15 mock career profiles for MVP (not full 100 yet)
├── types/
│   └── index.ts                     # Shared TypeScript types
└── public/
```

## 3. Routes / Screens

| Route | Screen | Notes |
|---|---|---|
| `/` | Landing page | Static marketing content, CTA → `/register` |
| `/register` | Registration | Form: parent name, mobile, child name, child class → generates mock session |
| `/link` | Link generated | Shows mock link + "Copy Link" button → simulates the WhatsApp-send step without sending anything |
| `/resume` | Resume + consent + OTP | Prefilled editable form, consent checkbox, mock OTP input (any code accepted, or fixed demo code `1234`) |
| `/test` | Test | 60 questions, paginated ~10 per screen, progress bar |
| `/results` | Snapshot results | Radar chart of 6 scores + short interpretation text |
| `/pricing` | Pricing/cart | Tier selection, mock checkout → success state |
| `/report-preview` | Mock detailed report (stretch) | Static rendering using mock top-3 career matches |

## 4. Data Shapes

### `types/index.ts`
```ts
export type RiasecType = "R" | "I" | "A" | "S" | "E" | "C";

export interface Question {
  id: number;
  text: string;
  type: RiasecType;
}

export interface CareerProfile {
  id: string;
  title: string;
  description: string;
  profile: Record<RiasecType, number>; // 1-10 scale per type
  roadmap?: {
    exams: string[];
    collegesOrPaths: string[];
    steps: string[];
  };
}

export interface SessionState {
  parentName: string;
  parentMobile: string;
  childName: string;
  childClass: string;
  consentGiven: boolean;
  otpVerified: boolean;
  responses: Record<number, number>; // questionId -> score 1-5
  scores?: Record<RiasecType, number>; // computed totals
  selectedTiers: {
    detailedReport: boolean;
    roadmap: boolean;
    consultation: boolean;
  };
}
```

### `data/questions.json`
Array of 60 objects matching `Question` above — text and type drawn directly from the RIASEC exam paper already provided (10 items per type, R/I/A/S/E/C cycling).

### `data/careers.json`
For the MVP, already included **Few representative careers** (not the full 100 planned for production), each with a `profile` object like:
```json
{
  "id": "software-engineer",
  "title": "Software Engineer",
  "description": "Builds and maintains software systems and applications.",
  "profile": { "R": 3, "I": 9, "A": 2, "S": 2, "E": 4, "C": 6 },
  "roadmap": {
    "exams": ["JEE Main", "JEE Advanced", "BITSAT"],
    "collegesOrPaths": ["B.Tech Computer Science", "B.Sc Computer Science"],
    "steps": ["Build strong math/logic foundation", "Learn a programming language", "Build small projects"]
  }
}
```

## 5. Core Logic (real, not mocked)

Even though there's no backend, these two pieces of logic should be **fully implemented and correct** in this MVP, since they're the actual product:

### `lib/scoring.ts`
- Input: `responses` (60 answers, 1-5 each)
- Group by `type` from `questions.json`, sum each group (10 items per type → range 10-50)
- Output: `Record<RiasecType, number>`

### `lib/matching.ts`
- Input: child's 6 scores (rescaled to 1-10, matching career profile scale) + `careers.json`
- Compute similarity (cosine similarity or normalized distance) between child profile and each career profile
- Return careers ranked by similarity, with a derived star rating (e.g., top similarity band → 9-10 stars, down to lowest → 1-2 stars)
- Output: sorted array of `{ career: CareerProfile, matchScore: number, stars: number }`

## 6. Mocked "Backend" Behavior (`lib/mockApi.ts`)

Simulate realistic async behavior (loading states, delays) without any real network/backend call:

```ts
export async function mockRegisterSession(data: RegistrationInput): Promise<{ sessionToken: string }> {
  await delay(600);
  return { sessionToken: generateMockToken() };
}

export async function mockSendOtp(mobile: string): Promise<{ success: true }> {
  await delay(500);
  return { success: true }; // no real SMS sent
}

export async function mockVerifyOtp(code: string): Promise<{ verified: boolean }> {
  await delay(500);
  return { verified: code === "1234" || code.length === 4 }; // accept any 4-digit code for demo
}

export async function mockCheckout(tiers: SelectedTiers): Promise<{ success: true; orderId: string }> {
  await delay(800);
  return { success: true, orderId: generateMockOrderId() };
}
```

All screens should call these functions (not fetch a real API), so swapping in a real backend later means replacing the contents of `mockApi.ts` without touching the screens themselves.

## 7. Pricing Logic (client-side only)

Static tier data, additive pricing, no real payment:

```ts
export const PRICING = {
  detailedReport: 199,
  roadmapAddOn: 300,   // + report = 499
  consultationAddOn: 1000, // + report + roadmap = 1499
};
```
Display real incremental pricing (no fabricated "original price" strikethroughs) — show it as "Report ₹199 → + Roadmap (+₹300) → + Consultation (+₹1000)".

## 8. Non-Functional Requirements

- Mobile-first responsive layout (majority of traffic will be on phones)
- No console errors across the full click-through
- Reasonably accessible: proper form labels, sufficient tap-target sizes, visible focus states
- Loading states on every mock async call (spinner or skeleton, not an instant jump) so the demo feels realistic
- Session state should survive a page refresh within the same browser tab (use `sessionStorage`, not just in-memory React state, so a refresh doesn't wipe progress)

## 9. Explicit Non-Goals (repeat from PRD, for engineering clarity)

Do not implement: real database, real backend/API server, real OTP/SMS delivery, WhatsApp integration, real payment gateway, Calendly/Cal.com booking, webinar tooling, admin dashboard, or the full 100-career dataset. All of these are planned for later phases.
