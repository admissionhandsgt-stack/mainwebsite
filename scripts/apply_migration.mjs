import { readFileSync } from "node:fs";
import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });
const file = process.argv[2];
if (!file) { console.error("usage: node scripts/_apply.mjs <file.sql>"); process.exit(1); }
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
try {
  await sql.unsafe(readFileSync(file, "utf8"));
  console.log("applied", file);
} finally {
  await sql.end();
}
