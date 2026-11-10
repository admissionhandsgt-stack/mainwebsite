import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { rebuildSearchLinks } from "@/lib/searchLinks";
import { logError } from "@/lib/logger";
import { beat } from "@/lib/heartbeat";

/**
 * Weekly (server crontab, Mondays 05:17 UTC): rebuild the "Related searches" links from the last 28 days of Search
 * Console (lib/searchLinks.ts). Same secret as the other cron routes; anything without it is a 404.
 *
 *   curl -fsS -X POST -H "x-cron-secret: $(cat /opt/admissionhands/.cron-secret)" \
 *        http://127.0.0.1:8150/api/cron/search-links
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
    const result = await rebuildSearchLinks();
    await beat("search-links", true, `${result.links} links on ${result.pages} pages`);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/search-links" });
    await beat("search-links", false, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "search links failed" }, { status: 500 });
  }
}
