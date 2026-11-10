import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendMorningDigest } from "@/lib/staffAlerts";
import { logError } from "@/lib/logger";
import { beat } from "@/lib/heartbeat";

/**
 * 10:00 AM IST: the day's calls to each counsellor on WhatsApp
 * (lib/staffAlerts.ts). Once a day however often it is called; `?force=1`
 * sends again (for a test). Same secret as the other cron routes.
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
    const force = new URL(request.url).searchParams.get("force") === "1";
    const result = await sendMorningDigest({ force });
    await beat("digest", true);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/digest" });
    await beat("digest", false, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "digest failed" }, { status: 500 });
  }
}
