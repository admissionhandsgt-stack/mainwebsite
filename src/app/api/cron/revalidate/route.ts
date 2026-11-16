import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { logError } from "@/lib/logger";

/**
 * Refresh named data caches at once, after an import (2026-11-16, owner: "ek ghante mai kyu… cache refresh karke instant
 * reflect hona chaiye"). The import scripts call it through the server after `--apply`
 * (scripts/revalidate_tags.sh):
 *   curl -fsS -X POST -H "x-cron-secret: $(cat /opt/admissionhands/.cron-secret)" -H "content-type: application/json" \
 *        -d '{"tags":["official-bond"]}' http://127.0.0.1:8150/api/cron/revalidate
 * Only the tags below; refuses everything (404) when CRON_SECRET is unset or wrong, like every cron route. The pages behind
 * the edge cache are re-fetched in the background on their next visit; a Cloudflare purge (scripts/cf_purge.mjs) makes it
 * immediate for every visitor.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED = new Set(["official-bond", "official-stipend", "seat-terms", "seat-data", "mcc", "mcc-results", "nmc", "sitemap", "content"]);

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("x-cron-secret") ?? "";
  if (expected.length < 32 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = (await request.json().catch(() => ({}))) as { tags?: unknown };
    const tags = (Array.isArray(body.tags) ? body.tags : []).filter((t): t is string => typeof t === "string" && ALLOWED.has(t));
    for (const t of tags) revalidateTag(t);
    return NextResponse.json({ revalidated: tags }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/revalidate" });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
