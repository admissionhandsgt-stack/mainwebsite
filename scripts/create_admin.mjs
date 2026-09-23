/**
 * Create or reset an admin account.
 *
 *   node scripts/create_admin.mjs admin@admissionhands.com "a strong password"
 *   node scripts/create_admin.mjs admin@admissionhands.com            # generates one
 *
 * Passwords are hashed with scrypt before they touch the database. The
 * plaintext is printed once, here, and never stored — if it is lost, run this
 * again to set a new one.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import postgres from "postgres";

const scrypt = promisify(scryptCb);

const [, , emailArg, passwordArg] = process.argv;
if (!emailArg || !emailArg.includes("@")) {
  console.error("Usage: node scripts/create_admin.mjs <email> [password]");
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const password = passwordArg ?? randomBytes(12).toString("base64url");
const generated = !passwordArg;

if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

function env() {
  const out = {};
  const p = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return { ...out, ...process.env };
}

const DATABASE_URL = env().DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(1);
}

const salt = randomBytes(16);
const key = await scrypt(password, salt, 64);
const hash = `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;

const sql = postgres(DATABASE_URL, { max: 2, prepare: false, onnotice: () => {} });

try {
  const [row] = await sql`
    INSERT INTO admin_users (email, password_hash, name, is_active)
    VALUES (${email}, ${hash}, ${email.split("@")[0]}, true)
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash, is_active = true
    RETURNING id, email
  `;

  // Any existing sessions were issued against the old password.
  await sql`DELETE FROM admin_sessions WHERE user_id = ${row.id}`;

  console.log(`\n  Admin ready: ${row.email} (id ${row.id})`);
  if (generated) {
    console.log(`  Password   : ${password}`);
    console.log("\n  Save it now — it is not stored anywhere and cannot be recovered.\n");
  } else {
    console.log("  Password   : the one you passed in\n");
  }
  console.log("  Existing sessions for this account were signed out.\n");
} finally {
  await sql.end({ timeout: 5 });
}
