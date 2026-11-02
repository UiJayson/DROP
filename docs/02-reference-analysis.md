# DROP — Reference & Gap Analysis

**Status:** Draft v0.1 · **Date:** 2 Nov 2026 · **Market:** Lagos State, Nigeria

**Scope & method.** This compares DROP with Uber, Bolt and inDrive, plus Nigerian Keke-hailing apps I could find online. It uses public pages only (official sites, help centres, the App Store, Nigerian press), read on 2 Nov 2026. Claims are limited to what those pages say. Competitors' own marketing numbers are not repeated or relied on. Things not confirmed in a source are marked *(unverified)*. Hands-on testing of the apps is still to do.

## 1. Competitors at a glance

| App | Model | Notes from sources |
|---|---|---|
| **Uber** | Fixed upfront fare, auto-match | Nigeria safety page lists Share My Trip, RideCheck, PIN verification, 2-way ratings, driver profile, 24/7 support [U1][U2]. Selfie check before a cash rider's first trip in Nigeria [U3]. |
| **Bolt** | Fixed upfront fare, auto-match | Nigeria page lists Emergency Assist, pickup codes, Trusted Contacts, hidden phone numbers, Ride Check, selfie checks on drivers, 24/7 support [B1]. Says it works with driver groups [B2]. |
| **inDrive** | Passenger offers a fare; drivers accept or counter; passenger chooses | Recommended fare plus a recommended minimum. No limit on the number of driver offers. Fare locked once accepted; drivers can't ask for more afterwards [I1][I2]. Passengers choose by price, ETA, rating and car [I1][I3]. |
| **KekeRida** (Keke) | Fare estimate, nearest rider assigned | Lagos-based. NIN + selfie checks; shows rider face, ID and ETA; boarding check-in code by SMS; card/USSD/transfer, and the homepage also mentions cash [K1]. |
| **KekeRide** (Keke, iOS) | Upfront estimate, auto-match | Explicitly sells "no haggling". KYC with national ID; trip sharing; card/transfer/USSD + cash; Standard/Express options [K2]. |
| **Charter Keke** (Keke) | **Shared** rides, cost split | Serves Debari, Shomolu and Yaba. Pay via Paystack; chat with co-riders [K3]. |
| **Trigo** (Keke) | Fixed ₦/km + flat fee | Lists Lagos among its cities; published fare formula; two-way ratings [K4]. |

## 2. Feature-by-feature

### Passenger request flow
- **Done well:** pickup and destination in a few taps; fare shown before booking (Uber/Bolt/Keke apps). inDrive pre-fills a recommended fare and has a comment field (e.g. "I need change", which entrance) [I3].
- **Gaps for Lagos Keke users:** car apps are built around cars. Pickups in Lagos often happen at unnamed junctions, bus stops and estate gates, so typed addresses are weak. Keke apps price the trip automatically, which loses the familiar "Drop" haggle.
- **DROP should:** use landmark-first pickup (pin + "near X" note), keep "Drop" as the core action, and pre-fill a suggested fare so the passenger can request in one tap.

### Rider/driver accept flow
- **Done well:** inDrive lets drivers choose: accept the fare, counter it, or skip [I1][I2]. Uber/Bolt auto-matching is fast.
- **Gaps:** none of the sources mention taking a request while already carrying passengers, which is exactly how Keke riders work. Charter Keke goes the other way and pools riders [K3].
- **DROP should:** let a rider accept while loaded, but show the passenger an honest ETA. Make the accept/counter card glanceable and big-button, readable in sunlight and one-handed.

### Fare negotiation (inDrive)
- **Done well:** recommended fare and minimum; passengers can raise the offer or take a counter; fare locked after acceptance, with a support route for anyone who asks for more [I2].
- **Gaps:** an unlimited stream of offers [I2] can slow decisions. inDrive's own guide warns that very low offers mostly get no takers [I3]. Most Keke apps drop negotiation entirely [K2][K4].
- **DROP should:** use the suggested range + minimum (already in the PRD). Allow one counter per rider, put a short timer on offers, and add a "raise ₦X" nudge. Offer a one-tap "accept suggested" for passengers who don't want to haggle.

### Trip tracking
- **Done well:** live map, ETA, status updates and share links are standard everywhere [U1][B1][K1].
- **Gaps:** inDrive notes that a driver who isn't moving on the map may just have a bad connection [I1]. Weak data is a real problem in Lagos.
- **DROP should:** show a clear "last updated" time on rider location and keep the app working on weak connections. An SMS status fallback is a later idea.

### Safety
- **Done well:** PIN/pickup codes [U2][B1], emergency button [B1], Trusted Contacts [B1][B3], RideCheck/Ride Check [U1][B1], selfie checks for drivers [B1] and for cash riders [U3]. KekeRida sends a boarding code by SMS [K1].
- **Gaps:** these tools are built for closed cars. A Keke is open-sided, and in Lagos rules on which roads Kekes may use matter.
- **DROP should (MVP):** show the Keke plate, colour and rider photo prominently; add a boarding PIN; share-trip; a report button; and two-way verification (passengers verified by phone + OTP). Put a Lagos-relevant emergency flow and RideCheck-style monitoring on the post-MVP list.

### Payments
- **Done well:** support for cash alongside digital payment (Uber/Bolt in Nigeria; KekeRida, KekeRide) [U3][K1][K2]. inDrive and Bolt guidance shows that confirming the payment method before the trip avoids disputes [I2][B4].
- **Gaps:** cash makes commission collection and dispute evidence harder.
- **DROP should:** go cash-first, with the agreed fare locked and shown to both sides plus a "cash received" confirmation. Add bank transfer/USSD next, since local Keke apps already offer them [K1][K2].

### Rider onboarding
- **Done well:** NIN + selfie KYC (KekeRida, KekeRide) [K1][K2]; Bolt's regular real-time selfie re-checks [B1]; Uber screening and vehicle inspection [U1].
- **Gaps:** these flows assume a smartphone and documents to upload. Many Keke riders are organised through parks and unions.
- **DROP should:** let riders start the application in the app and finish it in person at parks. Verify NIN, photo and plate. Use a re-check selfie when a rider goes online. Partner with rider associations (as Bolt says it does with driver groups [B2]).

### UX patterns
- **Done well:** few steps; a clear driver card (photo, plate, rating); a safety shield/centre [U1][U2].
- **Gaps:** dense screens and car-centred wording; few apps are designed for riders using the phone between fares or in harsh light.
- **DROP should:** follow Apple's design guidelines (HIG): large type, plenty of whitespace, one main action per screen, haptics on accept. Use plain English with room for Pidgin later. Choose high-contrast components for the rider app.

## 3. DROP opportunities (prioritised)
1. **Negotiation that fits Keke culture.** A "Drop" with a suggested range, a minimum, one counter per rider and short timers. This keeps the haggle Lagosians know while avoiding inDrive's offer overload. No local Keke app found offers it.
2. **Accept-while-loaded, with honesty.** Riders earn from idle seats and passengers see a truthful ETA. No competitor source covers this.
3. **Landmark-first pickup.** Pin + "near" notes for junctions, bus stops and estate gates.
4. **Trust basics from day one.** Boarding PIN, rider NIN + photo + plate verification, share-trip, two-way ratings, and an agreed fare locked against disputes.
5. **Cash-first, low-friction payments.** Cash at launch with a "received" confirmation; transfer/USSD next.
6. **Park- and union-led rider onboarding.** Faster supply and lower regulatory risk in Lagos.
7. **Weak-connection resilience.** Lightweight app, "last updated" location, SMS fallback later.
8. **Lagos zone awareness.** Service areas fenced to where Keke operation is permitted (rules still to verify).

## Sources (read 2 Nov 2026)
- [U1] Uber Nigeria — Safety: https://www.uber.com/ng/en/ride/safety/
- [U2] Uber Help — Verify your trip: https://help.uber.com/riders/article/what-is-verify-your-trip?nodeId=9a2a4bc6-002b-4461-8e9e-8ea29974795d
- [U3] Tribune — Uber rider selfies for cash riders: https://tribuneonlineng.com/uber-introduces-rider-selfies-to-verify-cash-riders-improve-safety/
- [B1] Bolt Nigeria — Safety: https://bolt.eu/en-ng/rides/safety/
- [B2] BusinessDay — Bolt Nigeria MD interview: https://businessday.ng/interview/article/we-are-committed-to-setting-high-safety-standard-for-ride-hailing-bolt-nigerias-md/
- [B3] BusinessDay — Bolt Trusted Contacts: https://businessday.ng/news/article/bolt-launches-new-contact-safety-feature-for-nigerian-customers/
- [B4] GWG — Ordering a Bolt ride: https://gwg.ng/2026/01/27/how-to-order-a-bolt-ride-and-avoid-common-mistakes/
- [I1] inDrive Help — Request a ride: https://indrive.com/en-in/help/passengers/how-to-request-an-indrive-ride
- [I2] inDrive Help — How fares are calculated: https://indrive.com/en-in/help/passengers/how-fares-are-calculated
- [I3] inDrive Blog — Passengers 101: https://blog.indrive.com/article/passengers-101-how-to-use-our-app
- [K1] KekeRida: https://kekerida.ng/
- [K2] KekeRide (App Store NG): https://apps.apple.com/ng/app/kekeride/id6761985147
- [K3] Charter Keke: https://www.charterkeke.com/
- [K4] Trigo: https://www.trigo.ng/

*Next step:* install and test the apps hands-on to confirm the driver-side flows, which are mostly not covered in the public pages.
