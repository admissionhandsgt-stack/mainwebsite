import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runOutreach } from "@/lib/outreach";
import { logError } from "@/lib/logger";
import { beat } from "@/lib/heartbeat";

/**
 * Daily (server crontab, 05:35 UTC = 11:05 IST): outreach drafts and due follow-ups go to the owner's Telegram as
 * previews, up to the daily cap (lib/outreach.ts). Nothing is sent from here — only the owner's Send button sends.
 *
 *   curl -fsS -X POST -H "x-cron-secret: $(cat /opt/admissionhands/.cron-secret)" http://127.0.0.1:8150/api/cron/outreach
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("x-cron-secret") ?? "";
  if (expected.length < 32 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const result = await runOutreach();
    await beat("outreach", true, result.skipped ?? `${result.previewed} previews, ${result.followups} follow-ups`);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/outreach" });
    await beat("outreach", false, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "outreach failed" }, { status: 500 });
  }
}
