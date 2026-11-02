# DROP

DROP is an app for booking a Keke (a tricycle) in Lagos. When someone says “Drop”, they want that Keke to themselves, not a shared route along a fixed line.

This folder is the starting point for the project. It has the passenger app, the rider app, the admin website, and the database tables. You can open each app and see a welcome screen. You cannot book a trip yet.

## The three apps

| App       | Who it is for                | What you see today                                  |
| --------- | ---------------------------- | --------------------------------------------------- |
| Passenger | Someone who wants a ride     | Phone sign-in, then the booking prototype           |
| Rider     | A Keke rider                 | Phone sign-in, then licence and NIN signup          |
| Admin     | The DROP team, on a computer | A list of riders waiting to be approved or rejected |

## What to install first

1. **Node.js 22** (the tool that runs the project). Download the installer from [nodejs.org](https://nodejs.org) and choose the version marked 22.
2. **pnpm** (installs the project's pieces). After Node.js is installed, open a terminal and run:

   ```bash
   npm install -g pnpm
   ```

3. **Docker Desktop**, only if you want the database on your computer. Download it from [docker.com](https://www.docker.com/products/docker-desktop/). Start Docker and wait until it says it is running.

A terminal is the Terminal app on a Mac, or PowerShell on Windows. In Cursor or VS Code you can use the built-in terminal.

## Open the welcome screens

In a terminal, go to this folder, then run:

```bash
pnpm install
pnpm env:init
pnpm --filter @drop/admin dev
```

`pnpm install` can take a few minutes the first time.

Then open [http://localhost:3000](http://localhost:3000). You should see a black page and a sample rider waiting for review. The buttons on that sample do not save anything. A real list appears after the Supabase URL and anon key are filled in, and after an admin signs in with their phone.

The phone apps:

```bash
pnpm --filter @drop/passenger dev
```

```bash
pnpm --filter @drop/rider dev
```

A QR code appears in the terminal.

- On a phone, install the free **Expo Go** app and scan the code.
- On a computer, press **w** in that terminal to open a phone-sized preview in the browser.

The passenger app uses port **8081**. The rider app uses port **8082**. Run them in two terminals if you want both at once.

To run all three together:

```bash
pnpm dev
```

Press Ctrl+C in the terminal to stop.

You do not need to fill in any passwords to see these screens. Without a Supabase project, the phone apps explain that text messages are not connected yet, and they offer a preview of the screens.

## The database

The database stores people, Kekes, trip requests, and fares. The tables are created here. Booking is not switched on yet.

Install Docker, start it, then run:

```bash
pnpm db:up
pnpm db:apply
```

`pnpm db:up` downloads Postgres (the same database Supabase uses) and starts it. The first download is large. `pnpm db:apply` creates the tables, loads the sample Lagos zone, and checks that a stranger cannot read private rows.

Run those two commands only on the database on your computer, or on a Supabase project you created for practice. Do not point them at a live database that already has real people in it.

Rider photos are stored in a private bucket named `rider-documents`. A rider can open only their own files. An admin opens a link that expires after one minute. The full NIN is not stored. See `docs/06-signup-and-nin.md` for the sign-in setup and the NIN companies still to choose from.

The database on your computer uses the password `postgres`. That password is only for this local copy. Do not reuse it anywhere real.

To stop it:

```bash
docker rm -f drop-db
```

Sample data (not a real service area):

- A rectangle around Ikeja called “Lagos — Ikeja test zone”.
- A small “restricted” block inside it, so later tests can block trips there. It is not an official Lagos boundary.
- A sample fare rule: ₦200 to start, ₦150 per kilometre, and a ₦300 minimum. These numbers are examples.
- Four pretend people: Ada (passenger, +2348000000001), Chinedu (approved rider, yellow Keke plate `LAG-TEST-001`), Funke (admin), and Emeka (rider waiting for review, plate `KJA-204-AB`). Their local password is `drop-local-only`. On a local Supabase stack their text-message code is `123456`. That code is not sent to a real phone.

`pnpm db:start` launches the full Supabase stack, including the Studio website at [http://127.0.0.1:54323](http://127.0.0.1:54323). You do not need that to load the tables.

## Settings file

`pnpm env:init` copies `.env.example` into the places the apps look. The copied files are empty on purpose. Do not put real keys in git.

When you have a Supabase project, paste its URL and anon key into those files. The service role key is a master key. It stays on the server. Never put it in the phone apps.

The apps also start without a Sentry address. Sentry is optional error reporting. Add `EXPO_PUBLIC_SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` only when you have one.

## Check that the project is healthy

```bash
pnpm lint
pnpm typecheck
pnpm test
```

`pnpm test` checks the fare maths and the colours. `pnpm db:apply` checks the database. You need Docker running for the database check.

## What is in this folder

- `apps/passenger` — passenger phone app (Expo / React Native)
- `apps/rider` — rider phone app
- `apps/admin` — admin website (Next.js)
- `packages/shared` — shared types and fare rules (money is stored in kobo, where ₦1 = 100 kobo)
- `packages/ui-tokens` — colours and type sizes (black `#0A0A0B`, Keke Yellow `#FFC629`)
- `packages/api-client` — the list of server actions the apps will call later. It does not call them yet.
- `supabase` — database migrations, sample data, and the privacy tests
- `docs` — the product and design notes

## What is not built yet

Real map booking, rider offers, the trip PIN, and cash confirmation are still the prototype you can tap through after sign-in. A live NIN company and a live SMS provider are not connected yet. Those are the next choices. See `docs/06-signup-and-nin.md`.
