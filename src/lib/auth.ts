/**
 * Admin authentication — replaces Supabase Auth.
 *
 * Passwords are hashed with scrypt (Node's built-in, memory-hard, no external
 * dependency). Sessions are rows in `admin_sessions`, not signed tokens, so a
 * logout genuinely ends the session and cannot be replayed with a stolen
 * cookie that has not expired yet.
 *
 * Server-only. Never import this from a component that runs in the browser.
 */

import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SESSION_COOKIE = "ah_admin_session";
const SESSION_DAYS = 7;

const rows = <T,>(r: unknown) => r as unknown as T[];

/* ---------------------------- passwords ---------------------------- */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;

  const key = await scrypt(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  const expected = Buffer.from(keyHex, "hex");
  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false, and a thrown error would leak the difference.
  if (key.length !== expected.length) return false;
  return timingSafeEqual(key, expected);
}

/* ----------------------------- sessions ---------------------------- */

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
}

export async function createSession(userId: number): Promise<string> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.execute(sql`
    INSERT INTO admin_sessions (id, user_id, expires_at)
    VALUES (${id}, ${userId}, ${expiresAt.toISOString()})
  `);

  // Sweep expired rows here rather than on a cron: sign-in is rare, the table
  // is small, and a failed sweep must never block a successful login.
  db.execute(sql`DELETE FROM admin_sessions WHERE expires_at < now()`).catch((e) =>
    console.error("[auth] could not clear expired sessions", e),
  );

  cookies().set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return id;
}

/** The signed-in admin, or null. Expired rows are deleted as they are found. */
export async function getSessionUser(): Promise<AdminUser | null> {
  const id = cookies().get(SESSION_COOKIE)?.value;
  if (!id) return null;

  try {
    const r = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT u.id, u.email, u.name, s.expires_at
        FROM admin_sessions s
        JOIN admin_users u ON u.id = s.user_id
        WHERE s.id = ${id} AND u.is_active = true
        LIMIT 1
      `),
    )[0];

    if (!r) return null;

    if (new Date(r.expires_at as string) < new Date()) {
      await db.execute(sql`DELETE FROM admin_sessions WHERE id = ${id}`);
      return null;
    }

    return { id: r.id as number, email: r.email as string, name: (r.name as string) ?? null };
  } catch (error) {
    console.error("[auth:getSessionUser]", error);
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const id = cookies().get(SESSION_COOKIE)?.value;
  if (id) {
    try {
      await db.execute(sql`DELETE FROM admin_sessions WHERE id = ${id}`);
    } catch (error) {
      console.error("[auth:destroySession]", error);
    }
  }
  cookies().delete(SESSION_COOKIE);
}

/* ------------------------------ login ------------------------------ */

export async function authenticate(email: string, password: string): Promise<AdminUser | null> {
  const r = rows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT id, email, name, password_hash
      FROM admin_users
      WHERE lower(email) = lower(${email}) AND is_active = true
      LIMIT 1
    `),
  )[0];

  // Hash anyway when the user does not exist, so a missing account and a wrong
  // password take the same time and cannot be told apart.
  const stored = (r?.password_hash as string) ?? "scrypt:00:00";
  const ok = await verifyPassword(password, stored);
  if (!r || !ok) return null;

  await db.execute(sql`UPDATE admin_users SET last_login_at = now() WHERE id = ${r.id as number}`);
  return { id: r.id as number, email: r.email as string, name: (r.name as string) ?? null };
}

/**
 * Guard for admin API routes. Returns the user, or a Response to return as-is.
 *
 *   const auth = await requireAdmin();
 *   if (auth instanceof Response) return auth;
 */
export async function requireAdmin(): Promise<AdminUser | Response> {
  const user = await getSessionUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not signed in." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
