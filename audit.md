# DROP audit

**Date:** 8 Nov 2026. **Investigation only.** No hosted database was opened or changed. Practice project `lgqmujzumzppyirtsmbm` is not verified from this repo.

## Stage

|                  |                                                                                                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product          | Lagos Keke MVP. Negotiated fare, riders already carrying passengers may accept, cash only.                                                                                                                                                                   |
| Merged on `main` | `7a1a281` — M0–M4 (auth, matching, PIN, live trip, cash, cancel).                                                                                                                                                                                            |
| Open, not merged | [PR 7](https://github.com/UiJayson/DROP/pull/7) `cursor/drop-dark-ui-7759` @ `5d0f0b0`. Visual only: charcoal gradient, white fares/plates/PIN, yellow actions. CI on that commit: lint/typecheck/test **success**, migrations/RLS **success** (7 Nov 2026). |
| This file        | Docs only, added on the PR 7 branch after `5d0f0b0`.                                                                                                                                                                                                         |

**Works in code (merged, and still true on the UI branch):** phone sign-in client, rider KYC upload, admin approve/reject, fare quote with zone checks, request/offer/select, hashed PIN with 3 attempts and a 1-minute cap, trip statuses, cash completion for the locked fare, cancel that does not mark cash paid, passenger-only PIN row.

**Not the same as the offline HTML demo.** The demo never calls Supabase. Limits below are about the connected apps unless marked “demo only”.

## Checks run on 8 Nov 2026

- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`: all passed on `cursor/drop-dark-ui-7759`.
- Local Supabase Postgres already running on port 54322: `supabase/tests/01_foundation.sql`, `02_m2_kyc.sql`, `03_m3_matching.sql`, `04_m4_live_trip.sql` all passed (`ON_ERROR_STOP`). Not re-applied to any hosted project.
- Not run: physical Android/iOS, TalkBack, hosted project queries, Realtime payload capture.

## Top 5 (do in this order)

1. Stop writing a fake Ikeja GPS fix when the rider’s location is off.
2. Do not let a connected passenger request from the sample Ikeja point unless they confirm it.
3. Add real foreground location permission for a device build (Jeremiah installs the build).
4. Jeremiah: phone sign-in on the practice project, and one admin user. Cursor does not configure SMS or create that account.
5. Treat the repo service area as the Ikeja test rectangle until Jeremiah confirms the practice map. Do not expect Festac prototype places to match there.

## Must fix before connected testing

- [ ] **High. Proven.** Rider matching location is faked. `apps/rider/src/board.tsx` `send` (about lines 120–130) calls `pingRiderLocation` with `ikejaTestPickup` when `navigator.geolocation` fails, every 30s while online. The screen says Allen Avenue, but `ping_rider_location` stores it as `riders.last_location`, which matching uses. **Change:** if there is no device fix, do not call `ping_rider_location`. Stay offline for matching and keep the message. **Accept:** SQL or app test — no location permission means no new `last_location` write. **Cursor.**

- [ ] **High. Proven.** Connected passenger pickup starts as Allen Avenue, Ikeja (`apps/passenger/src/booking.tsx` initial state, about lines 174–183). GPS success replaces it. GPS failure leaves the sample point, and Request DROP can send it. Search copy shows `pickupLabel`, which is easy to miss. **Change:** block `createRideRequest` until a device fix exists or the passenger explicitly confirms the sample point. **Accept:** with geolocation denied, Request DROP does not create a row. **Cursor.**

- [ ] **High. Unverified risk.** `trips` is in `supabase_realtime` with `replica identity full` (`20261102180000_m3_matching.sql`). `pin_hash` is on that table. Column grants hide it from PostgREST (`20261102150100_rls.sql`). It is not proven that Realtime omits the column. Plaintext PIN is only in `trip_boarding_pins`, passenger RLS, not in the publication (`20261106120000_m4_live_trip.sql` policy about lines 71–80). **Change:** capture one Realtime update as the rider. If `pin_hash` appears, stop publishing that column. **Accept:** rider payload has no `pin_hash` and no `pin_code`. **Cursor** on local Postgres. Do not test this on the hosted project from this audit.

- [ ] **Setup. Jeremiah.** Practice phone sign-in. `supabase/config.toml` `[auth.sms.test_otp]` (lines 273–277) is local only (`123456` on four `800` numbers). Hosted Supabase ignores that file. Termii stays deferred. **Outcome:** Jeremiah turns on phone auth on the practice project (Supabase test OTP or any provider already available). **Accept:** Ada’s number can sign in on the practice URL. **Not Cursor.**

- [ ] **Setup. Jeremiah.** One admin. `admin_review_rider` refuses non-admins (`20261102170000_m2_auth_kyc.sql` about lines 348–350). Seed admin Funke is local seed, not proof of a hosted admin. **Accept:** that user can approve a pending rider in the admin app. **Not Cursor.**

- [ ] **Proven mismatch. Confirm before a Festac trial.** Repo seed zone is “Lagos — Ikeja test zone”, roughly lng 3.32–3.38, lat 6.58–6.63 (`supabase/seed.sql` lines 269–278), plus a sample restricted block that is not a legal boundary. Festac prototype places sit outside that box, so a connected Festac request should be rejected. **Cursor:** do not invent a polygon. **Jeremiah:** look in the practice Studio and say whether that rectangle is still the zone. **Accept:** a point outside the rectangle cannot `create_request`.

## Must finish before real users

- [ ] **High. Proven gap.** No Android/iOS location permission. `apps/rider/app.json` and `apps/passenger/app.json` have no location strings or `expo-location`. Rider GPS is `navigator.geolocation` in `board.tsx` and `LiveTripScreen.tsx`. Fine for a browser trial; a store or dev build will not prompt. **Change:** `expo-location` foreground permission and use it for matching pings and trip updates. Background tracking can wait. **Accept:** a debug Android build shows the system prompt and a real fix. **Cursor** writes the code. **Jeremiah** installs it.

- [ ] **High. Intentional stand-in.** NIN is not a real check. `mock_verify_nin` (`20261102170000_m2_auth_kyc.sql` lines 97–124) accepts any 11 digits except `0000` / `00000000000`. `submit_rider_onboarding` calls it. Full NIN is not stored. Going online still needs admin (`riders_block_unapproved_online`). **Change:** swap the mock when a provider is chosen (`docs/06-signup-and-nin.md`). **Accept:** a made-up NIN cannot pass. **Cursor** after Jeremiah picks the provider and supplies credentials. **Not before an Ikeja staff test** if a human still approves every rider.

- [ ] **Medium. Proven.** Any signed-in user can write `route_cache` as source `google` inside 0.85×–3× the straight line (`cache_road_distance`, `20261102180000_m3_matching.sql` lines 500–562). `fare_quote` prefers that row (`_road_distance` lines 357–372). Minimum fare and the ₦50 step still apply. **Change:** only the server may set `source = google`, or stop trusting the client distance. **Accept:** a passenger RPC cannot change the quoted metres. **Cursor.**

- [ ] **Medium. Proven.** Trip RPCs are not queued. No NetInfo/retry around `start_trip`, `complete_trip`, or `cancel_trip`. A dropped call leaves the previous status; the passenger reloads an open trip on launch (`booking.tsx` `loadTrip`). **Change:** retry the same button safely (RPCs are already idempotent for arrive/start/complete). **Accept:** airplane mode mid-confirm shows an error and a second tap after reconnect matches the server. **Cursor.**

- [ ] **Medium. Proven.** “Not paid” is not stored on the live path. Rider `LiveTripScreen.tsx` line 226 `Not yet` only closes the confirm step. Prototype `cashNo` does not call the database. **Change:** optional `payments.status = disputed` plus an admin row, or leave it and say disputes are manual. **Accept:** if implemented, both phones show the same status and the fare is unchanged. **Cursor**, only if Jeremiah wants disputes in the pilot.

- [ ] **Setup. Jeremiah, after Cursor’s location change.** One Android phone for passenger and one for rider, inside the Ikeja test rectangle. Confirm PIN, wrong PIN lock, cash, and cancel. Web screenshots are not that test.

- [ ] **Decision. Jeremiah.** Merge PR 7 only after he accepts the look. It does not block an Ikeja test on current `main`.

## Can wait

- [ ] Background GPS, lock-screen trip status, ratings, share link, trip history, report button that writes `reports`, re-opening the request when a rider cancels (`cancel_trip` only cancels; passenger can request again).
- [ ] Termii specifically. Any working Supabase SMS is enough for a staff test.
- [ ] Store listing, EAS, and production Supabase. No `eas.json` in the repo.
- [ ] Prototype-only copy when Supabase is unset: rider screen `Prototype PIN · 4821` (`RiderScreens.tsx` line 534), passenger `BOARDING_PIN`, and “5 riders are viewing”. Do not show that PIN on a connected trip. Connected PIN comes from `select_offer` / `trip_view`.
- [ ] UI polish beyond PR 7.

## What is already in good shape

- State changes go through RPCs. Clients do not have table writes for trips, offers, or payments. Fare and cash amount locks exist. Tests cover minimum fare, one counter, one trip per rider, PIN hash, PIN hidden from other riders, wrong-PIN lock, cash equals fare, cancel keeps fare and does not confirm cash.
- `mock_verify_nin` is not granted to the client.
- Map with no key stays a labelled preview. Trip “Send test location” uses `source = simulated` and does not update `riders.last_location` (SQL test). The Ikeja matching ping above is the hole.

## Who does what

| Cursor can code                                                                                               | Jeremiah must do                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ikeja ping stop, pickup confirm, Realtime PIN check, `expo-location` foreground, route-cache trust, RPC retry | Practice phone-auth provider, admin user, confirm the live zone in Studio, install a device build, pick a NIN provider later, merge/deploy approval |

## Cursor kickoff

```
Read /audit.md on branch cursor/drop-dark-ui-7759 (PR 7, not merged). main is 7a1a281.
Do only the "Must fix before connected testing" code tasks, in order:
1) apps/rider/src/board.tsx — do not call pingRiderLocation with ikejaTestPickup.
2) apps/passenger/src/booking.tsx — do not create_request from the sample Ikeja point unless the passenger confirms that pickup.
3) Local-only check: rider Realtime payload must not include trips.pin_hash or trip_boarding_pins.pin_code. Fix the publication if it does.
Do not query or edit hosted Supabase (lgqmujzumzppyirtsmbm) or TERK/harbor.
Do not add Termii, NIN provider, background GPS, ratings, share, or history.
Preserve cash-only, fare lock, one counter, PIN 3-attempt lock, and cancel-does-not-mark-paid.
Inspect and add tests. Do not merge or deploy.
Leave phone-auth, admin user, zone confirmation, and a physical phone to Jeremiah.
```
