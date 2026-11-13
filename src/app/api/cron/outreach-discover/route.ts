import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runDiscover } from "@/lib/outreachDiscover";
import { logError } from "@/lib/logger";
import { beat } from "@/lib/heartbeat";

/**
 * Three times a day (server crontab, 03:50, 09:50 and 15:50 UTC): find new sites with web search and AI (lib/hunt.ts), then read the listed sites' own contact pages for addresses to write to
 * (lib/outreachDiscover.ts). Drafts only — each still waits for the owner's Send. Anything without the secret is a 404.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 600;

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("x-cron-secret") ?? "";
  if (expected.length < 32 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const result = await runDiscover();
    await beat("outreach-discover", true, `${result.sites} sites read, ${result.added} addresses added`);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/outreach-discover" });
    await beat("outreach-discover", false, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "discover failed" }, { status: 500 });
  }
}
