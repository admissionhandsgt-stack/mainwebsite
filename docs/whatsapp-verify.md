# WhatsApp verification — setup

Reverse verification: the visitor messages **us**, we never message them. This document is the
half that runs on the VPS. The application half is `src/lib/waVerify.ts` and the three routes under
`/api/verify/*` and `/api/whatsapp/inbound`.

## Why it is built backwards

Sending an OTP is the fastest way to lose a WhatsApp number. The ban models weight three things
heavily, and outbound OTP scores worst on all three:

| Signal | Outbound OTP | Inbound code |
|---|---|---|
| Reply ratio | ~0% — nobody replies to an OTP | 100% — they started the conversation |
| Contact-graph distance | every recipient is a stranger | they messaged us first |
| Timing | a form submit fires it, so it looks robotic | human-paced by definition |

Receiving also verifies *more*. A delivered OTP proves someone could read a message on that number.
An inbound message proves the number has a live WhatsApp account and the person holding it acted —
which is what actually matters here, because this business runs on WhatsApp.

It is cheaper too: nothing is ever sent, so there is no per-message cost on any tier.

## Who does what

Almost all of it is in the admin, at **Site content → WhatsApp Verify** (`/admin/whatsapp`). The
screen is four numbered steps and ticks each one off as it is done.

| Step | Where | Who |
|---|---|---|
| 1. Set the number, switch verification on | Admin screen | Anyone with the admin login |
| 2. Start the gateway container | **Server, once** | Someone with SSH |
| 3. Tell the site where the gateway is | Admin screen | Anyone with the admin login |
| 4. Pair the phone (QR or phone code) | Admin screen | Anyone with the admin login |

Only step 2 leaves the browser, and the screen writes the command for you with the secret already
in it. That step cannot be a button: the site runs on Cloudflare Workers and has no shell on the
VPS, and an admin screen that could run commands on the server would be a remote shell with a login
form in front of it.

**Use a separate number.** Not the one on the Contacts page. If this one is ever restricted, the
damage should be limited to verification rather than the channel every lead arrives on.

## 1. Set the number

Admin → WhatsApp Verify → step 1. Country code first, no `+`. Tick *Offer WhatsApp verification on
the site* and save. Values are stored in the `integrations` table and picked up within 30 seconds —
no redeploy.

Until this is on, `/api/verify/start` answers `503` and the unlock card quietly falls back to the
typed-number form. Nothing breaks; the better route is simply absent.

## 2. Start the gateway (once)

[WAHA](https://waha.devlike.pro/) — Apache-2.0, and fully free since `2026.6.1`, when every feature
that used to sit behind the paid Plus tier moved into the public image. Of its engines, **GOWS** is
the one to use: it speaks the protocol over a WebSocket from Go (the `whatsmeow` library), so there
is no headless Chromium to keep alive on a box that is also serving the database.

Press **Generate the key** in step 2 of the admin screen, then copy the command it builds and run it
on the VPS. It looks like this, with your own values already substituted:

```bash
docker run -d --name waha --restart unless-stopped \
  -p 127.0.0.1:3001:3000 \
  -e WHATSAPP_DEFAULT_ENGINE=GOWS \
  -e WHATSAPP_HOOK_URL=https://admissionhands.com/api/whatsapp/inbound \
  -e WHATSAPP_HOOK_EVENTS=message \
  -e WHATSAPP_HOOK_HMAC_KEY='<filled in for you>' \
  -e WAHA_API_KEY='<choose a long random string>' \
  -e WHATSAPP_SESSIONS_POSTGRESQL_URL='postgresql://admissionhands:<pw>@localhost:5432/admissionhands' \
  devlikeapro/waha
```

The key is shown **once**, at the moment it is generated, because it only needs to reach the
container. Every later read of it in the admin is masked.

Sessions are worth putting in Postgres rather than a Docker volume: the database is already on the
box and already backed up by `pg-backup.sh`, so a pairing survives a container rebuild.

## 3. Point the site at the gateway

The command above binds WAHA to the server's own localhost, which the website — running on Workers —
cannot reach. To pair the phone from the admin screen, put it behind Caddy on a name like
`wa.admissionhands.com`, then fill in step 3 with that address and the `WAHA_API_KEY` you chose.

**This is optional.** Skip it and verification still works end to end; you just pair the phone on
the server (WAHA's own dashboard on `localhost:3001` through an SSH tunnel) instead of from the
admin. The webhook is outbound from the VPS, so it never needed the gateway to be reachable.

## 4. Pair the phone

Step 4 offers both: **Connect with QR** shows the code to scan from WhatsApp → Linked devices, and
**Pair with a code instead** shows an eight-character code to type on the phone, which is usually
easier when the phone and the screen are not side by side. The status follows along on its own and
turns green on `WORKING`.

## The flow

```
browser                     site (Workers)              VPS
  │                              │                       │
  ├─ POST /api/verify/start ────►│  row in                │
  │◄── { code, waLink } ─────────┤  verification_attempts │
  │                              │                       │
  ├─ taps waLink ──► their WhatsApp, message prewritten   │
  │                                      └── send ───────►│ WAHA
  │                              │◄── POST /api/whatsapp/inbound
  │                              │    (X-Webhook-Hmac, sha512)
  │                              │    code matched → verified
  ├─ GET /api/verify/status ────►│                       │
  │◄── verified + unlock cookie ─┤  lead written          │
```

State lives in `verification_attempts` (migration `0008`) rather than in memory, because those three
steps are separate requests and on Workers they may not share an isolate.

## What is checked, and where it was tested

Verified against the production build on 2026-09-22 by replaying WAHA's exact payload shape:

- A webhook with a **wrong HMAC** → `401`, nothing verified.
- A webhook with **no signature** → `401`, nothing verified.
- A correctly signed webhook → matched, and the unlock cookie comes back `Secure; HttpOnly; SameSite=lax`.
- **Replaying** the same code → `matched: false`. The update only touches rows where
  `verified_at IS NULL`, so a code spends exactly once.
- A message with `fromMe: true` → ignored, so our own outgoing messages can never verify anything.
- The number recorded is the one that **sent** the message, not the one typed into the form.

## Operating notes

- A code lives 15 minutes. The unique index on pending codes is partial, so an expired or spent code
  is free to be issued again.
- `verification_attempts` grows by one row per attempt. It is small, but a periodic
  `DELETE FROM verification_attempts WHERE expires_at < now() - interval '30 days'` keeps it tidy.
- Watch for `[whatsapp/inbound] rejected: bad or missing signature` in the logs. A burst of those is
  either a secret mismatch after a redeploy, or somebody probing the endpoint.
- This is still an unofficial gateway. It is far safer used this way than for sending, but if the
  number is ever restricted the site keeps working — the typed-number path is unaffected, and
  unticking *Offer WhatsApp verification on the site* in step 1 turns the path off immediately
  without losing any of the configuration.
- Configuration lives in the `integrations` table, read by `src/lib/integrations.ts` with a
  30-second cache, so a change made in the admin takes effect within half a minute. An environment
  variable of the same name overrides the admin and is shown on the screen as fixed.
