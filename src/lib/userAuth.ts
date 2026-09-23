/**
 * Accounts for site visitors, as distinct from the admin.
 *
 * Phone-first, with a password after the first time.
 *
 * The number is the identity and it is proved once, by a code we send to it
 * (`src/lib/otp.ts`). After that a password gets them back in from any device
 * in two fields — which is what a visitor on a laptop needs, and what the
 * original passwordless design got wrong: it made every single sign-in depend
 * on picking up a phone and messaging us.
 *
 * The password stays **optional**. Skip it and the code path still works, so
 * nobody is locked out by having forgotten something. What it removes is the
 * need to repeat the proof.
 *
 *   first visit   phone -> code -> verified -> offered a password
 *   every visit   phone -> password
 *   forgot it     phone -> code -> set a new one
 *
 * Sessions are rows, not signed tokens, for the same reason the admin's are:
 * signing out has to actually revoke, not merely stop presenting.
 *
 * Kept entirely separate from `admin_users`. A visitor and a staff member have
 * nothing in common but the word "user", and sharing a table is one bug away
 * from a student holding an admin session.
 */

import { cookies } from "next/headers";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { normalisePhone, unlockFrom, verifyUnlock, UNLOCK_COOKIE } from "@/lib/leadGate";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { verifyEnabled, gatewayReady } from "@/lib/waVerify";

export const USER_COOKIE = "ah_user";

/** A counselling season, so nobody is signed out in the middle of it. */
const SESSION_DAYS = 120;

export interface SiteUser {
  id: number;
  phone: string;
  name: string | null;
  email: string | null;
  level: "ug" | "pg" | null;
  rank: number | null;
  category: string | null;
  verified: boolean;
  /** Whether signing in can skip the code. */
  hasPassword: boolean;
}

function newSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface UpsertInput {
  phone: string;
  name?: string | null;
  email?: string | null;
  level?: "ug" | "pg" | null;
  rank?: number | null;
  category?: string | null;
  /** True when the number was proved over WhatsApp rather than just typed. */
  verified?: boolean;
}

/**
 * Finds or creates the account behind a phone number.
 *
 * Details are only ever filled in, never blanked: someone who unlocks a second
 * time without retyping their name must not lose the name they gave first.
 * Verification is one-way for the same reason — once proved, always proved.
 */
export async function upsertUser(input: UpsertInput): Promise<SiteUser | null> {
  const phone = normalisePhone(input.phone);
  if (!phone) return null;

  const rows = (await db.execute(sql`
    INSERT INTO users (phone, name, email, level, rank, category, verified_at, last_seen_at)
    VALUES (
      ${phone}, ${input.name ?? null}, ${input.email ?? null},
      ${input.level ?? null}::level, ${input.rank ?? null}, ${input.category ?? null},
      ${input.verified ? sql`now()` : sql`NULL`}, now()
    )
    ON CONFLICT (phone) DO UPDATE SET
      name        = COALESCE(EXCLUDED.name, users.name),
      email       = COALESCE(EXCLUDED.email, users.email),
      level       = COALESCE(EXCLUDED.level, users.level),
      rank        = COALESCE(EXCLUDED.rank, users.rank),
      category    = COALESCE(EXCLUDED.category, users.category),
      verified_at = COALESCE(users.verified_at, EXCLUDED.verified_at),
      last_seen_at = now()
    RETURNING id, phone, name, email, level::text AS level, rank, category,
              verified_at, password_hash
  `)) as unknown as Record<string, unknown>[];

  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id as number,
    phone: r.phone as string,
    name: (r.name as string) ?? null,
    email: (r.email as string) ?? null,
    level: (r.level as "ug" | "pg") ?? null,
    rank: (r.rank as number) ?? null,
    category: (r.category as string) ?? null,
    verified: Boolean(r.verified_at),
    hasPassword: Boolean(r.password_hash),
  };
}

/** Issues a session and sets the cookie. */
export async function startSession(userId: number): Promise<{ id: string; expires: Date }> {
  const id = newSessionId();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.execute(sql`
    INSERT INTO user_sessions (id, user_id, expires_at)
    VALUES (${id}, ${userId}, ${expires.toISOString()})
  `);

  // Housekeeping, not on the critical path — a failure here must not stop
  // somebody signing in.
  db.execute(sql`DELETE FROM user_sessions WHERE expires_at < now()`).catch((e) =>
    console.error("[userAuth] session sweep failed:", e),
  );

  return { id, expires };
}

/**
 * The cookie for a session.
 *
 * Returned rather than set, because route handlers must put it on their own
 * `NextResponse` — `cookies()` is read-only there, and a silently dropped
 * cookie would look like a login that did nothing.
 */
export function sessionCookie(session: { id: string; expires: Date }) {
  return {
    name: USER_COOKIE,
    value: session.id,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: session.expires,
  };
}

/** The signed-in visitor, or null. Safe to call anywhere on the server. */
export async function currentUser(): Promise<SiteUser | null> {
  const id = cookies().get(USER_COOKIE)?.value;
  if (!id || !/^[0-9a-f]{64}$/.test(id)) return null;

  try {
    const rows = (await db.execute(sql`
      SELECT u.id, u.phone, u.name, u.email, u.level::text AS level,
             u.rank, u.category, u.verified_at, u.password_hash, s.expires_at
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
       WHERE s.id = ${id}
       LIMIT 1
    `)) as unknown as Record<string, unknown>[];

    const r = rows[0];
    if (!r) return null;

    if (new Date(r.expires_at as string) < new Date()) {
      await db.execute(sql`DELETE FROM user_sessions WHERE id = ${id}`);
      return null;
    }

    return {
      id: r.id as number,
      phone: r.phone as string,
      name: (r.name as string) ?? null,
      email: (r.email as string) ?? null,
      level: (r.level as "ug" | "pg") ?? null,
      rank: (r.rank as number) ?? null,
      category: (r.category as string) ?? null,
      verified: Boolean(r.verified_at),
      hasPassword: Boolean(r.password_hash),
    };
  } catch (error) {
    // A database blip must read as "signed out", never as "signed in".
    console.error("[userAuth] currentUser:", error);
    return null;
  }
}

/** Reads the session straight off a request, for route handlers. */
export async function userFromRequest(request: Request): Promise<SiteUser | null> {
  const raw = request.headers.get("cookie") ?? "";
  const id = raw.match(new RegExp(`(?:^|;\\s*)${USER_COOKIE}=([^;]+)`))?.[1];
  if (!id || !/^[0-9a-f]{64}$/.test(id)) return null;

  try {
    const rows = (await db.execute(sql`
      SELECT u.id, u.phone, u.name, u.verified_at, u.password_hash
        FROM user_sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ${id} AND s.expires_at > now()
       LIMIT 1
    `)) as unknown as Record<string, unknown>[];
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id as number,
      phone: r.phone as string,
      name: (r.name as string) ?? null,
      email: null,
      level: null,
      rank: null,
      category: null,
      verified: Boolean(r.verified_at),
      hasPassword: Boolean(r.password_hash),
    };
  } catch {
    return null;
  }
}

/* ---------------------------- passwords ---------------------------- *
 *
 * Reusing the admin's scrypt helpers rather than a second scheme. One place
 * that knows how a password is stored is one place to get it right, and the
 * hashes are self-describing (`scrypt:salt:key`) so they can be told apart if
 * the scheme ever changes.
 */

export interface AccountLookup {
  exists: boolean;
  hasPassword: boolean;
  /** First name only, so the screen can greet them without printing the record. */
  firstName: string | null;
  verified: boolean;
}

/**
 * What the sign-in screen needs to know after the number is entered: whether to
 * ask for a password or send a code.
 *
 * This does reveal whether a number has an account here. That is the cost of a
 * single-field first step, and it is the right trade for this product — the
 * alternative is asking every visitor to self-identify as new or returning,
 * which is a question only we can answer. The route rate-limits it so the
 * answer cannot be harvested in bulk.
 */
export async function accountLookup(rawPhone: string): Promise<AccountLookup> {
  const phone = normalisePhone(rawPhone);
  const none = { exists: false, hasPassword: false, firstName: null, verified: false };
  if (!phone) return none;

  try {
    const rows = (await db.execute(sql`
      SELECT name, password_hash, verified_at FROM users WHERE phone = ${phone} LIMIT 1
    `)) as unknown as Record<string, unknown>[];
    const r = rows[0];
    if (!r) return none;
    const name = (r.name as string) ?? null;
    return {
      exists: true,
      hasPassword: Boolean(r.password_hash),
      firstName: name ? name.trim().split(/\s+/)[0] : null,
      verified: Boolean(r.verified_at),
    };
  } catch (error) {
    console.error("[userAuth] accountLookup:", error);
    return none;
  }
}

/** Sets or replaces the password on an account. */
export async function setUserPassword(userId: number, password: string): Promise<boolean> {
  if (typeof password !== "string" || password.length < 8) return false;
  try {
    const hash = await hashPassword(password);
    await db.execute(sql`
      UPDATE users SET password_hash = ${hash}, password_set_at = now() WHERE id = ${userId}
    `);
    return true;
  } catch (error) {
    console.error("[userAuth] setUserPassword:", error);
    return false;
  }
}

/**
 * Phone plus password.
 *
 * A missing account still runs the hash comparison against a dummy, so a
 * number that exists here does not answer faster than one that does not.
 */
export async function authenticateUser(
  rawPhone: string,
  password: string,
): Promise<SiteUser | null> {
  const phone = normalisePhone(rawPhone);
  if (!phone || typeof password !== "string" || !password) return null;

  try {
    const rows = (await db.execute(sql`
      SELECT id, phone, name, email, level::text AS level, rank, category,
             verified_at, password_hash
        FROM users WHERE phone = ${phone} LIMIT 1
    `)) as unknown as Record<string, unknown>[];

    const r = rows[0];
    const stored = (r?.password_hash as string) ?? "scrypt:00:00";
    const ok = await verifyPassword(password, stored);
    if (!ok || !r) return null;

    await db.execute(sql`UPDATE users SET last_seen_at = now() WHERE id = ${r.id}`);

    return {
      id: r.id as number,
      phone: r.phone as string,
      name: (r.name as string) ?? null,
      email: (r.email as string) ?? null,
      level: (r.level as "ug" | "pg") ?? null,
      rank: (r.rank as number) ?? null,
      category: (r.category as string) ?? null,
      verified: Boolean(r.verified_at),
      hasPassword: true,
    };
  } catch (error) {
    console.error("[userAuth] authenticateUser:", error);
    return null;
  }
}

/** Revokes the session server-side, then clears the cookie. */
export async function signOut(): Promise<void> {
  const id = cookies().get(USER_COOKIE)?.value;
  if (id) {
    try {
      await db.execute(sql`DELETE FROM user_sessions WHERE id = ${id}`);
    } catch (error) {
      console.error("[userAuth] signOut:", error);
    }
  }
  cookies().delete(USER_COOKIE);
}

/** Remembers what the visitor last searched, so the tools open where they left off. */
export async function rememberSearch(
  userId: number,
  level: "ug" | "pg",
  rank: number | null,
  category: string | null,
): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE users
         SET level = ${level}::level,
             rank = COALESCE(${rank}, rank),
             category = COALESCE(${category}, category),
             last_seen_at = now()
       WHERE id = ${userId}
    `);
  } catch (error) {
    console.error("[userAuth] rememberSearch:", error);
  }
}

/* ------------------------------ access ------------------------------ *
 *
 * Two ways to be through the gate, and they must behave identically or the
 * site will feel broken to whichever group gets the worse one:
 *
 *   a signed-in account  — the durable one, survives clearing a cookie
 *   an unlock cookie     — the visitor who gave a number but has no account
 *
 * These live here rather than in `leadGate.ts` because that module knows
 * nothing about users, and keeping the dependency one-way avoids a cycle.
 */

/**
 * Whether a *proved* number is required, rather than merely a given one.
 *
 * Switched on by capability, not by intent. Setting a verification number in
 * the admin says we would like proof; it does not mean proof can be obtained.
 * The inbound message has to arrive through the WAHA gateway, so without a
 * gateway configured the code is issued, nothing can ever confirm it, and
 * every visitor is locked out of data they were willing to pay a number for.
 *
 * So both must be true: verification is switched on *and* there is a gateway
 * for the message to arrive through. Configure the gateway and this turns
 * itself on with no further change.
 */
async function verificationRequired(): Promise<boolean> {
  const on = await verifyEnabled();
  if (!on) return false;
  // And the gateway must be paired, not merely configured — see gatewayReady().
  return gatewayReady();
}

/** For route handlers, which have the request. */
export async function hasAccess(request: Request): Promise<boolean> {
  const strict = await verificationRequired();
  const user = await userFromRequest(request);
  if (user) return strict ? user.verified : true;
  // Without an account, an unlock cookie only counts when proof is not needed.
  if (strict) return false;
  return Boolean(await unlockFrom(request));
}

/** For server components, which read cookies from context. */
export async function hasAccessServer(): Promise<boolean> {
  const strict = await verificationRequired();
  const user = await currentUser();
  if (user) return strict ? user.verified : true;
  if (strict) return false;
  return Boolean(await verifyUnlock(cookies().get(UNLOCK_COOKIE)?.value));
}

/** What the UI should ask for: nothing, a number, or a verified number. */
export async function accessState(request: Request): Promise<{
  open: boolean;
  needsVerification: boolean;
  signedIn: boolean;
}> {
  const [strict, user] = await Promise.all([verificationRequired(), userFromRequest(request)]);
  const open = user ? (strict ? user.verified : true) : strict ? false : Boolean(await unlockFrom(request));
  return { open, needsVerification: strict, signedIn: Boolean(user) };
}
