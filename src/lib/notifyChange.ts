/**
 * Tell search engines the moment a page that follows live events changes (2026-11-18, owner: "jo bhi page hamara update
 * hota hai … jaise bhi kuch update ho google notify hoke recrawl karle — jaise kal MCC hold par humko search visibility
 * miss hogyi"). On 17 Nov MCC put Round 2's result on hold; the page said so within the hour, but Google had last read it
 * the night before and kept showing the old title.
 *
 * What it does, in order:
 * 1. Refreshes the sitemap cache, so the page's new lastmod (an exact IST time, lib/sitemapData.ts) is what Google reads.
 * 2. IndexNow for the changed pages — Bing, Yandex, Seznam, Naver re-crawl within minutes.
 * 3. Resubmits the sitemap to Google Search Console (the supported way to say "read it again"; Google retired the old
 *    sitemap ping in 2023, and its Indexing API is only for job postings and live streams — never used here). At most
 *    once every 20 minutes; a change inside that window is picked up by the hourly IndexNow cron's resubmit.
 * Never throws: a failure here must not fail the import, the notice or the admin save that called it.
 */
import { revalidateTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { googleToken } from "@/lib/google";
import { pingIndexNow } from "@/lib/indexNow";
import { ROUNDS, getCounsellingYear, roundPath } from "@/lib/mccResults";

const PROPERTY = "sc-domain:admissionhands.com";
const SITEMAP = "https://www.admissionhands.com/sitemap.xml";
const STAMP_KEY = "gsc.sitemap.submitted_at";
const GAP_MS = 20 * 60 * 1000;

/** Every page that prints MCC's schedule, a hold or a "dates may change" notice for the counselling year in progress. */
export async function schedulePaths(): Promise<string[]> {
  const year = await getCounsellingYear().catch(() => new Date().getFullYear());
  return [
    `/neet-pg-counselling/${year}`,
    ...ROUNDS.map((r) => roundPath(year, r.slug)),
    "/neet-pg-choice-filling",
    "/neet-pg-process",
    "/neet-pg-counselling-kaise-hoti-hai",
  ];
}

/** A state's pages that list its notices (PG and MBBS state pages, counselling-by-state). */
export function statePaths(state: string): string[] {
  const slug = state
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug ? [`/md-ms-india/states/${slug}`, `/mbbs-india/${slug}`, `/counselling/neet-pg/${slug}`, `/counselling/mbbs/${slug}`] : [];
}

async function lastSubmit(): Promise<number> {
  const r = (await db.execute(sql`SELECT value FROM integrations WHERE key = ${STAMP_KEY} LIMIT 1`)) as unknown as { value: string }[];
  const t = Date.parse(r[0]?.value ?? "");
  return Number.isNaN(t) ? 0 : t;
}

async function markSubmitted(at: Date) {
  const v = at.toISOString();
  const u = (await db.execute(sql`UPDATE integrations SET value = ${v}, updated_at = now() WHERE key = ${STAMP_KEY} RETURNING id`)) as unknown as unknown[];
  if (!u.length) await db.execute(sql`INSERT INTO integrations (key, value) VALUES (${STAMP_KEY}, ${v})`);
}

/** Resubmit the sitemap index to Google Search Console, at most once every 20 minutes. */
export async function resubmitSitemap(force = false): Promise<string> {
  try {
    if (!force && Date.now() - (await lastSubmit()) < GAP_MS) return "skipped (submitted in the last 20 min)";
    const token = await googleToken(["https://www.googleapis.com/auth/webmasters"]);
    if (!token) return "no Google service account";
    const r = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/sitemaps/${encodeURIComponent(SITEMAP)}`,
      { method: "PUT", headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000), cache: "no-store" },
    );
    if (!r.ok) return `Search Console answered ${r.status}`;
    await markSubmitted(new Date());
    return "resubmitted";
  } catch (error) {
    return `failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * The pages changed: refresh the sitemap, IndexNow them, resubmit the sitemap to Google. `reason` goes to the server log
 * only. Never throws.
 */
export async function notifyChange(paths: string[], reason: string): Promise<{ pages: number; indexnow: string; google: string }> {
  const list = [...new Set(paths.filter((p) => typeof p === "string" && p.startsWith("/")))];
  try {
    revalidateTag("sitemap");
  } catch {
    // Outside a request (a script) there is no cache to drop; the sitemap's own day-long cache catches up.
  }
  const ping = list.length ? await pingIndexNow(list).catch(() => ({ ok: false, status: undefined })) : { ok: false, status: undefined };
  const google = await resubmitSitemap();
  const out = { pages: list.length, indexnow: ping.ok ? `accepted (${ping.status})` : `not sent${ping.status ? ` (${ping.status})` : ""}`, google };
  console.log(`[notify] ${reason}: ${out.pages} pages, IndexNow ${out.indexnow}, Google sitemap ${out.google}`);
  return out;
}
