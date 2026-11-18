import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { sitemapGroups } from "@/lib/sitemapData";
import { pingIndexNow } from "@/lib/indexNow";
import { logError } from "@/lib/logger";
import { beat } from "@/lib/heartbeat";

/**
 * Hourly (server crontab, minute 25): sitemap pages whose lastmod moved since they were last sent go to IndexNow — Bing,
 * Yandex, Seznam, Naver — at most `PER_RUN` an hour, hubs and state pages first, newest change first.
 *
 * It was one daily batch (2026-11-10: every page changed in two days, 4,119 on the first day) until Bing Webmaster Tools
 * flagged "IndexNow is in batch mode" (2026-11-15): Bing wants changes streamed in small groups as they happen. Each page is
 * sent once per change (`indexnow_sent`, migration 0064 — its lastmod when last sent), so a big import drains over a
 * day instead of landing at once. The dates are the pages' own data changes (lib/sitemapData.ts). Google does not take
 * IndexNow; it gets the sitemap and the Request-indexing loop. The round-result pages still ping on their own the moment a
 * result goes live (lib/mccResults.ts).
 *
 *   curl -fsS -X POST -H "x-cron-secret: $(cat /opt/admissionhands/.cron-secret)" http://127.0.0.1:8150/api/cron/indexnow
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const PER_RUN = 100;
/** Changes older than this are not sent late: Bing will have recrawled through the sitemap by then. */
const WINDOW_DAYS = 7;

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("x-cron-secret") ?? "";
  if (expected.length < 32 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const since = new Date(Date.now() + 5.5 * 3600_000 - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
    const groups = await sitemapGroups();
    // Group order is priority order (hubs, states, branches, then colleges); within a group, the newest change first.
    const changed = Object.values(groups).flatMap((entries, g) =>
      entries
        .filter((e) => e.lastModified && String(e.lastModified).slice(0, 10) >= since)
        // The whole lastmod: pages that follow live events carry the time too (lib/sitemapData.ts istStamp), so a second
        // change on the same day is sent again.
        .map((e) => ({ url: e.url, lastmod: String(e.lastModified), g })),
    );
    const sent = new Map<string, string>();
    if (changed.length) {
      const rows = (await db.execute(sql`
        SELECT url, lastmod FROM indexnow_sent
         WHERE url IN (${sql.join(changed.map((c) => sql`${c.url}`), sql`, `)})`)) as unknown as { url: string; lastmod: string }[];
      for (const r of rows) sent.set(r.url, r.lastmod);
    }
    const pending = changed
      .filter((c) => sent.get(c.url) !== c.lastmod)
      .sort((a, b) => a.g - b.g || b.lastmod.localeCompare(a.lastmod));
    const batch = pending.slice(0, PER_RUN);
    let accepted = 0;
    if (batch.length) {
      const r = await pingIndexNow(batch.map((b) => b.url));
      if (r.ok) {
        accepted = batch.length;
        await db.execute(sql`
          INSERT INTO indexnow_sent (url, lastmod, sent_at)
          VALUES ${sql.join(batch.map((b) => sql`(${b.url}, ${b.lastmod}, now())`), sql`, `)}
          ON CONFLICT (url) DO UPDATE SET lastmod = EXCLUDED.lastmod, sent_at = now()`);
      }
    }
    // Pages changed this hour: ask Google to read the sitemap again too (at most every 20 minutes, lib/notifyChange.ts),
    // which also catches a change notifyChange skipped inside that window.
    if (accepted > 0) {
      const { resubmitSitemap } = await import("@/lib/notifyChange");
      await resubmitSitemap().catch(() => undefined);
    }
    const ok = batch.length === 0 || accepted > 0;
    await beat("indexnow", ok, `${accepted} sent, ${pending.length - accepted} waiting (changed since ${since})`);
    return NextResponse.json(
      { since, changed: changed.length, pending: pending.length, sent: accepted },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    logError(error, { route: "cron/indexnow" });
    await beat("indexnow", false, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "indexnow failed" }, { status: 500 });
  }
}
