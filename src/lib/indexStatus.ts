/**
 * Google's index status of our own pages, kept by the server (2026-11-11): a daily cron inspects the sitemap URLs whose
 * status is oldest (never-inspected first) through Search Console's URL Inspection API, as the site's service account
 * (an owner of sc-domain:admissionhands.com), and stores each answer in index_status — which lib/indexBoost.ts reads to
 * link an indexed page's not-yet-indexed neighbours. Search Console allows 2,000 inspections a day for the property,
 * shared with "Request indexing" and scripts/gsc_coverage.mjs, so a run takes `INSPECT_PER_RUN` (the whole sitemap
 * cycles in about two weeks, twice a day). Server only.
 */
import { revalidateTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { googleToken } from "@/lib/google";
import { sitemapGroups, BASE } from "@/lib/sitemapData";

export const INSPECT_PER_RUN = 150;
const SITE = "sc-domain:admissionhands.com";

export async function inspectOldest(limit = INSPECT_PER_RUN): Promise<{ inspected: number; indexed: number; failed: number }> {
  const token = await googleToken(["https://www.googleapis.com/auth/webmasters.readonly"]);
  if (!token) throw new Error("no Google service account");
  const urls = Object.values(await sitemapGroups()).flat().map((e) => e.url);
  const known = new Map(
    ((await db.execute(sql`SELECT path, checked_at FROM index_status`)) as unknown as { path: string; checked_at: string }[]).map((r) => [
      r.path,
      new Date(r.checked_at).getTime(),
    ]),
  );
  const pathOf = (u: string) => u.replace(BASE, "") || "/";
  const due = urls.sort((a, b) => (known.get(pathOf(a)) ?? 0) - (known.get(pathOf(b)) ?? 0)).slice(0, limit);
  const out = { inspected: 0, indexed: 0, failed: 0 };
  // Six at a time: about 50 a minute, well inside the API's 600, and a run ends inside the route's 300 seconds.
  for (let i = 0; i < due.length; i += 6) {
    await Promise.all(
      due.slice(i, i + 6).map(async (url) => {
        try {
          const r = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
            method: "POST",
            headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
            body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
            cache: "no-store",
            signal: AbortSignal.timeout(20_000),
          });
          const j = (await r.json()) as {
            inspectionResult?: { indexStatusResult?: { coverageState?: string; verdict?: string; lastCrawlTime?: string } };
            error?: { code?: number; message?: string };
          };
          const s = j.inspectionResult?.indexStatusResult;
          if (!r.ok || !s?.coverageState) {
            out.failed++;
            if (r.status === 429) throw new Error("quota");
            return;
          }
          await db.execute(sql`
            INSERT INTO index_status (path, coverage, verdict, last_crawl, checked_at)
            VALUES (${pathOf(url)}, ${s.coverageState}, ${s.verdict ?? null}, ${s.lastCrawlTime ?? null}, now())
            ON CONFLICT (path) DO UPDATE SET coverage = EXCLUDED.coverage, verdict = EXCLUDED.verdict,
              last_crawl = EXCLUDED.last_crawl, checked_at = EXCLUDED.checked_at`);
          out.inspected++;
          if (s.coverageState === "Submitted and indexed") out.indexed++;
        } catch (error) {
          if (error instanceof Error && error.message === "quota") throw error;
          out.failed++;
        }
      }),
    ).catch((error) => {
      if (error instanceof Error && error.message === "quota") i = due.length; // the day's quota is spent: stop
    });
  }
  if (out.inspected) revalidateTag("index-status");
  return out;
}
