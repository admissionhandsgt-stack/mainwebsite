import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runWatch, checkPaths, queueCheck } from "@/lib/pageWatch";
import { logError } from "@/lib/logger";

/**
 * The page watcher's sweep (lib/pageWatch.ts), every 10 minutes from the server crontab:
 *   curl -fsS -X POST -H "x-cron-secret: $(cat /opt/admissionhands/.cron-secret)" http://127.0.0.1:8150/api/cron/page-watch
 * With a body it checks named pages now ({"check":["/path",…]}) or queues them for the next sweep ({"queue":[…]}) —
 * scripts/notify_change.sh and the import scripts use it. 404 without the cron secret, like every cron route.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 600;

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("x-cron-secret") ?? "";
  if (expected.length < 32 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const PATH = /^\/[a-z0-9\-/]{0,200}$/;
const paths = (v: unknown) => (Array.isArray(v) ? v : []).filter((p): p is string => typeof p === "string" && PATH.test(p));

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = (await request.json().catch(() => ({}))) as { check?: unknown; queue?: unknown; reason?: unknown; budget?: unknown };
    const reason = typeof body.reason === "string" ? body.reason.slice(0, 120) : "named by hand";
    if (Array.isArray(body.queue)) {
      const list = paths(body.queue).slice(0, 5000);
      await queueCheck(list);
      return NextResponse.json({ queued: list.length }, { headers: { "cache-control": "no-store" } });
    }
    if (Array.isArray(body.check)) {
      const r = await checkPaths(paths(body.check).slice(0, 60), reason);
      return NextResponse.json(r, { headers: { "cache-control": "no-store" } });
    }
    const budget = typeof body.budget === "number" && body.budget > 0 ? Math.min(body.budget, 540) * 1000 : undefined;
    const r = await runWatch(budget);
    return NextResponse.json(
      { ...r, changed: r.changed.slice(0, 50), failed: r.failed.slice(0, 50), unstable: r.unstable.slice(0, 50) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    logError(error, { route: "cron/page-watch" });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
