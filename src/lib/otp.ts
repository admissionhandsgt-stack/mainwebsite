/**
 * The one-time code: how it is made, how it is sent, how it is checked.
 *
 * ## Why this exists at all
 *
 * `waVerify.ts` verifies a number by having the visitor message *us*. That is
 * genuinely stronger proof and it costs nothing, and it stays in this codebase
 * as the fallback. But it asks a visitor on a laptop to pick up their phone,
 * find our number and send a message before they can read a page they already
 * had open — and a returning visitor to do it again. Most of them simply left.
 *
 * So the normal path is now the one everybody already understands: we send a
 * six-digit code to the number, they type it in. On a laptop the code arrives
 * on the phone in their hand and gets typed into the browser, which is the
 * case the reverse flow handled worst.
 *
 * ## Where the code comes from
 *
 * `crypto.getRandomValues`, six digits, uniform — sampled with rejection
 * rather than `% 10`, because the modulo of a byte over ten is biased toward
 * the low digits and a predictable digit is a shorter code.
 *
 * Only the HMAC is stored. Six digits is a small space, so hashing is not
 * brute-force protection; it is so that reading the table — or a backup, or a
 * log line — does not hand over live credentials. The key is in the
 * environment, so a row on its own reveals nothing.
 *
 * ## How it is sent, and the part that needs care
 *
 * Through the same self-hosted WAHA gateway on a burner number. Migration 0008
 * was right that outbound OTP is the worst thing you can do to a WhatsApp
 * number: the ban models weight reply-ratio (nobody replies to an OTP),
 * contact-graph distance (every recipient is a stranger) and robotic timing (a
 * form submit fires it). Choosing to send anyway means paying those three
 * down deliberately:
 *
 *   - **Volume.** Three sends per number per hour, eight per day, and a cap on
 *     the gateway's own total per day. A burst to strangers is the single
 *     strongest signal; a steady trickle is what a person looks like.
 *   - **Timing.** A short random delay before the send, so it does not land a
 *     machine-exact interval after the form submit.
 *   - **Reply-ratio.** The message ends by inviting a reply, and replies land
 *     in the same inbox the counsellors already use. A thread with traffic in
 *     both directions is the thing that does not look like a broadcast.
 *
 * None of that makes an unofficial gateway safe. It makes it survivable, on a
 * number that is not the business line, and `sendCode` reports failure rather
 * than throwing so the fallback can take over the moment it stops working.
 */

import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { normalisePhone } from "@/lib/leadGate";
import { getIntegration } from "@/lib/integrations";
import { logError } from "@/lib/logger";

/** Long enough to switch apps and read it, short enough to be worth little. */
const TTL_MINUTES = 10;

/** Wrong guesses before the code is dead. Six digits needs this to mean six. */
const MAX_ATTEMPTS = 5;

/** Per-number caps. Deliberately tight — see the note on volume above. */
const PER_HOUR = 3;
const PER_DAY = 8;

/** The gateway number's own ceiling, whoever is asking. */
const GATEWAY_PER_DAY = 300;

/** The WAHA session name, as the admin screen creates it. */
const SESSION = "default";

export type OtpPurpose = "signup" | "reset";
export type SentChannel = "whatsapp" | "inbound";

/* ------------------------------------------------------------------ code */

/**
 * Six uniform digits.
 *
 * Rejection sampling: a byte is used only when it falls in the largest whole
 * multiple of ten it can, so every digit is equally likely. `% 10` on a raw
 * byte would make 0–5 more common than 6–9.
 */
function randomDigits(length = 6): string {
  let out = "";
  const buf = new Uint8Array(length * 2);
  while (out.length < length) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length; i += 1) {
      if (buf[i] >= 250) continue; // 250 = 25 * 10, the largest usable multiple
      out += String(buf[i] % 10);
      if (out.length === length) break;
    }
  }
  return out;
}

/**
 * The key the code hash is derived with.
 *
 * `OTP_SECRET`, or `UNLOCK_SECRET` so a deployment that already set one is not
 * asked for a second. With neither, a per-process key: in-flight codes then
 * stop verifying across a restart, which is a ten-minute annoyance, where a
 * hardcoded fallback would let anyone who reads this file forge a hash for a
 * code of their choosing.
 */
let processKey: string | null = null;

function hmacSecret(): string {
  const set = process.env.OTP_SECRET || process.env.UNLOCK_SECRET;
  if (set) return set;
  if (!processKey) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    processKey = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    console.warn(
      "[otp] neither OTP_SECRET nor UNLOCK_SECRET is set — using a per-process key. " +
        "Codes issued before a restart will stop verifying after it.",
    );
  }
  return processKey;
}

/** Bound to the number and the purpose, so a hash cannot be replayed onto either. */
async function hashCode(code: string, phone: string, purpose: OtpPurpose): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(hmacSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${purpose}:${phone}:${code}`),
  );
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------------ caps */

export interface CapResult {
  allowed: boolean;
  /** Plain enough to show a visitor. */
  message?: string;
  /** Seconds until they could try again, when that is knowable. */
  retryAfter?: number;
}

/**
 * The volume guard, read from the table rather than memory.
 *
 * In memory it would reset on every deploy and be per-isolate, which for a cap
 * whose whole job is to keep a WhatsApp number alive is no cap at all.
 */
async function withinCaps(phone: string): Promise<CapResult> {
  const rows = (await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE phone = ${phone} AND created_at > now() - interval '1 hour')::int AS hour,
      COUNT(*) FILTER (WHERE phone = ${phone} AND created_at > now() - interval '1 day')::int  AS day,
      COUNT(*) FILTER (WHERE created_at > now() - interval '1 day')::int                        AS global
    FROM otp_codes
    WHERE sent_channel IS NOT NULL
  `)) as unknown as { hour: number; day: number; global: number }[];

  const c = rows[0] ?? { hour: 0, day: 0, global: 0 };

  if (c.hour >= PER_HOUR) {
    return {
      allowed: false,
      message: "You have asked for a few codes already. Try again in an hour, or sign in with your password.",
      retryAfter: 3600,
    };
  }
  if (c.day >= PER_DAY) {
    return {
      allowed: false,
      message: "That number has had its codes for today. Try again tomorrow, or message us on WhatsApp.",
      retryAfter: 86400,
    };
  }
  if (c.global >= GATEWAY_PER_DAY) {
    // Not the visitor's fault and not their problem to solve, so this reads as
    // a temporary fault and the caller falls back to the inbound path.
    return { allowed: false, message: "Codes are briefly unavailable. Use the WhatsApp option below." };
  }
  return { allowed: true };
}

/* ------------------------------------------------------------------ send */

/**
 * Hands the message to the gateway.
 *
 * Returns false rather than throwing, on every failure including an unreachable
 * gateway: the caller's job is to fall back, not to crash.
 */
async function sendViaGateway(phone: string, text: string): Promise<boolean> {
  const [base, key] = await Promise.all([
    getIntegration("whatsapp.gateway.url"),
    getIntegration("whatsapp.gateway.api_key"),
  ]);
  if (!base) return false;

  // WAHA addresses a person as `<digits>@c.us`, with no `+`.
  const chatId = `${phone.replace(/\D/g, "")}@c.us`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/sendText`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "X-Api-Key": key } : {}),
      },
      body: JSON.stringify({ session: SESSION, chatId, text }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      logError(new Error(`WAHA sendText ${res.status}: ${(await res.text()).slice(0, 200)}`), {
        route: "otp:send",
      });
      return false;
    }
    return true;
  } catch (error) {
    logError(error, { route: "otp:send" });
    return false;
  }
}

/**
 * The message itself.
 *
 * Written as a person would write it, names the brand so it is not a bare
 * number from an unknown sender, and ends by inviting a reply — which is the
 * one ban signal we can improve rather than merely ration.
 */
function composeMessage(code: string, purpose: OtpPurpose): string {
  const lead =
    purpose === "reset"
      ? "Here is your code to reset your AdmissionHands password"
      : "Here is your AdmissionHands verification code";
  return (
    `${lead}:\n\n*${code}*\n\n` +
    `It works for the next ${TTL_MINUTES} minutes. Do not share it with anyone.\n\n` +
    `If you did not ask for this, you can ignore it. Reply here if you need help with counselling.`
  );
}

export interface IssueInput {
  phone: string;
  purpose: OtpPurpose;
  name?: string | null;
  level?: "ug" | "pg" | null;
  rank?: number | null;
  category?: string | null;
  sourcePage?: string | null;
}

export interface IssueResult {
  ok: boolean;
  /** Where it went. Absent when nothing was sent. */
  channel?: SentChannel;
  /** `+91 ••••• 4821` — enough to confirm the right number without printing it. */
  masked?: string;
  expiresInSeconds?: number;
  /** Set when the send failed, so the caller can offer the inbound path. */
  fallback?: boolean;
  message?: string;
  retryAfter?: number;
}

/**
 * Mints a code and sends it.
 *
 * The row is written *before* the send and marked with the channel after, so a
 * code that went out is never missing from the table — the alternative loses
 * the record of a message the visitor is holding in their hand.
 */
export async function issueCode(input: IssueInput): Promise<IssueResult> {
  const phone = normalisePhone(input.phone);
  if (!phone) return { ok: false, message: "That does not look like an Indian mobile number." };

  const cap = await withinCaps(phone);
  if (!cap.allowed) {
    return { ok: false, message: cap.message, retryAfter: cap.retryAfter, fallback: true };
  }

  const code = randomDigits();
  const hash = await hashCode(code, phone, input.purpose);
  const expires = new Date(Date.now() + TTL_MINUTES * 60_000);

  // Any earlier live code for this number is retired. Two valid codes at once
  // means a visitor reading the older message gets told they are wrong.
  await db.execute(sql`
    UPDATE otp_codes SET consumed_at = now()
     WHERE phone = ${phone} AND consumed_at IS NULL AND expires_at > now()
  `);

  const rows = (await db.execute(sql`
    INSERT INTO otp_codes
      (phone, code_hash, purpose, name, level, rank, category, source_page, expires_at)
    VALUES (
      ${phone}, ${hash}, ${input.purpose},
      ${input.name ?? null}, ${input.level ?? null}::level, ${input.rank ?? null},
      ${input.category ?? null}, ${input.sourcePage ?? null}, ${expires.toISOString()}
    )
    RETURNING id
  `)) as unknown as { id: number }[];

  const id = rows[0]?.id;

  // A beat of jitter, so the send does not land at a machine-exact interval
  // after the form submit. Cheap here, and it is one of three signals.
  await new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 1400)));

  const sent = await sendViaGateway(phone, composeMessage(code, input.purpose));

  if (!sent) {
    // Retire it rather than leave a code nobody received looking live, and
    // tell the caller to offer the path that does not need us to send.
    if (id) await db.execute(sql`UPDATE otp_codes SET consumed_at = now() WHERE id = ${id}`);
    return {
      ok: false,
      fallback: true,
      message: "We could not send a WhatsApp code just now.",
    };
  }

  if (id) {
    await db.execute(sql`UPDATE otp_codes SET sent_channel = 'whatsapp' WHERE id = ${id}`);
  }

  return {
    ok: true,
    channel: "whatsapp",
    masked: maskPhone(phone),
    expiresInSeconds: TTL_MINUTES * 60,
  };
}

/** `+91 ••••• 4821`. */
export function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+91 ••••• ${d.slice(-4)}` : phone;
}

/* ---------------------------------------------------------------- verify */

export interface CheckResult {
  ok: boolean;
  /** What the visitor filled in before the code existed. */
  carried?: {
    name: string | null;
    level: "ug" | "pg" | null;
    rank: number | null;
    category: string | null;
    sourcePage: string | null;
  };
  message?: string;
}

/**
 * Checks a typed code against the newest live one for that number.
 *
 * The attempt counter is incremented on the row before the comparison, so a
 * wrong guess costs a try whatever happens next — including a crash between
 * the two.
 */
export async function checkCode(
  rawPhone: string,
  rawCode: string,
  purpose: OtpPurpose,
): Promise<CheckResult> {
  const phone = normalisePhone(rawPhone);
  const code = String(rawCode ?? "").replace(/\D/g, "");
  if (!phone) return { ok: false, message: "That does not look like an Indian mobile number." };
  if (code.length !== 6) return { ok: false, message: "Enter the six digits we sent you." };

  const rows = (await db.execute(sql`
    SELECT id, code_hash, attempts, name, level::text AS level, rank, category, source_page
      FROM otp_codes
     WHERE phone = ${phone}
       AND purpose = ${purpose}
       AND consumed_at IS NULL
       AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1
  `)) as unknown as Record<string, unknown>[];

  const row = rows[0];
  if (!row) {
    return { ok: false, message: "That code has expired. Ask for a new one." };
  }

  if ((row.attempts as number) >= MAX_ATTEMPTS) {
    await db.execute(sql`UPDATE otp_codes SET consumed_at = now() WHERE id = ${row.id}`);
    return { ok: false, message: "Too many wrong tries. Ask for a new code." };
  }

  await db.execute(sql`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ${row.id}`);

  const expected = row.code_hash as string;
  const given = await hashCode(code, phone, purpose);

  // Constant-time compare. Both are fixed-length hex of the same HMAC, so a
  // length mismatch is already a mismatch.
  if (given.length !== expected.length) return { ok: false, message: "That code is not right." };
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  if (diff !== 0) {
    const left = MAX_ATTEMPTS - ((row.attempts as number) + 1);
    return {
      ok: false,
      message: left > 0 ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.` : "That code is not right.",
    };
  }

  await db.execute(sql`UPDATE otp_codes SET consumed_at = now() WHERE id = ${row.id}`);

  return {
    ok: true,
    carried: {
      name: (row.name as string) ?? null,
      level: (row.level as "ug" | "pg") ?? null,
      rank: (row.rank as number) ?? null,
      category: (row.category as string) ?? null,
      sourcePage: (row.source_page as string) ?? null,
    },
  };
}

/** Old rows are only useful to somebody who should not have them. */
export async function sweepCodes(): Promise<void> {
  try {
    await db.execute(sql`DELETE FROM otp_codes WHERE expires_at < now() - interval '2 days'`);
  } catch (error) {
    logError(error, { route: "otp:sweep" });
  }
}
