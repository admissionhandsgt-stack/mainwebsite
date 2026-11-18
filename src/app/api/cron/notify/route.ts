import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logError } from "@/lib/logger";
import { notifyChange, resubmitSitemap, schedulePaths } from "@/lib/notifyChange";

/**
 * Tell search engines that pages changed, for a change made outside the app — an SQL file run by hand, an import script
 * (2026-11-18). The app's own writers (Zyn notices, MCC results and added seats, an admin edit of MCC's schedule) call
 * lib/notifyChange.ts themselves. Through the server only (scripts/notify_change.sh):
 *   curl -fsS -X POST -H "x-cron-secret: $(cat /opt/admissionhands/.cron-secret)" -H "content-type: application/json" \
 *        -d '{"schedule":true,"paths":["/neet-counselling-updates"],"reason":"Round 2 hold"}' http://127.0.0.1:8150/api/cron/notify
 * `schedule: true` adds every page that prints MCC's dates; `force: true` resubmits the sitemap even inside the 20-minute gap.
 * 404 for everything when CRON_SECRET is unset or wrong, like every cron route.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("x-cron-secret") ?? "";
  if (expected.length < 32 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const PATH = /^\/[a-z0-9\-/]{0,200}$/;

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = (await request.json().catch(() => ({}))) as { paths?: unknown; schedule?: unknown; force?: unknown; reason?: unknown };
    const paths = (Array.isArray(body.paths) ? body.paths : []).filter((p): p is string => typeof p === "string" && PATH.test(p)).slice(0, 100);
    if (body.schedule === true) paths.push(...(await schedulePaths()));
    const reason = typeof body.reason === "string" ? body.reason.slice(0, 120) : "manual change";
    if (body.force === true) await resubmitSitemap(true);
    const out = await notifyChange(paths, reason);
    return NextResponse.json({ ...out, paths }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/notify" });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
