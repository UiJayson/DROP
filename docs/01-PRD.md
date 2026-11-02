# DROP — Product Requirements Document (MVP)

**Status:** Draft v0.1 · **Date:** 2 Nov 2026 · **Owner:** Jeremiah

## 1. Overview & Problem
In Nigerian communities, saying **"Drop"** to a Keke (tricycle) rider means hiring it for a direct, solo trip instead of a shared route. Today that requires standing by the road, flagging Kekes, and haggling — slow, unpredictable, and hard at night or in low-traffic areas.

**DROP** is an on-demand Keke booking app with negotiated fares (inDrive-style). A passenger requests a Drop and proposes a fare; nearby registered riders accept it or counter-offer, even if they are already carrying passengers or waiting at a park. The passenger picks an offer, sees the rider, Keke, ETA and agreed fare, and the trip proceeds.

**Launch market:** Nigeria, starting with Lagos State.

**Problems we solve**
- **Passengers:** no reliable way to summon a Keke for a direct trip; uncertain wait times and fares; safety concerns with unknown riders.
- **Riders:** idle time between fares; earnings limited to street demand they can physically see.

**Vision:** reliable, accessible, community-focused transport that increases Keke rider earnings and gives passengers convenience. UI follows Apple's Human Interface Guidelines feel: clear, calm, minimal.

## 2. Goals & Success Metrics
All numeric targets are **proposed** and to be validated after launch-city selection.

| Goal | Metric | Proposed target (first 90 days) |
|---|---|---|
| Reliable matching | Requests accepted by a rider | ≥ 70% |
| Fast matching | Median time from request to offer selected | ≤ 2 min |
| Trips completed | Accepted trips completed (not cancelled) | ≥ 85% |
| Rider earnings | Active riders completing ≥ 1 Drop/day | ≥ 50% of active riders |
| Retention | Passengers making a 2nd trip within 30 days | ≥ 40% |
| Safety & trust | Avg. trip rating | ≥ 4.5 / 5 |

## 3. Users
- **Passengers:** community residents, students, workers, traders needing a quick direct trip. Often price-sensitive; varied smartphone and data quality.
- **Keke riders:** owner-operators or hire-purchase riders. Earn per trip, tend to use Android phones, and need simple, glanceable flows they can use between fares.
- **Admin (DROP ops):** small internal team who onboard and verify riders, monitor trips, and handle disputes and safety reports.

## 4. MVP Features

### Passenger app
- Sign up / log in with phone number + OTP
- Set pickup (GPS or pin) and destination (search or pin)
- See a suggested fare range; propose own fare (not below the minimum)
- Request a Drop; raise the offer if no takers; cancel before pickup
- Review incoming rider offers (fare, ETA, rating, Keke) and pick one
- After picking, see rider name, photo, Keke plate/colour, rating, live ETA, and agreed fare
- Live rider location on map; call rider
- Trip status: accepted → arriving → in trip → completed
- Pay rider (cash at MVP; see open questions)
- Rate rider after the trip; basic trip history
- Share trip details with a contact; report an issue

### Rider app
- Sign up with phone + OTP; submit verification details (ID, photo, Keke plate, papers)
- Online/offline toggle
- Receive nearby Drop requests with pickup, destination, distance, passenger's offer; accept, counter-offer, or ignore within a timeout
- Accept while carrying passengers or waiting at a park; rider-set availability
- Navigate to pickup (hand off to Google Maps); call passenger
- Start / complete trip; confirm cash received
- Daily earnings and trip history
- Rate passenger

### Admin (web dashboard)
- Rider onboarding queue: review documents, approve/reject/suspend
- Live view of active trips and online riders
- Trip and user lookup; handle reports and disputes
- Configure minimum fare and suggested fare ranges (by distance/zone), plus service area
- Basic metrics: requests, acceptance rate, completed trips, cancellations

## 5. Out of Scope for MVP
- Card/wallet payments and in-app rider payouts (unless decided otherwise)
- Shared rides / route pooling, scheduled rides, multi-stop trips
- Surge/dynamic pricing, promos, referrals, loyalty
- In-app chat, in-app turn-by-turn navigation
- Expansion beyond Lagos State, multiple languages beyond English (Pidgin/local languages later)
- Deliveries/parcels, fleet-owner tools, rider financing
- SOS integration with emergency services

## 6. Key Assumptions & Open Questions
**Assumptions**
- Enough riders in the launch area own smartphones with mobile data
- Passengers and riders are comfortable negotiating in-app (mirrors street haggling)
- Passengers will pay a premium over shared-route fares for a direct Drop
- Riders will accept app requests while partly loaded or waiting at parks
- Lagos State restricts Keke operation on some roads/LGAs; the exact current rules must be verified before choosing launch zones and setting service areas
- Cash is the dominant payment method at launch

**Open questions**
1. **Pricing — RESOLVED:** negotiated (inDrive-style). Passenger proposes within a suggested range above an admin-set minimum; riders accept or counter; passenger picks. Still open: offer timeout length and how many counters are allowed.
2. **Payments:** cash only at MVP, or cash + card/transfer? Commission collection model if cash-only (e.g., subscription or rider wallet top-up)?
3. **Business model:** per-trip commission vs daily/weekly rider subscription?
4. **Rider verification:** which documents (NIN, driver's licence, Keke permit/union card)? In-person onboarding? Union/association partnership?
5. **Accept-while-loaded:** how to handle existing passengers in a "solo" trip — drop them first, cap ETA, or disclose to passenger?
6. **Launch market — RESOLVED:** Nigeria, starting with Lagos State. Still open: which LGAs/neighbourhoods first, based on where Keke operation is permitted.
7. **Platforms:** Android-first for riders? Passengers iOS + Android, or Android-first plus a PWA?
8. **Connectivity:** need for low-data mode or USSD/SMS fallback?
9. **Regulation:** local government/union rules on Keke operation and ride-hailing licensing?

## 7. Risks
- **Supply cold start:** too few online riders → failed requests → passenger churn. *Mitigation:* concentrate in one small area; onboard via parks/unions.
- **Off-platform leakage:** riders and passengers swap numbers and bypass the app. *Mitigation:* low/flat fees, rider benefits, safety value.
- **Safety & trust incidents:** harm to reputation. *Mitigation:* verification, trip sharing, ratings, fast admin response.
- **Fare disputes:** especially with cash. *Mitigation:* agreed fare locked and logged in trip record.
- **Lowballing:** passengers offer unrealistically low fares and riders ignore them. *Mitigation:* enforced minimum, suggested range, prompt to raise the offer.
- **Slow matching:** back-and-forth negotiation delays pickup. *Mitigation:* short offer timeouts, a limit on counter-offers, one-tap accept of the suggested fare.
- **Connectivity / device limits:** poor GPS or data breaks flows. *Mitigation:* lightweight app, graceful retries.
- **Regulatory or union pushback:** levies, bans, or rider association resistance. *Mitigation:* engage early, partner.
- **Lagos Keke restrictions:** trips routed onto restricted roads/LGAs expose riders to enforcement. *Mitigation:* verify current rules; geofence service areas; flag restricted destinations.
- **"Drop" expectation broken:** accepting while loaded may delay or crowd a solo trip. *Mitigation:* clear rules and ETA honesty.
