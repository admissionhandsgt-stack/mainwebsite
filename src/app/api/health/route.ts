import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { readBeats } from "@/lib/heartbeat";

/**
 * GET /api/health — is everything that runs by itself still running? Read every 5 minutes by Google Cloud Monitoring
 * uptime checks (project admissionhands-seo-1008), which email the owner when it answers anything but 200 twice running.
 *
 * Header `x-health-key` = HEALTH_SECRET. Without it (or with HEALTH_SECRET unset) the route is a 404 before it touches
 * the database: the repository is public, so the list of what we run and when it last worked is not for anybody.
 *
 * A heartbeat that has never been written reads as "pending", not a failure, so a new job (or the weekly NMC sync after
 * a fresh database) does not page anybody. Every job here beats at least weekly; check `pending` is empty a week after
 * adding one.
 */
export const dynamic = "force-dynamic";

const MIN = 60_000;
/** Job → the longest gap that is still normal (its schedule plus slack). */
const MAX_AGE: Record<string, number> = {
  sheets: 10 * MIN, // every 2 minutes
  notices: 20 * MIN, // every 5 minutes
  followups: 75 * MIN, // hourly at :23
  alerts: 150 * MIN, // every 2 hours at :07
  digest: 26 * 60 * MIN, // daily 04:30 UTC
  backup: 26 * 60 * MIN, // daily 21:15 UTC, written by the host's backup.sh
  nmc: 8 * 24 * 60 * MIN, // Mondays 03:41 UTC
  "search-links": 8 * 24 * 60 * MIN, // Mondays 05:17 UTC
  outreach: 26 * 60 * MIN, // daily 05:35 UTC
  "outreach-inbox": 3 * 60 * MIN, // hourly at :47
  "outreach-discover": 8 * 24 * 60 * MIN, // Tuesdays 05:50 UTC
  hunt: 26 * 60 * MIN, // daily 06:05 UTC
  indexnow: 26 * 60 * MIN, // daily 06:25 UTC: changed URLs to Bing (IndexNow)
};
/** The MCC result worker checks every 2 minutes near a round, every 30 otherwise. */
const WORKER_MAX_AGE = 45 * MIN;
/** Official WhatsApp sends accepted by Meta with no receipt after 30 minutes — the outage of 13–16 Oct 2026 looked like this. */
const STUCK_WA_LIMIT = 3;
/** The container's limit is 2,560 MB; the app has died near 2.5 GB twice. */
const RSS_LIMIT_MB = 1_800;

function authorised(request: Request): boolean {
  const expected = process.env.HEALTH_SECRET ?? "";
  const given = request.headers.get("x-health-key") ?? "";
  if (expected.length < 32 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

type Check = { name: string; ok: boolean; note?: string };

export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const checks: Check[] = [];
  const now = Date.now();
  const mins = (ms: number) => `${Math.round(ms / MIN)} min ago`;

  try {
    const beats = await readBeats();
    for (const [job, max] of Object.entries(MAX_AGE)) {
      const b = beats.get(job);
      if (!b) {
        checks.push({ name: job, ok: true, note: "pending (no run recorded yet)" });
        continue;
      }
      const age = now - b.at.getTime();
      const fresh = age <= max;
      checks.push({
        name: job,
        ok: fresh && b.ok,
        note: `${b.ok ? "ok" : "failed"} ${mins(age)}${fresh ? "" : " (late)"}${b.detail ? ` — ${b.detail}` : ""}`,
      });
    }

    const [worker] = (await db.execute(sql`
      SELECT to_json(max(at))#>>'{}' AS at FROM mcc_worker_log WHERE level = 'check'
    `)) as unknown as Array<{ at: string | null }>;
    const workerAge = worker?.at ? now - new Date(worker.at).getTime() : Infinity;
    checks.push({
      name: "mcc-worker",
      ok: workerAge <= WORKER_MAX_AGE,
      note: Number.isFinite(workerAge) ? mins(workerAge) : "never",
    });

    const [wa] = (await db.execute(sql`
      SELECT count(*)::int AS n FROM wa_messages
       WHERE direction = 'out' AND status = 'accepted'
         AND created_at BETWEEN now() - interval '24 hours' AND now() - interval '30 minutes'
    `)) as unknown as Array<{ n: number }>;
    checks.push({ name: "whatsapp-receipts", ok: (wa?.n ?? 0) < STUCK_WA_LIMIT, note: `${wa?.n ?? 0} without a receipt` });
  } catch (error) {
    checks.push({ name: "database", ok: false, note: error instanceof Error ? error.message.slice(0, 120) : "query failed" });
  }

  const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
  checks.push({ name: "memory", ok: rss < RSS_LIMIT_MB, note: `${rss} MB` });

  const ok = checks.every((c) => c.ok);
  return NextResponse.json(
    { ok, checks },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } },
  );
}
