# DROP: Hands-on findings (Uber & inDrive, Lagos, Nov 2026)

Source: Jeremiah's own screen recordings of both apps in Lagos (Amuwo Odofin / Festac area).

## inDrive (booking up to offers)
- Flow: location permission → map home → "Where to & for how much?" → route search → fare screen → Find drivers → offers.
- Fare screen: big recommended fare (₦3,300) with large − / + buttons; upsells Comfort ₦4,500, One Click ₦3,600; "Auto-accept offer of ₦3,300" toggle; huge lime "Find drivers" button.
- Searching: 1:00 countdown, pulsing radar on map, live text ("5 drivers are viewing your request", "Expanding search area"), fare still editable, payment shown (Bank Transfer), Cancel at bottom.
- Offer card: counter-offer ₦4,100, 3 min ETA, driver photo, name, rating 4.92, 1,389 rides, car model; Decline / Accept.
- Strengths: fare control front and center; strong trust signals on offers; clear system status while waiting; everything in the bottom 40% of the screen (one-handed).
- Weaknesses: booking interrupted twice (rate-last-driver sheet, marketing survey); cluttered search state; auto-accept toggle easy to miss and unclear.

## Uber (booking attempt)
- Flow: passkey prompt → notification prompt → loading → home ("Where to?" + Later, recents, Ride/Reserve/Seniors, safety promo, tabs Home/Services/Activity/Account) → "Plan your ride" (Pickup now / For me, timeline pickup→destination, Add Home/Work, suggestions).
- Result: "No rides available" in Festac/Amuwo Odofin. Dead end, no alternative offered. Meanwhile inDrive sent a ₦4,100 offer by push notification.
- Strengths: very clean monochrome hierarchy; "Where to?" dominant; schedule and book-for-others up front; one-tap Rebook on past trips; Simple mode for older users.
- Weaknesses: two setup prompts before home; no availability signal before you search; hard-fail error with no next step.

## What this means for DROP
1. Never interrupt booking: ratings and surveys only after a trip or in the background.
2. Show availability on the home screen ("12 Kekes near you") before the user searches; if none, offer "notify me" or raise-fare instead of a dead end.
3. Copy inDrive's fare stepper, countdown and live status, but keep the waiting screen to one fare, one timer, one cancel.
4. Offer cards like inDrive's, plus a "carrying 2 passengers" badge and Keke plate.
5. Copy Uber's clean hierarchy, "Where to?" dominance, Rebook and book-for-someone.
6. Make auto-accept a clear choice on the fare screen ("Accept first rider at this price").
