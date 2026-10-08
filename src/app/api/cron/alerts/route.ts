import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runAlertFeed } from "@/lib/alertFeed";
import { logError } from "@/lib/logger";

/**
 * Refresh the live alerts from the official notice boards (lib/alertFeed.ts).
 *
 * Called by the server's crontab, never by a browser:
 *   curl -fsS -X POST -H "x-cron-secret: $(cat /opt/admissionhands/.cron-secret)" \
 *        http://127.0.0.1:8150/api/cron/alerts
 * `CRON_SECRET` must be set in the app's env; unset, the route refuses
 * everything, so a misconfiguration fails closed. `?only=mcc-ug,nbems` runs
 * a subset.
 */
export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("x-cron-secret") ?? "";
  if (expected.length < 32 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const only = new URL(request.url).searchParams.get("only")?.split(",").filter(Boolean);
  try {
    const result = await runAlertFeed(only);
    const failed = result.reports.filter((r) => !r.ok);
    if (failed.length === result.reports.length) {
      logError(new Error("alert feed: every source failed"), { route: "cron/alerts" });
    }
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/alerts" });
    return NextResponse.json({ error: "feed failed" }, { status: 500 });
  }
}
