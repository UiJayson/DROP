# Map and ride choice

A plan for a real map under the passenger booking screen, with a sheet of rider choices. Sign-in, onboarding, and the way a ride is requested stay as they are. No fares are invented: the number on screen still comes from the fare suggestion we already calculate.

The look we are aiming at is the soft city in the “Anywhere Ride” Dribbble shot: pale map, simple roads, a clear route, floating buttons, and a bottom sheet with Recommended, Faster, and Cheaper. That shot is a drawing. A live map of Lagos cannot be that drawing. The plan below says how close we can get.

## What we have today

The passenger app does **not** use a map library. There is no Mapbox, MapLibre, or `react-native-maps` in the project. An older architecture note mentions Google Maps through `react-native-maps`. That was the intention. The app that shipped does something simpler.

- **Home and most trip screens** show `MapCanvas`: grey blocks and lines we drew ourselves. It is not a street map.
- **On the web only**, if a Google key is present, the live-trip screen can show a Google map in a small frame (`TripMap`). Android and iPhone never show that frame. They keep the drawing.
- **Your location** is the phone’s normal location prompt (`navigator.geolocation`). We did not add a background tracker. If the phone has no fix, the sample pickup at Allen Avenue, Ikeja must be confirmed before a request is sent. A rider with no fix is not shown as if they were there.
- **Where to?** If `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set, search uses Google Places (Nigeria only, biased near the pickup) and the road length comes from Google’s Routes API, mode “two-wheeler”. That length is saved and the server turns it into a suggested fare. If the key is blank, search is a short list of sample Ikeja places and the fare uses a straight-line distance.
- **The request** is still one pickup, one drop-off, one cash offer in naira, then riders answer. Nothing in that chain changes for this work.
- **The key today:** the example env file leaves the Google key empty. The public Pages preview is built with the key blank, on purpose. So the live site is still the drawn map and the sample places.

## Which map to use

We need one map that works on Android first, on iPhone, and on the website we publish at `github.io/DROP`.

| | Soft pastel 3D city | Lagos | Cost to start | Phone app | Website |
| --- | --- | --- | --- | --- | --- |
| **MapLibre + OpenFreeMap** | A light style and a tilt. Buildings pop up only where OpenStreetMap has them. | Roads are usable. 3D buildings are patchy: some in Ikeja, Victoria Island, and Lagos Island; little or none on many streets, including much of Festac. | No account. Free, but nobody owes us uptime. | Needs a build we install (not the Expo Go app). | Yes. This is the one that fits GitHub Pages with no secret. |
| **Mapbox Standard** | The closest: light colours, 3D boxes, some trees, a day/night light. Still a real map, not a toy city. | Same OpenStreetMap buildings. Lagos is not one of the cities Mapbox draws as famous landmarks, so do not expect detailed towers. | Free account, then a free monthly allowance. After that, Mapbox charges per map open. | Same: a custom install, not Expo Go. Their phone library does not run inside Expo Go. | Yes, with a public token. Restrict it to our site. |
| **Google Maps** | A normal Google map, which we can make light grey. Their photo-real 3D city is not available for Lagos in any form we should plan on. | Best known place names and roads. | A billing account. Places and Routes are already the tools we call. The map itself is another bill, with a monthly credit that runs out. | A custom install. | Yes, but the key must not sit in the public Pages build. |

**Recommendation.** Start with MapLibre and OpenFreeMap so the website and a phone build can show a real pale map with no new bill. Keep the drawn map as the fallback when the tiles fail. If the 3D view feels too plain after we have used it in Ikeja, move the same screen to Mapbox Standard. Do not start with Google’s 3D.

**What we cannot copy from the Dribbble shot.** Tiny illustrated cars, toy trees, and a perfect isometric model of every street. Mapbox can show simple 3D trees in some cities; Lagos will mostly not have them. We can add our own keke marker (the photo we already cut out) at the pickup and on the rider, and a coloured line for the route. That is the honest version of the shot.

## Search, location, and the fare

Keep Google Places and the Routes call we already have. They run only when Jeremiah has put a key in the private env, never in the public website build. The map tiles and the place search stay separate: the map can be free tiles, while names of shops still come from Google when the key exists.

The fare on the sheet is the existing suggestion: road distance if Google answered, otherwise the straight line, then the zone rule (base, per kilometre, minimum, low and high). The passenger still types the offer. Recommended, Faster, and Cheaper do not invent a new price.

## The bottom sheet

The tabs sort the **same riders**, they do not sell three products.

- **Recommended:** riders who accepted your offer, soonest first. This matches how we already prefer an accept.
- **Faster:** shortest pickup time.
- **Cheaper:** lowest naira.

Each card is one rider, as today: name, rating, trips, plate, pickup time, price, Accept. The only category the product already has is on the rider, not a menu we invent:

- **Solo Drop** when the keke is empty (`seats` is 0).
- **Shared** when they are already carrying people (`seats` is 1 to 3).

Do not add Economy, Comfort, or XL. The database has no such types. If we later want the passenger to say “empty keke only”, that is a small extra field on the request. Say so before building it. It is not required for the first map.

## What to build, and what Jeremiah sets up

Code, when we leave this plan:

- A new map component under `apps/passenger/src/`, used by the home and the fare screen. `MapCanvas` stays for when the map cannot load.
- The sheet on the fare and offers screens gains the three tabs. Sorting stays in the app. `create_request` stays the same.
- Optional later: ask Google Routes for the road shape, not only the length, so the line follows streets. Today we only store the length.

Packages later, not now: a MapLibre React Native library, plus MapLibre GL JS for the website. Mapbox only if we switch.

Jeremiah:

- **Nothing new for the first map.** OpenFreeMap needs no key.
- **Google Cloud**, only for real place names and road distance. Turn on Places API (New) and Routes API. Restrict the key. Do not put it in git or in the Pages build. Google asks for a billing account; there is a monthly credit, then it costs money.
- **Mapbox account**, only if we outgrow the free tiles. Free to open. The public website token must be limited to our GitHub Pages address.
- **A phone build we install ourselves** (Expo’s dev build). The map will not run inside Expo Go. The website does not need that.

Risks: Lagos 3D will look empty on many streets. Free tiles can be slow or stop. A Google key in the public site would be stolen, so the preview stays on sample places until search is done through our server. A custom phone build is an extra install step for testers.

## Steps we can ship one at a time

1. **Real flat map.** Pale style, your dot, pickup and drop-off pins, on Android and on the Pages site. Drawn map if it fails.
2. **Route line.** Straight line first. Follow the road when we already have a Google key.
3. **Sheet.** Recommended, Faster, Cheaper over the riders we already get. Solo Drop and Shared labels only.
4. **Tilt.** A low 3D angle and buildings where the data exists. Judge it on a real Ikeja street before promising it.
5. **Mapbox, only if step 4 is too plain.** Same screens, prettier light and trees where Mapbox has them.

Each step leaves sign-in, the fare rule, and the request flow working.
