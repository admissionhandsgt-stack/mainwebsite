/**
 * WhatsApp verification, run backwards.
 *
 * We do not send anything. The visitor taps a `wa.me` link that opens their
 * own WhatsApp with a one-line message already written, they hit send, and a
 * self-hosted gateway on the VPS posts that inbound message to us as a
 * webhook. Matching the code in it verifies the number it came from.
 *
 * Why not send an OTP, which is what everyone does: WhatsApp's ban models
 * weight reply-ratio, contact-graph distance and timing regularity, and
 * outbound OTP is the worst possible score on all three — no one replies to an
 * OTP, every recipient is a stranger, and a form submit fires it. Numbers doing
 * that on an unofficial gateway get banned in weeks. Receiving inverts all
 * three: the visitor messages first, so we are answering a person who started a
 * conversation.
 *
 * It is also better verification. A sent OTP proves someone could read an SMS
 * on that number. An inbound message proves the number has a live WhatsApp
 * account and that the person holding it acted — and WhatsApp is the channel
 * this business actually runs on.
 *
 * The gateway is WAHA (`devlikeapro/waha`, Apache-2.0, fully free since
 * 2026.6.1) running in Docker beside Postgres. See `docs/whatsapp-verify.md`.
 */

import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { normalisePhone } from "@/lib/leadGate";
import { getIntegration, getIntegrationFlag } from "@/lib/integrations";
import { inboundNumber } from "@/lib/waSenders";

/** Long enough to tap through and send, short enough to free the code again. */
const TTL_MINUTES = 15;

/**
 * Crockford-ish alphabet: no O/0, I/1, or U.
 *
 * The code is read off a screen and retyped by hand when the deep link does
 * not fire, so characters that look like each other cost real conversions.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTVWXYZ";

function randomCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The number the visitor messages. Digits only, no `+`, for `wa.me`.
 *
 * Comes from the admin screen, so changing it is a form field rather than a
 * redeploy. `WHATSAPP_VERIFY_NUMBER` still overrides it where an operator has
 * set one deliberately.
 */
export async function verifyNumber(): Promise<string | null> {
  const raw = (await getIntegration("whatsapp.verify.number"))?.replace(/\D/g, "");
  return raw && raw.length >= 10 ? raw : null;
}

/**
 * Whether the reverse-verification path can be offered at all.
 *
 * Both the switch and the number are required: the switch lets the admin turn
 * the path off in one click if the number is ever restricted, without losing
 * the configuration.
 */
export async function verifyEnabled(): Promise<boolean> {
  const [on, number] = await Promise.all([
    getIntegrationFlag("whatsapp.verify.enabled"),
    verifyNumber(),
  ]);
  return Boolean(on && number);
}

/**
 * Whether the gateway is paired and able to receive.
 *
 * Configuring a gateway is not the same as having one that works. Between
 * starting the container and scanning the QR, the session sits in
 * `SCAN_QR_CODE` — codes can be issued and nothing can ever confirm them. If
 * verification were treated as available in that window, every visitor would
 * be locked out of data they were willing to give a number for.
 *
 * Cached for a minute. This is read on the access path, and a session does not
 * change state often; a minute of staleness after pairing is a minute, not a
 * fault.
 */
let readyCache: { at: number; ready: boolean } | null = null;
const READY_TTL_MS = 60_000;

export async function gatewayReady(): Promise<boolean> {
  if (readyCache && Date.now() - readyCache.at < READY_TTL_MS) return readyCache.ready;
  // Any connected number will do since 2026-10-06 (waSenders.ts): each one's
  // gateway posts what it receives to our webhook.
  const ready = Boolean(await inboundNumber().catch(() => null));
  readyCache = { at: Date.now(), ready };
  return ready;
}

export interface StartedAttempt {
  token: string;
  code: string;
  /** Opens WhatsApp with the message already composed. */
  waLink: string;
  expiresAt: string;
}

export interface AttemptInput {
  name?: string | null;
  phone?: string | null;
  level?: "ug" | "pg";
  rank?: number | null;
  category?: string | null;
  sourcePage?: string | null;
}

/**
 * Opens an attempt and returns the link to tap.
 *
 * The code is retried on collision rather than checked first: the partial
 * unique index is the real guard, and a check-then-insert would race.
 */
export async function startAttempt(input: AttemptInput): Promise<StartedAttempt | null> {
  // A number that is connected right now, so the message reaches a gateway and
  // the webhook — the primary first, then any paired backup (waSenders.ts).
  // The configured number is the last resort: the phone still gets it.
  const number = (await inboundNumber().catch(() => null)) ?? (await verifyNumber());
  if (!number) return null;

  const token = randomToken();
  const expires = new Date(Date.now() + TTL_MINUTES * 60_000);

  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    code = randomCode();
    try {
      await db.execute(sql`
        INSERT INTO verification_attempts
          (token, code, name, phone_claimed, level, rank, category, source_page, expires_at)
        VALUES (
          ${token}, ${code},
          ${input.name ?? null},
          ${input.phone ? normalisePhone(input.phone) : null},
          ${input.level ?? "pg"}::level,
          ${input.rank ?? null},
          ${input.category ?? null},
          ${input.sourcePage ?? null},
          ${expires.toISOString()}
        )
      `);
      break;
    } catch (error) {
      // 23505 is the partial unique index on a live code. Anything else is real.
      if (!String(error).includes("23505")) throw error;
      if (attempt === 4) return null;
    }
  }

  const text = `AdmissionHands verification: ${code}`;
  return {
    token,
    code,
    waLink: `https://wa.me/${number}?text=${encodeURIComponent(text)}`,
    expiresAt: expires.toISOString(),
  };
}

export interface InboundResult {
  matched: boolean;
  token?: string;
  phone?: string;
}

/**
 * Resolves an inbound WhatsApp message against a pending attempt.
 *
 * The code is searched for *inside* the body rather than matched against the
 * whole of it, because people edit the prefilled text, and WhatsApp itself
 * sometimes appends to it.
 */
export async function resolveInbound(from: string, body: string): Promise<InboundResult> {
  // WAHA reports the sender as `<digits>@c.us` — or, increasingly, as a LID
  // (`<digits>@lid`), whose digits are not a phone number. The inbound route
  // resolves LIDs first; one that reaches here unresolved verifies nothing.
  if (/@lid$/i.test(String(from ?? ""))) return { matched: false };
  const digits = String(from ?? "").split("@")[0].replace(/\D/g, "");
  const phone = normalisePhone(digits) ?? (digits.length >= 10 ? `+${digits}` : null);
  if (!phone) return { matched: false };

  const candidates = String(body ?? "")
    .toUpperCase()
    .match(new RegExp(`[${ALPHABET}]{6}`, "g"));
  if (!candidates?.length) return { matched: false };

  for (const code of candidates) {
    const rows = (await db.execute(sql`
      UPDATE verification_attempts
         SET verified_phone = ${phone}, verified_at = now()
       WHERE code = ${code}
         AND verified_at IS NULL
         AND expires_at > now()
      RETURNING token
    `)) as unknown as { token: string }[];

    if (rows.length) return { matched: true, token: rows[0].token, phone };
  }
  return { matched: false };
}

export interface AttemptStatus {
  found: boolean;
  verified: boolean;
  expired: boolean;
  phone?: string;
  name?: string | null;
  level?: "ug" | "pg";
  rank?: number | null;
  category?: string | null;
  sourcePage?: string | null;
}

/** What the polling browser is told. */
export async function attemptStatus(token: string): Promise<AttemptStatus> {
  const rows = (await db.execute(sql`
    SELECT verified_phone, verified_at, expires_at, name, level::text AS level,
           rank, category, source_page
      FROM verification_attempts
     WHERE token = ${token}
     LIMIT 1
  `)) as unknown as Record<string, unknown>[];

  const r = rows[0];
  if (!r) return { found: false, verified: false, expired: false };

  const verified = Boolean(r.verified_at);
  return {
    found: true,
    verified,
    expired: !verified && new Date(r.expires_at as string) < new Date(),
    phone: (r.verified_phone as string) ?? undefined,
    name: (r.name as string) ?? null,
    level: (r.level as "ug" | "pg") ?? "pg",
    rank: (r.rank as number) ?? null,
    category: (r.category as string) ?? null,
    sourcePage: (r.source_page as string) ?? null,
  };
}

/**
 * Verifies WAHA's webhook signature.
 *
 * Without this the endpoint is an open door: anyone who knows the shape could
 * POST a code and a number of their choosing and unlock the data. WAHA hashes
 * the raw body with the shared secret and sends it as `X-Webhook-Hmac`.
 */
export async function verifyWebhookSignature(rawBody: string, header: string | null): Promise<boolean> {
  const secret = await getIntegration("whatsapp.webhook.secret");
  if (!secret) {
    console.error("[waVerify] no webhook secret configured — refusing the webhook.");
    return false;
  }
  if (!header) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");

  // Constant-time compare: a length check plus an XOR fold, so a wrong guess
  // cannot be narrowed down by timing the response.
  const given = header.trim().toLowerCase();
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
