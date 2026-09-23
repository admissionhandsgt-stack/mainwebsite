/**
 * The gate in front of the seat data.
 *
 * `/api/predict` hands out up to 300 fully detailed seats per call, and the
 * closing-rank data is the product. Rate limiting alone only slows a scraper
 * down; it still gets everything eventually. This asks for a phone number
 * first, which does two things at once: it puts a cost on bulk collection
 * (every 300 seats needs a fresh number and a fresh IP) and it turns the
 * people who actually want the data into leads.
 *
 * **What this is not: it is not phone verification.** A real OTP means an SMS
 * or a WhatsApp authentication template, and both are billed per message —
 * the brief was explicitly zero-cost, so nothing here sends anything. The
 * number is validated for shape and recorded, not proven. What proves it is
 * the WhatsApp hand-off after unlocking: the visitor opens a `wa.me` link and
 * messages us themselves, which is free because it is inbound and
 * user-initiated, and it arrives from their real number.
 *
 * If a paid provider is added later, `POST /api/unlock` is the only place that
 * has to change — it already mints the cookie at exactly the point where a
 * verified callback would.
 */

const ENCODER = new TextEncoder();

export const UNLOCK_COOKIE = "ah_unlock";

/** Long enough that a returning visitor is not asked twice in a season. */
const TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Seats shown before the gate.
 *
 * Enough to prove the tool works and that the answer is real — three seats a
 * counsellor would actually name first — and far too few to be worth
 * harvesting at 300 per unlock.
 */
export const PREVIEW_SEATS = 3;

/**
 * Signing key.
 *
 * With no `UNLOCK_SECRET` set, a random one is generated per process. That
 * degrades correctly rather than dangerously: unlocks stop surviving a
 * restart, which is an annoyance, where a hardcoded fallback secret would let
 * anyone mint their own cookie forever.
 */
let cachedKey: Promise<CryptoKey> | null = null;

function signingKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  let secret = process.env.UNLOCK_SECRET;
  if (!secret || secret.length < 16) {
    secret = crypto.randomUUID() + crypto.randomUUID();
    console.warn(
      "[leadGate] UNLOCK_SECRET is not set — using a per-process key. " +
        "Unlocks will not survive a restart or span more than one instance.",
    );
  }

  cachedKey = crypto.subtle.importKey(
    "raw",
    ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return cachedKey;
}

const b64url = (bytes: ArrayBuffer | Uint8Array): string => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // Indexed rather than `for…of`: the build target predates downlevel
  // iteration over typed arrays.
  let binary = "";
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromB64url = (s: string): Uint8Array => {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

/**
 * The number is stored as a hash, never in the clear.
 *
 * The cookie rides on a shared device as often as not, and a readable phone
 * number in it would be a leak for no gain — we only ever need to know that
 * *some* number was given, and to recognise the same one again.
 */
async function hashPhone(phone: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", ENCODER.encode(`ah:${phone}`));
  return b64url(digest).slice(0, 22);
}

export interface UnlockClaim {
  /** Hashed, not the number itself. */
  ref: string;
  /** Seconds since epoch. */
  exp: number;
}

/** Issues a token for a number that has just been recorded as a lead. */
export async function mintUnlock(phone: string): Promise<string> {
  const claim: UnlockClaim = {
    ref: await hashPhone(phone),
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const body = b64url(ENCODER.encode(JSON.stringify(claim)));
  const sig = await crypto.subtle.sign("HMAC", await signingKey(), ENCODER.encode(body));
  return `${body}.${b64url(sig)}`;
}

/**
 * Verifies a token, or returns null.
 *
 * Signature first, then expiry — checking expiry on an unverified payload
 * would be reading attacker-controlled JSON and treating it as fact.
 */
export async function verifyUnlock(token: string | undefined | null): Promise<UnlockClaim | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      fromB64url(sig),
      ENCODER.encode(body),
    );
    if (!ok) return null;

    const claim = JSON.parse(new TextDecoder().decode(fromB64url(body))) as UnlockClaim;
    if (typeof claim?.exp !== "number" || claim.exp < Math.floor(Date.now() / 1000)) return null;
    return claim;
  } catch {
    return null;
  }
}

/** Reads the unlock straight off a request, for route handlers. */
export async function unlockFrom(request: Request): Promise<UnlockClaim | null> {
  const raw = request.headers.get("cookie") ?? "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${UNLOCK_COOKIE}=([^;]+)`));
  return verifyUnlock(match?.[1]);
}

/**
 * The cookie the browser gets back.
 *
 * `HttpOnly` so script on the page cannot lift it, `Secure` outside local
 * development, and `Lax` because the unlock must survive following a link in
 * from Google or WhatsApp.
 */
export function unlockCookie(token: string) {
  return {
    name: UNLOCK_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TTL_SECONDS,
  };
}

/**
 * Indian mobile numbers, which is every number this form will see.
 *
 * Deliberately strict: it is the only check standing between the lead table
 * and a column full of `0000000000`, since nothing is sent to the number to
 * prove it exists.
 */
export function normalisePhone(input: unknown): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) return null;
  return `+91${local}`;
}
