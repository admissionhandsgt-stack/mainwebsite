/**
 * Tell search engines the moment a page that follows live events changes (2026-11-18, owner: "jo bhi page hamara update
 * hota hai … jaise bhi kuch update ho google notify hoke recrawl karle — jaise kal MCC hold par humko search visibility
 * miss hogyi"). On 17 Nov MCC put Round 2's result on hold; the page said so within the hour, but Google had last read it
 * the night before and kept showing the old title.
 *
 * What it does: drops the caches the named pages read their changing parts through, then has lib/pageWatch.ts re-render
 * each page and compare its words with the last check. For each page that changed: the moment becomes its sitemap
 * lastmod, its "Updated … IST" line and JSON-LD dateModified; IndexNow (Bing, Yandex, Seznam, Naver) at once; the sitemap
 * resubmitted to Google Search Console (`resubmitSitemap` — the supported way to say "read it again"; Google retired the
 * sitemap ping in 2023 and its Indexing API is only for job postings and live streams, never used here; at most every 20
 * minutes, and the hourly IndexNow job resubmits as well); the edge stops serving a copy stored before it. The watcher's
 * sweep (every 10 minutes) catches every change no writer announces — the research bot's answers, a deploy's wording, a
 * date passing.
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

const PENDING_KEY = "gsc.sitemap.pending";

async function setPending(on: boolean) {
  const v = on ? new Date().toISOString() : "";
  const u = (await db.execute(sql`UPDATE integrations SET value = ${v}, updated_at = now() WHERE key = ${PENDING_KEY} RETURNING id`)) as unknown as unknown[];
  if (!u.length && on) await db.execute(sql`INSERT INTO integrations (key, value) VALUES (${PENDING_KEY}, ${v})`);
}

/**
 * Resubmit the sitemap index to Google Search Console, at most once every 20 minutes. One skipped inside that gap is
 * owed, not dropped: the page watcher's next sweep sends it once the gap has passed (`resubmitPending`).
 */
export async function resubmitSitemap(force = false): Promise<string> {
  try {
    if (!force && Date.now() - (await lastSubmit()) < GAP_MS) {
      await setPending(true).catch(() => undefined);
      return "owed (submitted in the last 20 min; the next sweep sends it)";
    }
    const token = await googleToken(["https://www.googleapis.com/auth/webmasters"]);
    if (!token) return "no Google service account";
    const r = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/sitemaps/${encodeURIComponent(SITEMAP)}`,
      { method: "PUT", headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000), cache: "no-store" },
    );
    if (!r.ok) {
      await setPending(true).catch(() => undefined);
      return `Search Console answered ${r.status} (owed; retried next sweep)`;
    }
    await markSubmitted(new Date());
    await setPending(false).catch(() => undefined);
    return "resubmitted";
  } catch (error) {
    return `failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/** The resubmit owed since a change inside the 20-minute gap (or a failed one), once the gap has passed; null if none. */
export async function resubmitPending(): Promise<string | null> {
  const r = (await db.execute(sql`SELECT value FROM integrations WHERE key = ${PENDING_KEY} LIMIT 1`)) as unknown as { value: string }[];
  if (!r[0]?.value) return null;
  if (Date.now() - (await lastSubmit()) < GAP_MS) return null;
  return resubmitSitemap();
}

/**
 * The pages may have changed: drop the caches their changing parts are read through, re-render each one and compare what
 * it says with the last check (lib/pageWatch.ts). Every page whose words changed gets that moment as its lastmod and
 * "Updated" time, IndexNow, the Google resubmit and a fresh edge copy; a page that reads the same is left alone (telling
 * search engines about a change they cannot see teaches them to ignore us). A page that could not be rendered is still
 * sent to IndexNow — when in doubt, tell. `reason` goes to the server log and the change log. Never throws.
 */
export async function notifyChange(paths: string[], reason: string): Promise<{ pages: number; changed: string[]; indexnow: string; google: string }> {
  const list = [...new Set(paths.filter((p) => typeof p === "string" && p.startsWith("/")))];
  for (const tag of ["alerts", "mcc-results"]) {
    try {
      revalidateTag(tag);
    } catch {
      // Outside a request (a script) there is no cache to drop.
    }
  }
  const { checkPaths } = await import("@/lib/pageWatch");
  const r = await checkPaths(list, reason.slice(0, 120));
  let indexnow = r.indexnow;
  if (r.failed.length) {
    const ping = await pingIndexNow(r.failed).catch(() => ({ ok: false, status: undefined }));
    indexnow += ` · ${r.failed.length} not rendered, sent anyway: ${ping.ok ? `accepted (${ping.status})` : "not sent"}`;
  }
  const out = { pages: list.length, changed: r.changed, indexnow, google: r.google };
  console.log(`[notify] ${reason}: ${list.length} pages, ${r.changed.length} changed, IndexNow ${indexnow}, Google sitemap ${r.google}`);
  return out;
}
