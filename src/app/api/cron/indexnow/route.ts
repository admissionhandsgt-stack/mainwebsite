import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sitemapGroups } from "@/lib/sitemapData";
import { pingIndexNow } from "@/lib/indexNow";
import { logError } from "@/lib/logger";
import { beat } from "@/lib/heartbeat";

/**
 * Daily (server crontab, 06:25 UTC): every sitemap URL whose lastmod is in the last two days goes to IndexNow — Bing,
 * Yandex, Seznam, Naver (2026-11-10; owner: "bing mai bhi to indexing karni chiaye thi"). The dates are the pages' own
 * data changes (lib/sitemapData.ts), so Bing hears of a page the day it changed. Google does not take IndexNow; it gets
 * the sitemap and the Request-indexing loop.
 *
 *   curl -fsS -X POST -H "x-cron-secret: $(cat /opt/admissionhands/.cron-secret)" http://127.0.0.1:8150/api/cron/indexnow
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
    const since = new Date(Date.now() + 5.5 * 3600_000 - 2 * 86_400_000).toISOString().slice(0, 10);
    const groups = await sitemapGroups();
    const urls = Object.values(groups)
      .flat()
      .filter((e) => e.lastModified && String(e.lastModified).slice(0, 10) >= since)
      .map((e) => e.url);
    let accepted = 0;
    // IndexNow takes up to 10,000 URLs a request; batches of 5,000 keep each one well inside it.
    for (let i = 0; i < urls.length; i += 5000) {
      const r = await pingIndexNow(urls.slice(i, i + 5000));
      if (r.ok) accepted += Math.min(5000, urls.length - i);
    }
    const ok = urls.length === 0 || accepted > 0;
    await beat("indexnow", ok, `${accepted} of ${urls.length} URLs changed since ${since}`);
    return NextResponse.json({ since, urls: urls.length, accepted }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/indexnow" });
    await beat("indexnow", false, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "indexnow failed" }, { status: 500 });
  }
}
