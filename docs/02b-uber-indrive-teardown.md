# DROP — Uber & inDrive Product Teardown (Research, no design)

**Status:** Draft v0.1 · **Date:** 2 Nov 2026 · **Builds on:** 02-reference-analysis.md

**Method & limits.** This uses public sources only: help centres, official blogs, the Uber Engineering blog, Nigerian press. Page content was read through web-search results on 2 Nov 2026; links are listed at the end. No apps were installed, no private APIs or hacking. Where a claim comes from a headline only, it says so. Features vary by country (Uber and Bolt say so explicitly [U-SAFE]), so a Lagos hands-on check is still needed. Things not confirmed in a source are marked *(unverified)*.

---

## Part A — Uber (reverse-engineered)

### A1. Passenger journey
| Stage | What Uber does | Source |
|---|---|---|
| Open → Home | The map fills the screen with a "Where to?" bar and saved/recent places; the request is built in a bottom sheet over the map | General pattern *(unverified for the current Nigerian build)* |
| Set destination | Search or pin; multi-stop supported (drivers see every stop before accepting) | [U-DRVBASICS] |
| Ride options / fare | A list of products (UberX, Comfort, etc.) with an **upfront price**; the "i" icon shows the wait-time fee rules | [U-WAIT] |
| Request → matching | Uber picks the driver automatically; the passenger doesn't choose | [U-INFOQ] |
| Driver arriving | Driver card: photo, name, plate, car make/model, rating, trips completed, time on platform; live map and ETA | [U-SAFE] |
| Pickup verification | "Check your ride" (plate, make/model, photo); optional **4-digit PIN** on every trip or only at night (9pm–6am); trip can't start without it | [U-PIN][U-SAFE] |
| In-trip | GPS-tracked, Share My Trip, RideCheck (detects unusual long stops), Safety Toolkit (shield icon), emergency button | [U-SAFE][U-TIPS] |
| Payment | Card (authorisation hold for the upfront price) or cash; in Nigeria a selfie is required before a cash rider's first trip | [U-CXLREV][U-SELFIE] |
| Rating | Two-way ratings; consistently low ratings can lead to deactivation | [U-SAFE] |
| Support | 24/7 in-app support, incident reporting, fee dispute forms | [U-SAFE][U-CXLREV] |

### A2. Driver journey
- **Onboarding:** criminal background screening; vehicle inspection; real-time ID checks [U-SAFE][U-SELFIE].
- **Going online:** tap **GO** [U-REQ].
- **Request card:** the bottom bar turns black and shows trip details; **15 seconds** to decide; tap anywhere to accept, **X** to decline [U-REQ]. The card shows the upfront fare, pickup/dropoff cross streets, rider rating and trip duration [U-UPFRONT][U-DRVBASICS].
- **Upfront earnings:** expected take-home pay is shown before accepting, already net of Uber's fee and including surge. Tips and wait fees are added after the trip, and the fare is adjusted if the trip changes substantially [U-UPFRONT][U-UPFRONT-CA].
- **Navigation:** built into the app, with a choice of outside navigation apps *(unverified detail)*.
- **Earnings:** an Earnings tab/hub with instant or scheduled cash-out [U-DRVBASICS]. **Incentives:** Quests and promotions paid separately [U-UPFRONT].
- **Driver welfare:** limits on consecutive driving hours; speed limit alerts [U-SAFE].

### A3. Safety (summary)
PIN, Check Your Ride, Share My Trip + Trusted Contacts, RideCheck, emergency button, number masking (in some areas), 24/7 incident team, insurance, background checks, and selfie checks for cash riders in Nigeria [U-SAFE][U-TIPS][U-PIN][U-SELFIE].

### A4. Payments
Card (with an authorisation hold) and cash. Fares are dynamic and include surge; earnings are adjusted when trips change [U-CXLREV][U-UPFRONT]. In Lagos, the press reports that drivers prefer cash and cancel card trips because card payouts are delayed, and that some take trips "offline" to avoid the commission [P-TECHBOOKY].

### A5. Cancellations / no-show
- A **rider cancellation fee** may apply after a threshold (help pages give different numbers, e.g. 2 min after acceptance vs 7 min after request for economy rides). It's waived if the driver isn't making progress or is 5+ min late [U-CXL][U-CXLREV].
- **Driver no-show wait:** about 5 min for economy before the driver can cancel with a fee; a **wait-time fee** starts after 2 min for UberX [U-CXL][U-WAIT].
- A cancellation reason survey suggests alternatives (call the driver, find another) [U-CXLSTEPS]. Fees vary by location and demand [U-CXLSTEPS].

### A6. Notifications
Push notifications for match/arriving/arrived; share-trip contacts get an SMS or push with live tracking [U-TIPS]. Drivers get the request on screen with a countdown [U-REQ].

### A7. UI patterns
- **Map first:** the map is the base layer; everything else sits on top.
- **Bottom sheet as a state machine:** the sheet's content changes for each stage (search → options → searching → driver assigned → on trip → rate).
- **One main action per state** (Request, Accept, Start, Complete); destructive actions are hidden behind "⋯" [U-CXLSTEPS].
- **Colour flip to mark urgency:** a white bar → black bar for an incoming request [U-REQ].
- **Always-reachable safety shield** [U-SAFE].

### A8. High-level architecture (from Uber Engineering)
- **Microservices:** moved from a monolith to hundreds of services; Thrift used to give strict interfaces between services; they warn about creating a "distributed monolith" [U-SOA].
- **Dispatch (2015):** separate **supply** and **demand** services track state machines (seats, wheelchair support, etc.). **DISCO** matches them, considering drivers who *will become free* (e.g. finishing a drop-off) as well as idle ones, aiming for less waiting, less extra driving and lowest overall ETA [U-INFOQ][U-QCON].
- **Geo sharding:** Google S2 cells shard dispatch data; S2 cell coverage is used to find nearby drivers [U-INFOQ].
- **Ringpop:** a Node.js library: SWIM gossip membership + consistent hashing + request forwarding, used to shard dispatch across stateful nodes [U-RINGPOP][U-INFOQ].
- **H3:** a hexagonal hierarchical grid for pricing (surge measured per hexagon) and dispatch optimisation. Hexagons have equal distances to neighbours and approximate a radius well; 16 resolutions [U-H3].
- **ETA:** DeepETA: the routing engine's ETA is corrected by a deep-learning model trained on historical and real-time data, served with low latency [U-DEEPETA].
- **Design rules from the QCon talk:** "everything retryable, everything killable", small pieces, and latency tails add up across service calls [U-QCON].

### A9. Uber — strengths, weaknesses, gaps
**Strengths:** fast, low-effort matching (no decisions for the passenger); a mature safety toolkit; a clear upfront price; a consistent map + sheet UI; dispatch that accounts for drivers about to finish a trip; strong ETA prediction.
**Weaknesses (as reported):**
- Lagos drivers prefer cash and cancel card trips; "offline" trips to avoid commission [P-TECHBOOKY].
- Driver complaints about a commission of around 25% and low fares (headlines) [P-GUARDIAN-COMM][P-GUARDIAN-BOYCOTT].
- Rider complaints about cancellations and fare/surge shocks, including during festive periods (headline/summary level) [P-PUNCH][P-TECHBOOKY].
- Complicated fee rules (thresholds differ between help pages) [U-CXL][U-CXLREV].

**Gaps for Lagos Keke users:** car-only products; algorithmic pricing that doesn't match Lagos street haggling; no shared-Keke or "already carrying passengers" model; address-based pickup is weak for junctions and bus stops; card-first assumptions.

---

## Part B — inDrive (and its gaps)

### B1. Passenger journey
1. **City** mode → pickup + destination [I-REQ].
2. **Recommended fare** auto-filled; a **recommended minimum** varies by location and route; the passenger can offer the recommendation or more [I-FARE]. A comments field for details such as "need change" or the exact entrance [I-PAX101].
3. **Find a driver** → drivers **accept or counter**; there's **no limit** on how many offers arrive [I-FARE].
4. **Choose** a driver by price, ETA, rating, reviews and car [I-REQ][I-EST]. The estimate page suggests calling/messaging the driver to confirm price and pickup [I-EST].
5. **Arriving:** driver shown on the map; the help page admits a driver who isn't moving may have connection problems [I-REQ].
6. **Fare lock:** the fare can't be changed during the ride; drivers can't ask for more; the passenger pays the app amount and reports any extra demand [I-FARE].
7. **Safety:** Safety Center (side menu or the shield on the map): emergency call, 24/7 support, trusted contacts, live sharing [I-SAFECTR]. Passengers are verified with a selfie matched to their profile photo; requests are monitored for harmful activity; numbers are masked [I-DRVSAFE].
8. **Cancellation:** free before accepting an offer; allowed afterwards but discouraged; frequent cancels → lower rating / temporary block [I-CXL].

### B2. Driver journey
- **Onboarding:** "Switch to driver" in the same app → online registration: car make, model, colour and plate; name, date of birth, photo; car photo, registration certificate, licence. Review takes **1–3 days** [I-DRV101].
- **Online:** status toggle → a **feed/list of requests** (not single-request dispatch) [I-DRV101].
- **Decide:** Accept, **counter-offer** ("bidding"), or skip; skipping doesn't affect the rating [I-DRV101][I-DRV].
- **Selected → arrive → "I've arrived"** (5 min of free waiting) → start → complete [I-DRV101].
- **Ranking:** a **Priority level** (completions, ratings, fewer cancels) moves the driver higher in the feed [I-EARN].
- **Rules:** penalties for cancelling or not showing up; no asking for extra money (risk of a block); no extra passengers [I-DRV101][I-EARN][I-DRVSAFE].
- **Earnings:** ride info updates 24 h after the ride [I-EARN].

### B3. What negotiation fixes vs Uber
- **Price agency for both sides:** the passenger sets a price they can afford; drivers see the route and price before agreeing [I-DRV][I-FARE]. Familiar in markets where haggling is normal.
- **Transparency instead of opaque surge:** no hidden algorithmic surge; the passenger raises the offer deliberately.
- **Driver autonomy:** skip freely with no penalty [I-DRV]; the driver chooses trips worth their time.
- **Passenger choice:** compare ETA, rating and car, not just price [I-REQ].

### B4. inDrive's own gaps
- **Lowballing & driver income pressure:** Lagos drivers publicly criticised "ridiculous" low fares (e.g. a reported ₦2,000 for VI → Egbeda) and organised a boycott over low fares and payment issues (headlines). inDrive blamed some cases on GPS/network glitches [P-TN-RIDIC][P-TN-BOYCOTT][P-TN-GLITCH].
- **Agreed fare broken in practice:** reports of Lagos drivers demanding extra money, e.g. for air conditioning, with the driver removed [P-TN-AC], and a reported ₦4,300 extra on a ₦10,700 fare [P-GIST]. A fare locked only by the rules isn't enough without enforcement and proof.
- **Decision fatigue / slow matching:** unlimited offers [I-FARE] plus asking the passenger to call and confirm [I-EST] add steps and time.
- **Off-app confirmation:** "call or message the driver to confirm price" [I-EST] leaves room for renegotiation off the record.
- **Feed-based dispatch:** first-come browsing favours drivers who refresh often; fairness relies on the opaque Priority level [I-EARN].
- **Slow onboarding (1–3 days)** and a mixed passenger/driver app add complexity [I-DRV101].
- **Earnings delay:** daily income only visible 24 h later [I-EARN].
- **Car-only;** no idea of already-loaded vehicles, so no Keke-specific features.

---

## Part C — What DROP takes, and adds

### What DROP takes from Uber
1. **Map-first + bottom-sheet state machine** with one main action per state.
2. **Upfront clarity:** the rider sees pickup, destination, distance and **take-home amount** before accepting [U-UPFRONT]; a short request countdown with tap-to-accept / X-to-decline [U-REQ].
3. **Pickup verification:** Check Your Ride + 4-digit PIN (DROP: on every trip) [U-PIN].
4. **Safety toolkit:** share trip + trusted contacts, report, an always-visible shield; RideCheck-style stop detection later [U-SAFE].
5. **Clear wait/no-show rules** (e.g. a grace period after "Arrived", fee waived if the rider is late) [U-CXL][U-WAIT], simplified to one rule per side.
6. **Dispatch that counts soon-free supply** (DISCO): directly relevant to Kekes already carrying passengers [U-INFOQ].
7. **Architecture ideas to grow into:** cell-based geo indexing (H3) for supply/demand heatmaps and later zone pricing [U-H3]; "retryable/killable" design [U-QCON]. Stay a small service footprint to avoid the "distributed monolith" trap [U-SOA].

### What DROP takes from inDrive
1. **Passenger proposes, rider accepts/counters, passenger picks** [I-FARE][I-REQ].
2. **Recommended fare + minimum** as guardrails [I-FARE].
3. **Comment field** for landmarks/change [I-PAX101] (DROP: landmark note).
4. **Penalty-free skip** for riders [I-DRV]; reliability-based ranking (made transparent).
5. **Explicit "no extra money" rule** + reporting [I-FARE][I-EARN].
6. **Passenger selfie verification** [I-DRVSAFE].

### What DROP adds or does better (Lagos Keke)
1. **Bounded negotiation:** one counter per rider, offer timers, quick-raise chips (+₦100/+₦200), one-tap "accept suggested". This fixes unlimited offers and slow matching.
2. **Anti-lowball design:** a minimum set per zone and updated with real fuel and traffic data. Show how likely an offer is to be accepted ("Most riders accept from ₦X") instead of a bare recommended figure.
3. **Fare lock that's enforced:** agreed fare shown on both phones + in the trip record + on the share link; no off-app confirmation step; a "Rider asked for more" report button that goes straight to admin, with fast suspension.
4. **Accept-while-loaded, honestly:** riders declare seats occupied; ETA includes drop-off time; badge shown to the passenger. Neither app models this for Kekes; Uber's DISCO idea applied to Kekes.
5. **Single-request push with a short feed**, not an open browsing list, so fairness doesn't depend on who refreshes most; transparent reliability score.
6. **Landmark-first pickup** for junctions, bus stops and estate gates.
7. **Cash-first done right:** cash confirm on both sides, no card-payout delay (a reported Lagos pain point [P-TECHBOOKY]), transfer/USSD next.
8. **Instant earnings view** (vs inDrive's 24 h delay [I-EARN]) and a simple, published commission model (responding to Lagos commission complaints [P-GUARDIAN-COMM]).
9. **Fast, in-person onboarding** at parks/associations, vs 1–3 days online-only [I-DRV101].
10. **Low-data resilience:** "updated Xs ago" location, queued trip events, text-only rider mode (inDrive itself notes connection-related tracking issues [I-REQ][P-TN-GLITCH]).
11. **Separate, simpler apps** for passenger and rider (vs inDrive's mode switch [I-DRV101]).
12. **Lagos zone awareness:** geofenced service areas where Kekes are allowed to operate.

---

## Sources (read 2 Nov 2026)
**Uber**
- [U-SAFE] https://www.uber.com/ng/en/ride/safety/
- [U-TIPS] https://www.uber.com/ng/en/ride/safety/tips/
- [U-PIN] https://help.uber.com/riders/article/what-is-verify-your-trip?nodeId=9a2a4bc6-002b-4461-8e9e-8ea29974795d
- [U-SELFIE] https://tribuneonlineng.com/uber-introduces-rider-selfies-to-verify-cash-riders-improve-safety/
- [U-CXL] https://help.uber.com/en/riders/article/cancellation-fees-explained?nodeId=069853a3-f014-40a3-ad58-88ef56b1b27f
- [U-CXLREV] https://help.uber.com/en/riders/article/review-cancellation-fee?nodeId=6bec690f-ee35-40ba-96ee-c38a8ae796e0
- [U-CXLSTEPS] https://help.uber.com/riders/article/cancelling-an-uber-trip?nodeId=56270015-1d1d-4c08-a460-3b94a090de23
- [U-WAIT] https://help.uber.com/en/riders/article/wait-time-fees-and-refunds?nodeId=469f1786-1543-4c83-abbf-ddccb7826fc2
- [U-REQ] https://help.uber.com/en/driving-and-delivering/article/getting-a-trip-request?nodeId=e7228ac8-7c7f-4ad6-b120-086d39f2c94c
- [U-DRVBASICS] https://www.uber.com/us/en/drive/basics/
- [U-UPFRONT] https://help.uber.com/driving-and-delivering/article/upfront-fares?nodeId=bc83ed7e-6725-41de-afcb-72d263e5589f
- [U-UPFRONT-CA] https://www.uber.com/ca/en/blog/more-transparency-with-upfront-offers-in-canada/
- [U-H3] https://www.uber.com/us/en/blog/h3/
- [U-RINGPOP] https://www.uber.com/us/en/blog/ringpop-open-source-nodejs-library/
- [U-SOA] https://www.uber.com/us/en/blog/service-oriented-architecture/
- [U-DEEPETA] https://www.uber.com/us/en/blog/deepeta-how-uber-predicts-arrival-times/
- [U-INFOQ] https://www.infoq.com/news/2015/03/uber-realtime-market-platform/
- [U-QCON] https://qconlondon.com/london2018/london-2015/system/files/presentation-slides/QCon%202015.pdf

**inDrive**
- [I-REQ] https://indrive.com/en-in/help/passengers/how-to-request-an-indrive-ride
- [I-FARE] https://indrive.com/en-in/help/passengers/how-fares-are-calculated
- [I-EST] https://indrive.com/price-estimate
- [I-PAX101] https://blog.indrive.com/article/passengers-101-how-to-use-our-app
- [I-DRV101] https://blog.indrive.com/article/drivers-101-how-to-use-our-app
- [I-DRV] https://indrive.com/driver
- [I-EARN] https://indrive.com/help/drivers/how-much-can-you-earn-as-a-driver
- [I-DRVSAFE] https://indrive.com/safety/drivers
- [I-SAFECTR] https://indrive.com/en-in/help/support-and-safety/how-to-find-safety-center
- [I-CXL] https://indrive.com/help/passengers/how-to-cancel-a-ride

**Press / complaints (Nigeria)**
- [P-TECHBOOKY] https://www.techbooky.com/riding-on-rough-roads-the-troubled-state-of-ride-hailing-in-nigeria/
- [P-GUARDIAN-COMM] https://guardian.ng/features/executive-motoring/bolt-uber-drivers-groan-over-25-per-cent-commission/ *(headline)*
- [P-GUARDIAN-BOYCOTT] https://guardian.ng/news/drivers-threaten-to-boycott-uber-others-over-exploitation/ *(headline)*
- [P-PUNCH] https://punchng.com/festive-rush-spikes-lagos-ride-hailing-fares/ *(headline)*
- [P-TN-RIDIC] https://technext24.com/news/drivers-slam-indrive-for-ridiculous-fare/ *(headline)*
- [P-TN-BOYCOTT] https://technext24.com/news/indrive-says-drivers-not-forced-boycott/ *(headline)*
- [P-TN-GLITCH] https://technext24.com/news/indrive-blames-glitches-ridiculous-fares/ *(headline)*
- [P-TN-AC] https://technext24.com/news/indrive-kicks-out-lagos-driver-ac-money/ *(headline)*
- [P-GIST] https://www.gistreel.com/influencer-fumes-as-indrive-driver-demands-%E2%82%A64300-extra-on-%E2%82%A610700-fare/ *(headline; lower-reliability outlet)*

*Next research step:* a hands-on teardown of the current Nigerian builds of Uber and inDrive (screenshots of each state), plus a structured sample of Play Store reviews, to confirm the UI-level claims marked unverified.
