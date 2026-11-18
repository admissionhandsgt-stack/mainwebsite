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

const SITEMAP_GROUP = /^(hubs|states|branches|ug-colleges|pg-colleges)$/;
/** The child sitemap that lists a group's pages. */
export const childSitemap = (group: string) => `https://www.admissionhands.com/sitemaps/${group}.xml`;
const stampKey = (url: string) => (url === SITEMAP ? STAMP_KEY : `${STAMP_KEY}:${url.replace(/^.*\/sitemaps\//, "")}`);

async function getValue(key: string): Promise<string | null> {
  const r = (await db.execute(sql`SELECT value FROM integrations WHERE key = ${key} LIMIT 1`)) as unknown as { value: string }[];
  return r[0]?.value ?? null;
}

async function setValue(key: string, v: string) {
  const u = (await db.execute(sql`UPDATE integrations SET value = ${v}, updated_at = now() WHERE key = ${key} RETURNING id`)) as unknown as unknown[];
  if (!u.length) await db.execute(sql`INSERT INTO integrations (key, value) VALUES (${key}, ${v})`);
}

const PENDING_KEY = "gsc.sitemap.pending";

/** The sitemaps owed a resubmit (a change inside a 20-minute gap, a refused or lost one), as URLs. */
async function pending(): Promise<string[]> {
  return ((await getValue(PENDING_KEY).catch(() => null)) ?? "").split(/\s+/).filter((u) => u.startsWith("https://"));
}

async function setPending(add: string[], remove: string[]) {
  const now = new Set(await pending());
  for (const u of add) now.add(u);
  for (const u of remove) now.delete(u);
  await setValue(PENDING_KEY, [...now].join(" "));
}

/** Mark sitemaps owed before anything is attempted, so a restart mid-way still leaves them for the next sweep. */
export async function oweSitemaps(groups: string[]): Promise<void> {
  await setPending([SITEMAP, ...groups.filter((g) => SITEMAP_GROUP.test(g)).map(childSitemap)], []).catch(() => undefined);
}

async function submitOne(url: string, token: string, force: boolean): Promise<"ok" | "owed" | string> {
  const last = Date.parse((await getValue(stampKey(url)).catch(() => null)) ?? "");
  if (!force && !Number.isNaN(last) && Date.now() - last < GAP_MS) return "owed";
  const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/sitemaps/${encodeURIComponent(url)}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!r.ok) return `answered ${r.status}`;
  await setValue(stampKey(url), new Date().toISOString());
  return "ok";
}

/**
 * Resubmit the sitemap index to Google Search Console — and the child sitemaps that list the changed pages: Google re-reads
 * the index within seconds of a resubmit but left /sitemaps/hubs.xml unread from 13 to 18 Nov (found 2026-11-18), so the
 * new lastmods inside a child were never seen until the child itself was submitted. Each sitemap at most once every 20
 * minutes; one skipped inside that gap, refused, or lost is owed, not dropped — the page watcher's next sweep sends it
 * (`resubmitPending`).
 */
export async function resubmitSitemap(force = false, groups: string[] = []): Promise<string> {
  const targets = [SITEMAP, ...[...new Set(groups)].filter((g) => SITEMAP_GROUP.test(g)).map(childSitemap)];
  try {
    const token = await googleToken(["https://www.googleapis.com/auth/webmasters"]);
    if (!token) return "no Google service account";
    const done: string[] = [];
    const owed: string[] = [];
    const words: string[] = [];
    for (const url of targets) {
      const r = await submitOne(url, token, force).catch((e) => `failed: ${e instanceof Error ? e.message : String(e)}`);
      const name = url === SITEMAP ? "index" : url.replace(/^.*\/sitemaps\//, "");
      if (r === "ok") done.push(url);
      else owed.push(url);
      words.push(r === "ok" ? `${name} resubmitted` : r === "owed" ? `${name} owed (sent within 20 min)` : `${name} ${r} (owed)`);
    }
    await setPending(owed, done).catch(() => undefined);
    return words.join(", ");
  } catch (error) {
    await setPending(targets, []).catch(() => undefined);
    return `failed: ${error instanceof Error ? error.message : String(error)} (owed)`;
  }
}

/** Send every resubmit still owed whose 20-minute gap has passed; null when none is owed. */
export async function resubmitPending(): Promise<string | null> {
  const owed = await pending();
  if (!owed.length) return null;
  const groups = owed.filter((u) => u !== SITEMAP).map((u) => u.replace(/^.*\/sitemaps\//, "").replace(/\.xml$/, ""));
  return resubmitSitemap(false, groups);
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
