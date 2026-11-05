import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runZynNotices } from "@/lib/zynNotices";
import { logError } from "@/lib/logger";

/**
 * Notices approved by the owner in Zyn's Telegram flow, onto the site (lib/zynNotices.ts).
 *
 * Called by the server's crontab every 5 minutes, never by a browser:
 *   curl -fsS -X POST -H "x-cron-secret: $(cat /opt/admissionhands/.cron-secret)" \
 *        http://127.0.0.1:8150/api/cron/notices
 * With no endpoint or key saved, or the switch off, it does nothing. `CRON_SECRET` unset → every call refused.
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
  try {
    return NextResponse.json(await runZynNotices(), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/notices" });
    return NextResponse.json({ error: "notices failed" }, { status: 500 });
  }
}
