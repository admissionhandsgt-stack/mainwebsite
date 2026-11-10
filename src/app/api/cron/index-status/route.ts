import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { inspectOldest } from "@/lib/indexStatus";
import { logError } from "@/lib/logger";
import { beat } from "@/lib/heartbeat";

/**
 * Daily (server crontab, 03:35 UTC): Google's index status of the sitemap URLs inspected longest ago (lib/indexStatus.ts),
 * so the "More on …" links (lib/indexBoost.ts) follow what Google has and has not indexed without anyone running a script.
 *
 *   curl -fsS -X POST -H "x-cron-secret: $(cat /opt/admissionhands/.cron-secret)" http://127.0.0.1:8150/api/cron/index-status
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("x-cron-secret") ?? "";
  if (expected.length < 32 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const r = await inspectOldest();
    await beat("index-status", r.inspected > 0, `${r.inspected} inspected, ${r.indexed} indexed, ${r.failed} failed`);
    return NextResponse.json(r, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/index-status" });
    await beat("index-status", false, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "index-status failed" }, { status: 500 });
  }
}
