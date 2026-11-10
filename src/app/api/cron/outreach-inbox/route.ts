import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { checkReplies } from "@/lib/mailInbox";
import { logError } from "@/lib/logger";
import { beat } from "@/lib/heartbeat";

/**
 * Hourly (server crontab, minute 47): read the outreach mailbox for replies and bounces (lib/mailInbox.ts), which stop
 * every further email to that address. Same secret as the other cron routes; anything without it is a 404.
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
    const result = await checkReplies();
    await beat("outreach-inbox", true, result.skipped ?? `${result.read} read, ${result.replied} replied, ${result.bounced} bounced`);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/outreach-inbox" });
    await beat("outreach-inbox", false, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "inbox check failed" }, { status: 500 });
  }
}
