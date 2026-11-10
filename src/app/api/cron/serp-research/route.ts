import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runResearch, weeklySummary } from "@/lib/serpResearch";
import { tellOwner } from "@/lib/telegramBot";
import { logError } from "@/lib/logger";
import { beat } from "@/lib/heartbeat";

/**
 * Daily (server crontab, 04:50 UTC): lib/serpResearch.ts studies what the web answers for the searches we are shown
 * for; on Mondays the week's summary goes to the owner on Telegram.
 *
 *   curl -fsS -X POST -H "x-cron-secret: $(cat /opt/admissionhands/.cron-secret)" http://127.0.0.1:8150/api/cron/serp-research
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
    const r = await runResearch();
    const ist = new Date(Date.now() + 5.5 * 3600_000);
    if (ist.getUTCDay() === 1) {
      const text = await weeklySummary().catch(() => "");
      if (text) await tellOwner(text).catch(() => 0);
    }
    await beat("serp-research", true, `${r.researched} researched, ${r.ours} with us in the top 10${r.skipped ? ` — ${r.skipped}` : ""}`);
    return NextResponse.json(r, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/serp-research" });
    await beat("serp-research", false, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "serp research failed" }, { status: 500 });
  }
}
