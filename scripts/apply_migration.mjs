import { readFileSync } from "node:fs";
import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });
const file = process.argv[2];
if (!file) { console.error("usage: node scripts/_apply.mjs <file.sql>"); process.exit(1); }
// max: 1 — one connection, so a file can carry its own BEGIN … COMMIT (postgres.js refuses it on a pool).
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  await sql.unsafe(readFileSync(file, "utf8"));
  console.log("applied", file);
} finally {
  await sql.end();
}
