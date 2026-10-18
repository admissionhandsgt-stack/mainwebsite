import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendMorningDigest } from "@/lib/staffAlerts";
import { logError } from "@/lib/logger";

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
    return NextResponse.json(await sendMorningDigest({ force }), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/digest" });
    return NextResponse.json({ error: "digest failed" }, { status: 500 });
  }
}
