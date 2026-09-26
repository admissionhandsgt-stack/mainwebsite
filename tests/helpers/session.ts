/**
 * A real, verified visitor session — created in Postgres, then removed.
 *
 * The gate's own tests need to prove it *opens*, not only that it holds. A gate
 * that never opens is an outage, and it would pass every other assertion here.
 *
 * Why not sign in through the UI: the WhatsApp gateway is paired, so
 * `verificationRequired()` is on and a typed number is not enough — the real
 * flow needs an inbound message from the visitor's own phone. That path has its
 * own coverage in `scripts/verify_auth_flow.mjs`, which sends a live code and
 * reads it back off the gateway. Here the session is minted directly so these
 * specs test the gate rather than the OTP.
 *
 * Needs `DATABASE_URL`, which on a dev machine is the SSH tunnel — see the
 * PostgreSQL section of CLAUDE.md.
 */

import { randomBytes } from "node:crypto";
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

export interface TestSession {
  cookie: { name: string; value: string; domain?: string; path: string };
  phone: string;
  userId: number;
}

function client() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Open the SSH tunnel to Postgres, or run with --grep-invert 'signed in'.",
    );
  }
  return postgres(process.env.DATABASE_URL, { max: 1 });
}

/**
 * Mint a verified account and a live session.
 *
 * The id is 32 random bytes as hex: `userAuth.ts` rejects anything that is not
 * exactly 64 hex characters, which is worth knowing because a shorter id fails
 * as a silent 401 rather than an error.
 */
export async function createVerifiedSession(baseURL: string): Promise<TestSession> {
  const sql = client();
  try {
    const phone = `9${String(Math.floor(700000000 + Math.random() * 99999999)).slice(0, 9)}`;
    const value = randomBytes(32).toString("hex");

    const [user] = await sql`
      INSERT INTO users (phone, name, verified_at)
      VALUES (${phone}, 'Playwright gate', now())
      RETURNING id`;

    await sql`
      INSERT INTO user_sessions (id, user_id, expires_at)
      VALUES (${value}, ${user.id}, now() + interval '30 minutes')`;

    return {
      cookie: { name: "ah_user", value, domain: new URL(baseURL).hostname, path: "/" },
      phone,
      userId: user.id,
    };
  } finally {
    await sql.end();
  }
}

/**
 * Remove it.
 *
 * Runs from an `afterAll` even when the specs failed, so a red run never leaves
 * a usable session or a fake lead behind on a live site.
 */
export async function destroySession(session: TestSession): Promise<void> {
  const sql = client();
  try {
    await sql`DELETE FROM user_sessions WHERE id = ${session.cookie.value}`;
    await sql`DELETE FROM saved_colleges WHERE user_id = ${session.userId}`;
    await sql`DELETE FROM users WHERE id = ${session.userId}`;
  } finally {
    await sql.end();
  }
}
