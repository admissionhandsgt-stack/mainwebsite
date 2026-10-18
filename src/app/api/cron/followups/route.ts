import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runFollowups } from "@/lib/followups";
import { logError } from "@/lib/logger";

/**
 * Hourly: WhatsApp follow-ups to students who signed in and stopped
 * (lib/followups.ts). Same secret as /api/cron/alerts; anything without it is a
 * 404. `?dry=1` lists who is due and sends nothing.
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
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  try {
    return NextResponse.json(await runFollowups({ dry }), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/followups" });
    return NextResponse.json({ error: "follow-ups failed" }, { status: 500 });
  }
}
