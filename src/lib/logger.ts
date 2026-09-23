/**
 * Where production failures go.
 *
 * Every `catch` in this codebase used to end at `console.error`, which on
 * Workers is a tail nobody watches. A 500 was invisible until somebody phoned
 * in. This writes the same information to Postgres, where the admin can read
 * it.
 *
 * Three rules, because a logger that breaks the thing it is logging is worse
 * than no logger:
 *
 *   1. **It never throws.** Every path is wrapped, and a failure to log is
 *      swallowed after a console line. The request must not fail because the
 *      log did.
 *   2. **It never blocks.** `logError` returns immediately; the write happens
 *      behind it. A slow database must not slow the page.
 *   3. **It never stores an IP.** Addresses are personal data and all we ever
 *      need is whether two failures came from the same visitor, which a hash
 *      answers.
 */

import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export type LogLevel = "error" | "warn";

export interface LogContext {
  route?: string;
  method?: string;
  status?: number;
  /** Anything route-specific worth keeping — ids, parameters, counts. */
  meta?: Record<string, unknown>;
  request?: Request;
}

/**
 * Groups the same failure together.
 *
 * Built from the message with the volatile parts stripped, because otherwise
 * "connection 4821 closed" and "connection 4822 closed" are two problems
 * instead of one seen twice.
 */
async function fingerprint(message: string, route?: string): Promise<string> {
  const normalised = message
    .replace(/\d+/g, "#")
    .replace(/0x[0-9a-f]+/gi, "#")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "#")
    .slice(0, 300);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${route ?? ""}|${normalised}`),
  );
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/** One-way, and truncated: enough to correlate, not enough to reverse. */
async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip || ip === "unknown") return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ah:${ip}`));
  return Array.from(new Uint8Array(digest).slice(0, 8), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

function clientIp(request?: Request): string | null {
  if (!request) return null;
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

async function write(level: LogLevel, error: unknown, context: LogContext) {
  const err = error instanceof Error ? error : null;
  const message = (err?.message ?? String(error)).slice(0, 2000);
  const stack = err?.stack?.slice(0, 8000) ?? null;

  // The console line stays. It is what you read while developing, and it is
  // the only thing left if the database write below fails.
  console.error(`[${level}]${context.route ? ` ${context.route}` : ""}`, error);

  try {
    const [fp, ip] = await Promise.all([
      fingerprint(message, context.route),
      hashIp(clientIp(context.request)),
    ]);

    await db.execute(sql`
      INSERT INTO error_log
        (level, fingerprint, message, stack, route, method, status, ip_hash, user_agent, meta)
      VALUES (
        ${level}, ${fp}, ${message}, ${stack},
        ${context.route ?? null}, ${context.method ?? null}, ${context.status ?? null},
        ${ip}, ${context.request?.headers.get("user-agent")?.slice(0, 400) ?? null},
        ${context.meta ? JSON.stringify(context.meta) : null}
      )
    `);
  } catch (loggingFailure) {
    // Deliberately terminal. If the log cannot be written there is nowhere
    // left to report that, and retrying would risk a loop.
    console.error("[logger] could not write to error_log:", loggingFailure);
  }
}

/**
 * Records a failure. Returns immediately — do not await it.
 *
 * Fire-and-forget on purpose: a request should not wait on its own postmortem.
 */
export function logError(error: unknown, context: LogContext = {}): void {
  void write("error", error, context);
}

/** For things that are wrong but did not fail the request. */
export function logWarn(error: unknown, context: LogContext = {}): void {
  void write("warn", error, context);
}

/**
 * Wraps a route handler so anything it throws is recorded and answered
 * with a 500 rather than an unhandled rejection.
 *
 * Handlers that already catch their own errors keep doing so; this is the net
 * underneath them.
 */
export function withLogging<T extends unknown[]>(
  route: string,
  handler: (request: Request, ...rest: T) => Promise<Response>,
) {
  return async (request: Request, ...rest: T): Promise<Response> => {
    try {
      return await handler(request, ...rest);
    } catch (error) {
      logError(error, { route, method: request.method, status: 500, request });
      return new Response(JSON.stringify({ error: "Something went wrong." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}

export interface ErrorGroup {
  fingerprint: string;
  message: string;
  route: string | null;
  level: string;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
}

/**
 * Recent failures, grouped.
 *
 * One row per distinct failure with a count, because the same broken query 400
 * times is one thing to fix, not 400 things to read.
 */
export async function recentErrors(limit = 50): Promise<ErrorGroup[]> {
  try {
    const rows = (await db.execute(sql`
      SELECT fingerprint,
             (array_agg(message ORDER BY created_at DESC))[1] AS message,
             (array_agg(route   ORDER BY created_at DESC))[1] AS route,
             (array_agg(level   ORDER BY created_at DESC))[1] AS level,
             count(*)::int AS occurrences,
             min(created_at) AS first_seen,
             max(created_at) AS last_seen
        FROM error_log
       WHERE created_at > now() - interval '30 days'
       GROUP BY fingerprint
       ORDER BY max(created_at) DESC
       LIMIT ${limit}
    `)) as unknown as Record<string, unknown>[];

    return rows.map((r) => ({
      fingerprint: r.fingerprint as string,
      message: r.message as string,
      route: (r.route as string) ?? null,
      level: r.level as string,
      occurrences: r.occurrences as number,
      firstSeen: new Date(r.first_seen as string).toISOString(),
      lastSeen: new Date(r.last_seen as string).toISOString(),
    }));
  } catch (error) {
    console.error("[logger] recentErrors:", error);
    return [];
  }
}
