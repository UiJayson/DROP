# Map and ride choice

A plan for a real map under the passenger booking screen, with a sheet of rider choices. Sign-in, onboarding, and the way a ride is requested stay as they are. No fares are invented: the number on screen still comes from the fare suggestion we already calculate.

The look we are aiming at is Mohammad Ali’s “Anywhere Ride” shot on Dribbble. The files are in `docs/reference/anywhere/` (three screens, the hero phone, and the type and colour board), with the credit beside them. They are reference only. We do not ship those pictures.

**The map in the shot is an illustration.** On the booking screen the top half is an isometric model: white and grey blocky buildings, pale grey roads with white lane lines, small round pastel-green trees, and a few small yellow and red cars. On the home screen the street is a near-white 3D render (a highway, white cars, a pale path). Neither image is a map of a real city. Our job is to get as close as a real map of Lagos can, then stop.

The rest of the shot is ordinary UI, and we can match that more closely when we build:

- A floating round back button, the title `Home → Work`, and a round `+` button over the city. The `+` is an extra stop. We do not have extra stops, so the first map keeps back and the route title only.
- A white sheet with a top corner radius of about 28.
- Pill tabs. Recommended is a filled black pill. Faster and Cheaper are outlined pills with a small icon.
- A “Popular” heading, then white cards with a thin border. Each card has a side-view vehicle, a name, an ETA, a seat count, the price on the right, and one short line.
- Type on the board is Lufga (Regular, Medium, Semibold). The board’s large swatches are `#1F1F1F`, `#FAFAFA`, and `#FFFFFF`. The screens also use `#EBEBEB`, `#BDBFC1`, and `#616262`, plus a small lavender accent. Keke Yellow stays our own accent for the keke. We check Lufga’s licence before embedding it. Until then the app keeps the face it already uses.

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

| | How close to the illustration | Lagos | Cost to start | Phone app | Website |
| --- | --- | --- | --- | --- | --- |
| **Mapbox Standard, `light` or `dawn`, plus a monochrome theme** | The closest mood. Soft daylight, real 3D boxes, and a monochrome wash can sit near `#FAFAFA`, `#EBEBEB`, and `#BDBFC1`. It is still a perspective map of real streets, so the blocks will be irregular, not a neat isometric model. Trees show up in some cities as simple 3D trees, not the round pastel-green ones. It will not draw the little yellow and red cars. | Same OpenStreetMap buildings. Lagos is not one of the cities Mapbox draws as famous landmarks. Many streets will have roads and no blocks. | Free account, then a free monthly allowance. After that, Mapbox charges per map open. | A custom install, not Expo Go. | Yes, with a public token limited to our site. |
| **MapLibre fill-extrusion, tinted to this palette** | The colour can match more tightly than Mapbox, because we paint every layer: land `#FAFAFA` or `#FFFFFF`, roads `#EBEBEB` with a white casing, buildings white to `#BDBFC1`, labels `#616262`. The boxes are blocky, which is the right kind of shape. The light is flat. There are no round trees and no toy cars. The camera is a tilt, not a true isometric. | Roads are usable. Buildings pop up only where OpenStreetMap has them: some in Ikeja, Victoria Island, and Lagos Island; little or none on many streets, including much of Festac. Inventing a height on every empty footprint would look fake, so we do not. | No account. Free, but nobody owes us uptime. | Needs a build we install (not Expo Go). | Yes. This is the one that fits GitHub Pages with no secret. |
| **Google Maps** | A normal Google map, desaturated toward the same greys. Farther from the shot than either option above. Their photo-real 3D city is not something we should plan on for Lagos. | Best known place names and roads. | A billing account. Places and Routes are already the tools we call. The map itself is another bill. | A custom install. | Yes, but the key must not sit in the public Pages build. |

**How close, in one line each.** Mapbox Standard gets the pale daylight and the soft 3D city, and misses the illustration’s toys. MapLibre gets the palette and the blocky buildings, and misses the soft light. Google gets a grey map and misses the model-city look. None of them can be the drawing.

**The keke marker.** On top of either 3D map we place our own keke, not the shot’s cars. An SVG (or the cut-out photo we already have) is the reliable marker on the website and on the phone. A real 3D model is only worth trying later on Mapbox, and only for the one keke at the pickup. It does not fill the city with traffic.

**Recommendation.** Start with MapLibre, tinted to this palette, so the website and a phone build can show a real pale map with no new bill. Keep the drawn map as the fallback when the tiles fail. If that view feels too flat after we have used it on a real Ikeja street, move the same screen to Mapbox Standard (`light` or `dawn`, monochrome) for the softer light. Do not start with Google’s 3D.

**What we cannot copy.** The isometric camera, the perfect white block on every street, the round pastel trees, and the tiny yellow and red cars. A coloured route line and one keke marker are the honest stand-in.

## Search, location, and the fare

Keep Google Places and the Routes call we already have. They run only when Jeremiah has put a key in the private env, never in the public website build. The map tiles and the place search stay separate: the map can be free tiles, while names of shops still come from Google when the key exists.

The fare on the sheet is the existing suggestion: road distance if Google answered, otherwise the straight line, then the zone rule (base, per kilometre, minimum, low and high). The passenger still types the offer. Recommended, Faster, and Cheaper do not invent a new price.

## The bottom sheet

The sheet itself follows the shot: white, top radius about 28, black filled Recommended pill, outlined Faster and Cheaper pills, then a heading and thin-bordered cards. On each card the side-view picture is our keke, the name is the rider, the ETA is the pickup time, the seat count is the people already in the keke, the price on the right is the naira offer, and the short line is the plate or “Solo Drop” / “Shared”. We do not draw Bolt, Comfort, or Taxi as products.

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

1. **Real flat map.** Land, roads, and labels tinted to `#FAFAFA`, `#EBEBEB`, `#BDBFC1`, and `#1F1F1F`. Your dot, pickup and drop-off pins, on Android and on the Pages site. Drawn map if it fails.
2. **Route line.** Straight line first. Follow the road when we already have a Google key.
3. **Sheet.** Recommended, Faster, Cheaper over the riders we already get. Solo Drop and Shared labels only.
4. **Tilt.** A low 3D angle and buildings where the data exists. Judge it on a real Ikeja street before promising it.
5. **Mapbox, only if step 4 is too flat.** Same screens, Standard style on `light` or `dawn`, monochrome, so the light gets closer to the illustration. Trees only where Mapbox already has them.

Each step leaves sign-in, the fare rule, and the request flow working.
