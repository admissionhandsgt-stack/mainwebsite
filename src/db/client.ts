/**
 * Postgres connection for the app.
 *
 * One pooled client for the whole process. `prepare: false` because the app
 * runs behind a connection pooler in production, where prepared statements
 * do not survive between checkouts.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set — see .env.local");
}

/**
 * Pool size is per *process*, and `next build` runs one worker per CPU core.
 * On a 12-core machine `max: 10` asked for up to 120 connections against a
 * server that allows 100, and static generation failed with "Failed query" on
 * whichever pages lost the race. Four per process leaves headroom on any
 * machine this is likely to build on; bursts queue rather than being refused.
 */
const POOL_MAX = Number(process.env.DATABASE_POOL_MAX) || 4;

const queryClient = postgres(connectionString, {
  max: POOL_MAX,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(queryClient, { schema });
export { schema };
