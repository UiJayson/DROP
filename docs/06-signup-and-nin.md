# Sign-in and NIN check

This note is for the DROP team. It explains how phone sign-in and rider checks work in this milestone, and which NIN companies we could use later. No company is chosen yet.

## What is built

- Passengers and riders sign in with a Nigerian mobile number. DROP texts a 6-digit code. The code can be asked for again after 60 seconds. Supabase also caps how many texts go out per hour.
- The session stays on the phone until the person taps Sign out.
- A rider enters their name, a photo, driver's licence, Keke plate, a photo of the Keke, and their NIN.
- The full NIN is not saved. The database keeps the last four digits, a reference from the check, and a hash so the same NIN cannot be registered twice.
- The rider stays on **Pending review** and cannot go online. The database rejects an online switch until an admin approves them.
- The admin site lists riders who are waiting. Approve lets them go online. Reject asks for a short reason.

The NIN check in this build is a **stand-in**. It does not call a real company. A number that ends in `0000` is treated as "the name does not match". `00000000000` is treated as "the check is down". Any other 11-digit number passes the stand-in and still waits for a person to approve it.

The stand-in lives in `packages/shared/src/nin.ts`. The database function `mock_verify_nin` uses the same rules. Swap both when a real provider is chosen.

## Do not point this at a live database

The SQL files in `supabase/migrations` are the source of truth. Apply them to the database on your computer, or to a Supabase project you created for development.

```bash
pnpm db:up
pnpm db:apply
```

Do not run those commands against a database that already has real riders or passengers.

`pnpm db:start` starts the full local Supabase stack. The sample numbers below receive the code `123456` without a real text message. Any other number needs a real SMS provider.

| Person | Number | Code | What they are |
| --- | --- | --- | --- |
| Ada | +234 800 000 0001 | 123456 | Passenger |
| Chinedu | +234 800 000 0002 | 123456 | Approved rider |
| Funke | +234 800 000 0003 | 123456 | Admin |
| Emeka | +234 800 000 0004 | 123456 | Rider waiting for review |

These are reserved `800` numbers for the sample data. They are not real Lagos lines.

## Connecting a Supabase project

1. Create a development project in Supabase. Leave production alone.
2. Run `pnpm env:init` if you have not already. Paste the project URL and the anon key into the passenger, rider, and admin env files. The service role key stays on the server. Never put it in a phone app.
3. Apply the migrations with the Supabase CLI to that development project (`supabase db push`) only after you have read what they change.
4. In Authentication → Phone, turn on phone sign-in and set the SMS provider. Local test codes are already in `supabase/config.toml`. Hosted projects ignore that file and need a provider.
5. Supabase can send SMS through Twilio, MessageBird, Vonage, or Textlocal. For a Nigerian gateway such as Termii, use an Auth hook. Keep the same 60-second gap between texts.

Rider photos go in the private `rider-documents` bucket. A rider can open only their own files. An admin opens them through a link that expires after 60 seconds.

## NIN providers to choose from

Prices below are what those companies publish, or what a public comparison said in 2026. They are not a quote. Confirm the current NIN price, NIMC licence, and NDPA terms before signing.

| Provider | What they offer | Published price (rough) |
| --- | --- | --- |
| [Dojah](https://dojah.io/pricing) | NIN and other Nigerian KYC, plus selfie checks | Pay as you go, advertised from about $0.04 to $0.06 per API call. The public page does not list a separate NIN price. |
| [Prembly](https://prembly.com) (Identitypass) | NIN, document, and biometric checks | A 2026 comparison quoted pay as you go from about $0.12 per verification. Prembly's own site often asks you to contact sales. |
| [Smile ID](https://smileidentity.com) | NIN plus face match, strong on African selfies | Volume pricing on request. No public NIN rate found. |
| [VerifyMe](https://verifyme.ng) | NIMC-licensed NIN (including virtual NIN) and FRSC licence checks | Custom price per check. They say NIN is cheaper than a physical address visit. Contact sales. |

A marketplace comparison (not one of these four) has advertised a Nigerian NIN lookup around ₦100–₦200. Treat that as a hint of the market, not as these companies' prices.

For DROP's pilot, a licensed NIN check plus the admin looking at the photos is enough. Smile ID is the one to lean toward if the face match matters most. Dojah or Prembly are the ones to ask first if we want a published per-call price. VerifyMe is the one to ask if we need the FRSC licence check in the same contract.
