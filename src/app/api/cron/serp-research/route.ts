import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { digest, runResearch, weeklySummary } from "@/lib/serpResearch";
import { getIntegration } from "@/lib/integrations";
import { tellOwner } from "@/lib/telegramBot";
import { logError } from "@/lib/logger";
import { beat } from "@/lib/heartbeat";

/**
 * Hourly (server crontab, minute 50): lib/serpResearch.ts collects real searches from autocomplete and studies what the
 * web answers for them and for the searches we are shown for, within the month's Tavily budget. The review goes to the
 * owner on Telegram every hour from 08:00 to 23:00 IST (the night's findings wait for the morning), or only on Monday
 * mornings once `serp.digest` is "weekly" (owner, 2026-11-11: hourly while building, weekly later).
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
    const hour = ist.getUTCHours();
    const mode = (await getIntegration("serp.digest").catch(() => null)) ?? "hourly";
    if (mode === "weekly") {
      if (ist.getUTCDay() === 1 && hour === 9) {
        const text = await weeklySummary().catch(() => "");
        if (text) await tellOwner(text).catch(() => 0);
      }
    } else if (mode !== "off" && hour >= 8 && hour <= 23) {
      const text = await digest().catch(() => "");
      if (text) await tellOwner(text).catch(() => 0);
    }
    await beat(
      "serp-research",
      true,
      `${r.researched} researched, ${r.ours} with us in the top 10, ${r.suggested ?? 0} new real searches${r.skipped ? ` — ${r.skipped}` : ""}`,
    );
    return NextResponse.json(r, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/serp-research" });
    await beat("serp-research", false, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "serp research failed" }, { status: 500 });
  }
}
