# DROP — Build Plan

**Status:** Draft v0.1 · **Date:** 2 Nov 2026 · **Aligned with:** 01-PRD, 02-reference, 03-flows-UI, 04-architecture
Milestones are listed in build order. Each one ends with an **approval checkpoint** (Jeremiah signs off before the next starts). No dates are given; durations depend on team size.

## Milestones

### M0 — Project setup
- **Deliverables:** pnpm + Turborepo monorepo (`apps/passenger`, `apps/rider`, `apps/admin`, `packages/shared`, `packages/api-client`, `supabase/`); TypeScript, ESLint/Prettier; CI (lint, typecheck, test); Supabase dev + staging projects; migrations for all core tables, PostGIS, indexes and RLS defaults (deny-all); seed data (Lagos test zone, fare rules, test users); design tokens package (black/Keke Yellow); Sentry; env/secrets handling.
- **Acceptance:** `pnpm dev` runs all three apps; migrations apply cleanly from empty to latest in CI; RLS denies anonymous reads on every table (automated test); Expo dev builds install on an Android device.
- **Checkpoint:** review the repo structure + schema.

### M1 — Clickable prototype
- **Deliverables:** passenger screens (Home, Set trip + landmark note, Fare sheet, Offers, Trip + PIN, Pay + Rate) and rider screens (Home/online, Request card, Counter, Trip + PIN entry, Cash confirm, Earnings) with mock data and the dark theme; core components from 03 §5.
- **Acceptance:** the full happy path can be tapped through on both apps; tokens match 03 (hex values, type scale, 48 dp targets); text pairings pass the contrast check; runs smoothly on a low-end Android test device.
- **Checkpoint:** design review. **This is the main UX sign-off; changes after it cost more.**

### M2 — Auth + rider onboarding
- **Deliverables:** phone OTP (Supabase Auth + SMS provider), profiles; rider KYC flow (NIN, live selfie, plate + Keke photo → private Storage); admin approve/reject (minimal page); push token registration.
- **Acceptance:** a real Nigerian number can sign up end to end; a rider who isn't approved can't go online (server-enforced); KYC files can only be opened through admin signed URLs; OTP rate limits work.
- **Checkpoint:** sign off on the KYC provider choice + document requirements.

### M3 — Request → offers → select (realtime)
- **Deliverables:** `fare-quote`, `create-request`, `raise-offer`, `submit-offer` (accept/counter), `select-offer`, `cancel-request`; PostGIS radius ladder; Realtime channels; offer/request expiry (pg_cron); `rider-status` with seats occupied; location pings.
- **Acceptance:** offers below the minimum are rejected; one counter per rider; expired offers can't be selected; when two passengers select the same rider at once, exactly one trip is created; riders carrying passengers show the badge + padded ETA; requests in restricted zones are blocked.
- **Checkpoint:** demo with 1 passenger + several riders on real devices.

### M4 — Trip flow
- **Deliverables:** arrive/start (PIN)/complete/cancel; live tracking on `trip:{id}`; fare lock trigger; cash confirm/dispute; ratings both ways; share link + public web view; history; report issue; no-show and network edge cases from 03 §3.
- **Acceptance:** a trip can't start without the correct PIN (3 attempts, then locked); the agreed fare can't change; the share link expires when the trip ends; going offline mid-trip doesn't lose state.
- **Checkpoint:** a full trip test on the road with real riders.

### M5 — Admin dashboard
- **Deliverables:** rider review queue; live trips/online riders map; user/trip lookup; reports & disputes; zone + fare-rule editor (min/suggested range); suspend/unsuspend; metrics (requests, acceptance %, time to match, completion, cancellations); audit log.
- **Acceptance:** only the admin role can open it (tested); every admin action is written to the audit log; changes to fare rules apply to new quotes only.
- **Checkpoint:** ops team walkthrough.

### M6 — QA, pilot, launch
- **Deliverables:** full testing pass (below); a pilot in one Lagos zone (chosen after the Keke restriction check) with a set of onboarded riders recruited through parks/associations; feedback loop; fixes; store listings; launch.
- **Acceptance:** launch checklist complete; pilot metrics tracked against the proposed PRD targets; no open critical or high-severity bugs.
- **Checkpoint:** go/no-go to public launch.

## Testing strategy
- **Unit:** fare calculation/range/minimum, state machine transitions, PIN hashing/attempts, shared Zod schemas (Vitest/Jest); UI components (React Native Testing Library).
- **Integration:** edge functions against a local Supabase (`supabase start`), with RLS tests run for each role (passenger, rider, admin, anonymous) to confirm what each can and can't see or change.
- **Realtime & race tests:** scripted scenarios with many simulated riders and passengers: simultaneous selects, a counter arriving after expiry, an offer withdrawn while being selected, raise-offer during fan-out, a rider going offline during the select step, and duplicate requests. Assert that exactly one trip is created and no orphaned offers remain.
- **Device tests:** physical low-end Android phones (low RAM, older Android version, small screen) plus one iPhone. Throttled 3G/2G profiles and airplane-mode toggling mid-trip; check battery and data use per hour online; check sunlight readability outdoors; font scaling up to 200%; TalkBack/VoiceOver.
- **End-to-end:** Maestro (or Detox) flows for the happy paths on both apps in CI where possible.
- **Security checks:** RLS policy review; tests that every state-changing table rejects direct client writes; rate-limit tests (OTP, requests, offers); signed-URL expiry; PIN brute-force; dependency audit; secrets scan; an external security review before launch if budget allows.
- **Field tests:** on-road trips in the pilot zone at different times of day, including night trips.

## Launch checklist
- [ ] Pilot zone selected; Keke operating rules for it verified with the Lagos authorities/associations
- [ ] Rider associations/parks engaged; first riders verified and trained
- [ ] Data protection (NDPA) review done with counsel: privacy notice, consent screens, retention, DPO/registration status
- [ ] Terms of service + rider agreement; dispute & safety policy
- [ ] KYC provider + SMS provider live in production, with rate limits on
- [ ] Production Supabase (backups, point-in-time recovery, region decided), separate from staging; secrets rotated
- [ ] Google Maps API keys restricted by app/package; quotas + billing alerts
- [ ] Sentry + uptime alerts; admin metrics dashboard working
- [ ] Support channel (phone/WhatsApp) staffed during pilot hours; escalation path for safety incidents
- [ ] Play Store (and App Store) listings, privacy labels, screenshots; Expo update channel set up
- [ ] Rollback plan: Expo update rollback + DB migration rollback tested
- [ ] Go/no-go sign-off
