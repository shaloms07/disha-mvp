# SPEC — School Admin Panel (B2B, Frontend-Only Demo Extension)

Companion to PRD.md / SPEC.md / TODO.md for the existing DISHA consumer (B2C) MVP. This document defines a **separate feature surface** — a B2B school admin panel — that lives in the same codebase and reuses the same core scoring/matching logic, but is otherwise a distinct product experience with its own routes and mock data.

## 1. Relationship to the Existing Project

**Correction from an earlier draft of this spec:** this is not a separate B2B product with its own registration/test flow. Schools use the **exact same** `/register → /link → /resume → /test → /results` flow already built for individual parents. The only difference is that a student's registration record carries a `schoolId`, `classId`, and `section` — either because the school generated/pre-associated the link with that context, or because the parent/student entered a school code during registration. The School Admin Panel is a **read/aggregate layer** on top of that same data — it doesn't collect anything new, it just lets school staff see progress and results across many students who went through the identical consumer flow.

- **Do not modify** `lib/scoring.ts` or `lib/matching.ts` — this feature consumes their existing output (six RIASEC scores, ranked career/stream matches), it doesn't change how they work.
- **Do not modify** the core screens (`/register`, `/link`, `/resume`, `/test`, `/results`, `/pricing`) — extend the underlying session data model (Section 3) so each session can optionally carry school context, but the screens and their flow stay the same.
- **Do not build a separate registration/onboarding mechanism for schools.** "Batch onboarding" (Section 4) generates multiple instances of the *same* registration/link flow at once — it is not a different data path.
- New screens live under a `/school` route namespace, kept visually and structurally separate from the parent-facing consumer flow (different navigation, different layout shell — this is an internal staff dashboard, not a continuation of the consumer funnel's design).
- This remains a **frontend-only demo**, matching the constraints of the original SPEC.md: no real backend, no real database, no real authentication/RBAC enforcement, no real WhatsApp/SMS sending. Role-based views are simulated client-side (see Section 5).

## 2. Scope for This MVP

**Included (built as clickable, mock-data-driven screens):**
- Principal Dashboard (Level 1): school-wide completion heatmap, stream demand forecasting view, cognitive benchmarking view, parent dissonance index
- Class Teacher Dashboard (Level 2): section roster/module progress table, individual student flashcard modal, PTM summary sheet export view
- A simple role switcher (Principal / Class Teacher / Student-Parent) to demo different views without real authentication

**Explicitly excluded from this MVP (same exclusions as the base project, plus B2B-specific ones):**
- Real RBAC/permission enforcement, real login, real multi-tenant data isolation
- Real bulk CSV/Excel upload processing (simulate with a mock file-picker that loads pre-baked mock roster data regardless of the file selected)
- Real WhatsApp/SMS invitation sending (simulate the trigger with a toast/confirmation, no real message sent)
- Aptitude, Personality (Big Five), and Work Values modules are now **built with simplified mock scoring** for this pilot — see Section 7. They are not clinically validated instruments; they exist so the dashboard's four-module tracking is functionally real rather than placeholder UI.
- Real PDF export (simulate with an on-screen "PTM Summary" preview; a real export can be added later)
- Real national/CBSE norm benchmarking data (use a small hardcoded mock norms dataset, clearly not claimed as real)

## 3. Data Shapes — Extending, Not Replacing, the Existing Session Model

The existing `SessionState` (from the base SPEC.md) already carries `parentName`, `parentMobile`, `childName`, `childClass`, `responses`, `scores`, etc. This feature adds **optional school-context fields to that same shape** — a session created through a school-issued link is still a `SessionState`, just a more fully-populated one:

```ts
// Addition to the existing SessionState interface — not a new parallel entity
export interface SessionState {
  // ...all existing fields (parentName, parentMobile, childName, childClass,
  // consentGiven, otpVerified, responses, scores, selectedTiers) unchanged...

  schoolId?: string;   // present only if this registration came via a school-issued link/code
  classId?: string;    // e.g., "10-A" — which section this student belongs to
}

export type Role = "principal" | "teacher" | "parent";

export interface School {
  id: string;
  name: string;
  board: "CBSE" | "ICSE" | "IB" | "State";
}

export interface SchoolClass {
  id: string;
  grade: number; // 8-12
  section: string; // "A", "B", etc.
  teacherName: string;
}
```

There is no separate `StudentRecord` type — the dashboards read directly from the same completed `SessionState` records that the consumer flow already produces (`scores`, `hollandCode` if built, and `matching.ts` output for top matches), filtered/grouped by `schoolId` and `classId`.

For this demo, since there's no real backend, simulate a pool of completed sessions:
- `data/school-admin/mockSchool.json` — one sample school
- `data/school-admin/mockClasses.json` — a handful of sample sections across grades 8-12
- `data/school-admin/mockSessions.json` — an array of `SessionState`-shaped mock records (varied completion status, scores, and a few with a `parentStatedPreference` field for the dissonance comparison — see Section 6) — this simulates "many students who already went through /register → /test → /results," which the dashboards then aggregate

## 4. Screens

### `/school/principal` — Principal Dashboard
- **Completion heatmap**: grid of grade × section, each cell showing a completion percentage, color-coded (reuse a similar visual treatment to the existing RIASEC results chart's color logic for consistency)
- **Batch onboarding panel**: a file-picker UI that accepts any file selection and, regardless of content, simulates generating multiple registration links — i.e., running the *same* `mockRegisterSession` flow already built for the consumer product, once per row, tagged with this school's `schoolId` and the relevant `classId` — followed by an "invitations sent" confirmation state (no real send). This is bulk-triggering the existing flow, not a different registration mechanism.
- **Stream demand forecast**: bar chart comparing "stated preference" vs. "psychometric fit" counts across Science/Commerce/Humanities/Vocational (ties into the grade-based stream matching discussed for the consumer product — 8th-10th graders match against streams, not full careers)
- **Cognitive benchmarking view**: simple bar comparison of mock school averages vs. mock "national norm" values across the five domains listed in the spec (Numerical, Verbal, Spatial, Mechanical, Logical) — clearly labeled as illustrative/mock data
- **Parent dissonance index**: a single headline stat (e.g., "32% of Class 10 parents' expectations diverge from psychometric fit") plus a breakdown table, computed client-side from `dissonanceFlag` in the mock student data
- **Webinar trigger button**: opens a confirmation modal, no real invite sent

### `/school/teacher` — Class Teacher Dashboard
- **Section selector**: dropdown limited to the sections the mock "logged in" teacher is assigned to (per the role switcher)
- **Section roster table**: one row per student session, showing their registration → consent/OTP → test → results progress through the existing flow (reuse the same status concept as `test_sessions.status` from the base SPEC.md: registered → consent_given → otp_verified → in_progress → completed). Note: the original brief mentions four modules (Aptitude, Personality, Interest, Work Values) — only Interest (RIASEC) has real scoring built. Show the other three as "Coming soon" columns rather than implying they're tracked, until they're actually built.
- **One-click nudge button** per incomplete row: triggers a mock "reminder sent" toast, no real message
- **Student flashcard modal**: clicking a student row opens a panel showing their top 3 recommended subject combinations or careers (age-appropriate per the grade-based branch from the consumer matching logic), their Holland Code if available, any aptitude/interest gap flags, and parent-preference-vs-fit status
- **PTM summary view**: a clean, printable-looking single page combining a student's key data points — build this as an on-screen view styled for printing (browser print-to-PDF is sufficient for this MVP; no PDF library needed)

### Shared: Role Switcher
- A simple dropdown/toggle (not real auth) letting the demo presenter switch between Principal / Class Teacher / Parent views to show how data scope changes, per the RBAC matrix in Section 5

## 5. Simulated RBAC (Frontend-Only)

Since there's no real backend or auth in this MVP, role-based access is simulated by:
- Storing the "current role" in a simple React Context (`RoleContext`), settable via the role switcher
- Filtering which mock data is shown based on the current role and (for the teacher role) a mock "assigned section" — e.g., the teacher view only ever renders students whose `classId` matches the mock-assigned section, even though in this demo nothing is actually access-controlled at a data layer
- This demonstrates the intended data-scoping behavior from the RBAC matrix (Principal: full school; Teacher: assigned section only; Parent: own child only) for demo purposes, without implementing real security — worth being explicit with stakeholders that this is a UX simulation, not an access-control implementation, before this ever handles real student data

## 6. Open Product Decisions — Resolved

- **School/class tagging — decided: support both paths.**
  1. **Pre-generated links** (batch onboarding flow, Section 4): each link is created already carrying `schoolId`/`classId` before it's sent — this is the primary path for the pilot's bulk rollout.
  2. **School code at registration** (fallback, for anyone registering individually who's still part of the school): add one optional field to the existing `/register` screen — `schoolCode` (text input, optional). If filled, look it up against `mockSchool.json` (client-side, for this demo) and attach `schoolId`/`classId` to the session the same way path 1 does. If left blank, the session behaves exactly as it does today (a normal individual B2C registration, `schoolId` undefined).
  Both paths write to the same `schoolId`/`classId` fields on `SessionState` — the dashboards don't need to know or care which path a given student came through.

- **Parent dissonance input — decided: capture it via a small addition.**
  Add one optional field to `/register` (alongside the existing parent/child fields): *"What career or field do you have in mind for your child, if any?"* (free text or a dropdown pulled from `careers.json` titles — dropdown is preferable, since it lets the dissonance comparison run as a clean string match against `matching.ts` output rather than parsing free text). Stored as `parentStatedPreference?: string` on `SessionState`. The dissonance rule itself: flag `dissonanceFlag = true` when `parentStatedPreference` is **not** present in the student's top-3 matched careers/streams from `matching.ts`. Leave this field optional — many parents won't fill it, and the dissonance index should only be computed over sessions where it's present, not assume a value.

- **Aptitude / Personality / Work Values — decided: build simple mock scoring for these too**, so all four modules mentioned in the original brief are functionally real (if simplified) rather than placeholders. See Section 7 for how these are structured — kept deliberately lightweight (short item sets, straightforward sum-based scoring) rather than clinically-validated instruments, consistent with this whole project being a demo/pilot-readiness build, not a production psychometric platform.

## 7. New Modules: Aptitude, Personality, Work Values (Simplified Mock Scoring)

Same pattern as the existing RIASEC engine — a short, fixed item set, Likert-scored, summed per trait. Each is deliberately lightweight (15-20 items, not 60), since these are pilot-stage additions, not the core product.

### Aptitude (`data/aptitude-questions.json`, `lib/aptitudeScoring.ts`)
5 domains, matching the benchmarking domains named in the original brief: Numerical, Verbal, Spatial, Mechanical, Logical/Abstract. ~15 items (3 per domain), 1-5 self-rated confidence/ease scale (a true aptitude test would need right/wrong answers, not self-rating — flagging that this mock version measures *perceived* aptitude, not tested aptitude; worth being explicit about that distinction anywhere this data is shown, especially in the "Institutional Cognitive Benchmarking" screen, so it isn't mistaken for a real ability test).

### Personality (`data/personality-questions.json`, `lib/personalityScoring.ts`)
Big Five (OCEAN): Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism. ~15 items (3 per trait), standard 1-5 agreement scale, same sum-per-trait approach as RIASEC.

### Work Values (`data/workvalues-questions.json`, `lib/workValuesScoring.ts`)
A smaller set of workplace-value dimensions (e.g., Stability, Independence, Recognition, Helping Others, Creativity, Leadership) — ~12-18 items, same Likert/sum pattern.

### Session flow implication
For school-tagged sessions (`schoolId` present), `/test` should sequence through all four modules (Interest → Aptitude → Personality → Work Values) rather than just RIASEC, before routing to `/results`. For ungated individual B2C sessions (no `schoolId`), keep the flow exactly as it is today — RIASEC only — so the existing consumer funnel and its pricing/conversion behavior isn't disrupted by adding ~50 extra questions to every parent's experience. This means `/test` needs a branch on `schoolId` presence, similar to the grade-based branch already planned for `matching.ts`.

### Dashboard display
The Class Teacher's student flashcard and roster (Section 4) should show real status/scores for all four modules for school-tagged students, and the Principal Dashboard's cognitive benchmarking screen uses real (if simplified/self-rated) Aptitude data instead of a hardcoded mock — still worth labeling the benchmarking screen's data as illustrative/pilot-stage, not a validated national norm comparison, until a real aptitude instrument and real norm data exist.

## 8. What Comes After This MVP (not built now, for context only)

- Real multi-tenant backend with actual RBAC enforcement and data isolation per school
- Real bulk roster upload/parsing (CSV/Excel)
- Real WhatsApp Business API integration for bulk invitations and nudges
- A clinically-validated Aptitude instrument (the mock version here measures self-rated confidence, not tested ability) and validated Personality/Work Values instruments, replacing this pilot's simplified mock versions
- Real PDF generation for PTM summary sheets
- Real national norm benchmarking datasets, sourced and validated
- Billing/subscription layer for the B2B SaaS relationship with schools (separate from the B2C Razorpay flow in the consumer product)

---

# Implementation Record

Everything above is the spec as written. Everything below is what was actually built against it, recorded at the point of completion so the next person does not have to reverse-engineer the decisions from the diff. Sections 1-8 are unchanged.

## 9. Status

All five stages are built. `npm run checks` (five scripts), `npx tsc --noEmit`, `npx eslint .` and `npm run build` all pass, and every route prerenders static.

| Stage | Scope | State |
|---|---|---|
| A | Data model, optional `/register` fields, mock data | Done |
| B | Aptitude / Personality / Work Values modules, `/test` branch | Done |
| C | Principal Dashboard | Done |
| D | Class Teacher Dashboard, flashcard, PTM sheet | Done |
| E | Role switcher, parent view | Done |

### Routes added

| Route | Who | What |
|---|---|---|
| `/school` | — | Redirects to `/school/principal` |
| `/school/principal` | Principal | Heatmap, batch onboarding, stream forecast, benchmarking, dissonance index, webinar trigger |
| `/school/teacher` | Class teacher | Section selector, roster, nudges, flashcard modal |
| `/school/teacher/ptm?s=<token>` | Class teacher | Printable PTM summary for one student |
| `/school/parent` | Parent | One child, and an explicit list of what this role cannot reach |

No consumer route was renamed, removed, or restructured.

### The three ground rules, and how they were held

1. **The individual (non-school) flow is unchanged in behaviour.** A session with no `schoolId` runs one module, 60 questions, the same screens. `scripts/modules-check.ts` asserts this directly (`no schoolId -> one module (Interest), 60 questions, exactly as today`) so a later refactor cannot quietly break it. `/register` keeps its four required fields exactly as they were; the two new fields are optional and sit below a divider, and a blank or unrecognised school code produces precisely the session the screen produced before.
2. **`lib/scoring.ts` and `lib/matching.ts` are untouched.** Both files are byte-identical to what shipped. The three new modules sit on a separate `lib/traitScoring.ts` engine rather than being folded into the RIASEC one, and stream matching reuses `matchCareers(scores, candidates)` by passing stream profiles as the candidate list — which that function already accepted.
3. **`SessionState` was extended, not replaced.** Ten optional fields were added. There is no parallel student entity: every dashboard figure is an aggregation over the same `SessionState` records the consumer flow produces.

## 10. Decisions Taken During Build

These were open or unstated in the spec. Each is recorded with its reasoning so it can be overturned deliberately rather than by accident.

**A bare school code attaches `schoolId` but no `classId`.** `DPSBLR26-10A` resolves to a section; `DPSBLR26` resolves to the school only. Guessing a section from "Class 10" when a grade has two of them would file a student under a teacher who does not teach them. Those students appear in the Principal's totals and in nobody's class list, and the heatmap says so in as many words. Two are in the mock data so the state is visible rather than theoretical. A code naming a section the school does not have is rejected outright rather than silently downgraded.

**The dissonance flag is computed, never stored.** Section 4 described reading a `dissonanceFlag` field from the mock data. Storing it would let it drift from the ranking the parent is actually shown on `/results`. It is recomputed from `matching.ts` on every render instead, and the mock data carries only `parentStatedPreference`.

**One dissonance rule at every grade.** The comparison is against the student's top three matched *careers*, including for Class 8-10 students whom the product otherwise talks to in streams. The parent named a career, so a career ranking is the like-for-like comparison.

**The denominator is stated everywhere it is used.** `parentStatedPreference` is optional, so the index covers 21 of 30 students. Every screen showing it says so rather than implying school-wide coverage.

**Stream demand is two counts over two populations, and says so.** Psychometric fit is counted over the 26 students with an interest score; stated preference over the 21 parents who filled the field. The panel tells the reader to read the shapes, not the totals.

**Cognitive benchmarking is one series plus a reference line, not paired bars.** The norm is a benchmark, not a second measured population; paired bars would invite a comparison of two things not measured the same way.

**`completedAt` is stamped once, at the end of the last module.** For a consumer session that is still the moment RIASEC finishes, so the resulting state is identical to before. For a school session it means all four.

**New module item ids are namespaced** (101-115, 201-215, 301-318) so nothing can ever collide with the RIASEC 1-60, even though each module stores its answers in its own map.

**Streams were authored as four profiles rather than derived from careers.** `data/school-admin/streams.json` holds Science / Commerce / Humanities / Vocational as `CareerProfile`-shaped records. The career-to-stream map for stated preferences lives in `lib/school/streams.ts` rather than being added to `data/careers.json`, keeping the consumer product's data exactly as it shipped.

**The role switcher derives the role from the route rather than holding it in state.** Each role has its own screen, not a shared screen with rows hidden, so holding both would mean keeping two things in sync — and a shared link to the teacher dashboard would render under whatever role was last selected. Deriving it makes that impossible.

## 11. Deviations From the Spec as Written

Three, all deliberate:

1. **The roster shows real status for all four modules, not "Coming soon".** Section 4 was written before Section 7 decided to build the other three modules; Section 7's "Dashboard display" paragraph supersedes it, and that is what was implemented.
2. **A `/school/parent` screen exists.** Section 4 lists only the two dashboards, but Section 5 asks the switcher to demonstrate three scopes. The parent screen is deliberately thin — one child, plus an explicit list of what the role cannot reach — because that thinness *is* the demonstration.
3. **School-tagged runs get a hand-off screen between modules.** Not specified. Four modules run back to back with different answer scales, and swapping the wording and the scale under a student mid-deck reads as a bug. Single-module consumer runs never see it.

## 12. Verification

`npm run checks` runs five scripts; `npm run modules` and `npm run mocks` are the two added here.

- **`scripts/modules-check.ts`** asserts item counts and per-trait distribution, id uniqueness across all four modules, scoring floors/ceilings/midpoints (all-1s to 3, all-3s to 9, all-5s to 15), completion tracking, ranking, the `/test` module branch, and that **every score stored in `mockSessions.json` re-scores exactly from the answers stored beside it**.
- **`scripts/generate-school-mocks.ts`** (`npm run mocks`) regenerates the mock pool deterministically from a fixed seed. It runs real question ids through the real scoring libs and decides each dissonance flag by running the real `getTopMatches`, so the fixtures cannot assert something the product would not produce.

Verified by rendering each page from a dev server and reading the served markup. **Not** verified interactively: hover tooltips, the modal, the batch-onboarding click-through, and the card-deck transition across a module boundary have no browser automation behind them.

Two bugs were caught this way and fixed: the PTM sheet listed the same aptitude finding twice under two different interest headings (now deduplicated by domain, attributed to the stronger interest), and the interest/aptitude gap flag never fired on realistic data because the generator derived aptitude *from* the interest baseline — an `aptitudeTwist` override now gives seven students a genuine divergence.

## 13. Mock Data Shape

`npm run mocks` regenerates all of it. Current pool:

| | |
|---|---|
| Students | 30 across 9 sections, classes 8-12 |
| All four modules complete | 18 (60%) |
| Part-way / not started | 9 / 3 |
| Aptitude scored | 22 |
| Parent named a career | 21, of which 10 diverge (48%) |
| Interest/aptitude gap flagged | 7 of 22 |
| No section (bare school code) | 2 |
| Role scopes | principal 30 · teacher 9 · parent 1 |

Question counts: consumer run 60; school run 108 (Interest 60, Aptitude 15, Personality 15, Work Values 18).

## 14. What This Build Deliberately Does Not Do

Everything in Section 8 still stands. Restating the three that are easiest to mistake for working features, because each is stated on the screen itself and should be stated out loud in any demo:

- **The role switcher is not access control.** Every mock record is in the client bundle regardless of the selected role. It demonstrates the intended scoping; it enforces nothing. This must be said before this code is anywhere near a real student record.
- **Aptitude measures self-rated confidence, not tested ability.** The items ask how easy a task *feels*. There are no right answers to get right. The benchmarking screen carries this on the screen rather than in a footnote, because the screen's shape otherwise implies a validated ability comparison — and the reference line it is compared against is invented for this build.
- **Nothing is sent, parsed, or scheduled.** The file picker ignores the file and loads a fixed roster; invitations, nudges and the webinar produce a confirmation state and no message. The PTM sheet is laid out for A4 and printed by the browser; no PDF is generated.

One more, not in Section 8: the Personality module has **no reverse-scored items**. Every item is keyed positively so a plain sum is valid, which is what makes it a simplified pilot instrument rather than a Big Five inventory. Neuroticism in particular should be presented to a school as "how much pressure this student reports feeling", not as a clinical label.

## 15. Files

```
data/
  aptitude-questions.json  personality-questions.json  workvalues-questions.json
  school-admin/
    mockSchool.json  mockClasses.json  mockSessions.json
    mockNorms.json   mockRosterUpload.json  streams.json
lib/
  traitScoring.ts        # shared engine for the three new modules
  aptitudeScoring.ts  personalityScoring.ts  workValuesScoring.ts
  likert.ts              # RIASEC scale, lifted out of the card component
  testModules.ts         # the module sequence /test walks; the schoolId branch
  school/
    schoolCode.ts        # code lookup; imports no session fixtures
    streams.ts  aggregates.ts  studentInsights.ts
    roles.ts  RoleContext.tsx  mockSchoolApi.ts
components/school/
  DashboardUi.tsx  CompletionHeatmap.tsx  StreamDemandChart.tsx
  CognitiveBenchmark.tsx  DissonanceIndex.tsx  BatchOnboardingPanel.tsx
  WebinarTrigger.tsx  SectionRoster.tsx  StudentFlashcard.tsx
  RoleSwitcher.tsx  ScopeStrip.tsx
app/school/
  layout.tsx  page.tsx  principal/page.tsx
  teacher/page.tsx  teacher/ptm/page.tsx  parent/page.tsx
scripts/
  generate-school-mocks.ts   # npm run mocks
  modules-check.ts           # npm run modules
```

Modified: `types/index.ts`, `lib/validation.ts`, `lib/context/SessionContext.tsx`, `app/register/page.tsx`, `app/test/page.tsx`, `components/TestQuestionCard.tsx`, `app/globals.css`, `package.json`.

### Chart colour, for anyone editing the dashboards

Two tokens were added to `globals.css`. `--color-chart-stated` / `--color-chart-fit` reuse the already-validated `riasec-r` and `riasec-i` hues rather than generating new ones — a generated hue is the thing most likely to fail colourblind separation. The pair validates at dE 18.2 protan and dE 25.7 normal-vision against the card surface. The heatmap ramp `--color-heat-1..5` is a single hue, monotonic in luminance, with white text on the top two steps (4.73:1 and 11.05:1) and ink on the lower three. **If you change either, re-run a contrast/CVD validator rather than eyeballing it**, and keep every value printed as text in its own cell so nothing is encoded by colour alone.
