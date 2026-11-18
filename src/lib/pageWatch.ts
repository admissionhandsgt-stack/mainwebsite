/**
 * Every word on a page, watched (2026-11-18, owner: "agar ek word bhi change hota hai page par to wo recrawl ho samjhe
 * jaise bot add kar raha hai kuch bhi tb bhi har ek detail updated chaiye google + bing ko mujhe perfect timing ke sath …
 * aur fail na ho timestamp updation").
 *
 * The writers that know they changed something (Zyn notices, MCC results, an admin save — lib/notifyChange.ts) are not
 * the only way a page changes: the research bot adds answers, a deploy changes wording, a date passes and a round page
 * says so, an import lands. So this watches the result instead of the causes: it renders each sitemap page from the app
 * itself, hashes what <main> says (lib/pageFingerprint.ts), and when the hash moves — confirmed by a second render, so a
 * page that differs on every render is never "changed" — records the moment in `page_fingerprints.changed_at`. Then:
 *   - the sitemap's lastmod for that page is that time (lib/sitemapData.ts overlays it), and so are the page's own
 *     "Updated … IST" line and its JSON-LD dateModified (ReviewedBy reads the sitemap) — the `sitemap` tag is dropped;
 *   - IndexNow gets the page at once (Bing, Yandex, Seznam, Naver), and indexnow_sent records it so the hourly job does
 *     not send it twice;
 *   - the sitemap is resubmitted to Google Search Console (at most every 20 minutes, lib/notifyChange.ts);
 *   - the edge stops serving a copy stored before that time (deploy/edge/_worker.js reads /api/edge/changes).
 *
 * How often (`runWatch`, every 10 minutes from the server crontab, a lease so two never overlap): pages that follow a
 * live round or notices every 10 minutes, the other hub pages hourly, state and branch pages every 6 hours, college
 * pages daily — at night (01:00–07:00 IST) unless a page is 36 hours overdue. `queueCheck` puts named pages at the
 * front of the next sweep; `checkPaths` checks them now (the research bot's pages after each run, notifyChange's).
 * A first sight of a page is a baseline, not a change. A failed render is never a change and is retried next sweep.
 */
import { revalidateTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { fingerprint } from "@/lib/pageFingerprint";
import { pingIndexNow } from "@/lib/indexNow";
import { beat } from "@/lib/heartbeat";
import { logError } from "@/lib/logger";

const BASE = `http://127.0.0.1:${process.env.PORT ?? 8150}`;
const ORIGIN = "https://www.admissionhands.com";
const MIN = 60_000;

/** The same list as the edge's LIVE_PAGE (deploy/edge/_worker.js). */
const LIVE_PAGE =
  /^\/($|neet-pg-counselling(\/.*)?$|neet-pg-counselling-kaise-hoti-hai$|neet-counselling-updates$|neet-pg-choice-filling$|neet-pg-process$|neet-pg-round-3-strategy$)/;

type Tier = "live" | "hub" | "data" | "college";
const EVERY: Record<Tier, number> = { live: 10 * MIN, hub: 60 * MIN, data: 6 * 60 * MIN, college: 24 * 60 * MIN };
const ORDER: Tier[] = ["live", "hub", "data", "college"];
/** "Never checked", as an age that still sorts (Infinity - Infinity is NaN in a comparator). */
const NEVER = Number.MAX_SAFE_INTEGER;

/** An exact IST time, as the sitemap writes it. */
export function istOf(d: Date): string {
  return `${new Date(d.getTime() + 330 * MIN).toISOString().slice(0, 19)}+05:30`;
}

interface Render {
  status: number;
  hash?: string;
  chars?: number;
}

async function render(path: string): Promise<Render | null> {
  try {
    const r = await fetch(BASE + path, {
      headers: { "user-agent": "AdmissionHands-page-watch", accept: "text/html" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(45_000),
    });
    if (r.status !== 200) {
      await r.body?.cancel().catch(() => undefined);
      return { status: r.status };
    }
    const fp = fingerprint(await r.text());
    return fp ? { status: 200, hash: fp.hash, chars: fp.chars } : { status: 200 };
  } catch {
    return null;
  }
}

interface Stored {
  path: string;
  hash: string;
  chars: number;
}

export interface CheckResult {
  checked: number;
  baseline: number;
  changed: string[];
  failed: string[];
  unstable: string[];
}

async function checkOne(path: string, prev: Stored | undefined, source: string, out: CheckResult): Promise<void> {
  const a = await render(path);
  // Unreachable, a server error, or a 200 with almost nothing in <main> (an error shell): never a change, retried later.
  if (!a || a.status >= 500 || (a.status === 200 && (!a.hash || (a.chars ?? 0) < 200))) {
    out.failed.push(path);
    return;
  }
  out.checked++;
  if (a.status !== 200) {
    // Moved or gone: remember the status; the sitemap drops such a page by itself.
    await db.execute(sql`
      INSERT INTO page_fingerprints (path, hash, chars, status, checked_at) VALUES (${path}, '', 0, ${a.status}, now())
      ON CONFLICT (path) DO UPDATE SET status = EXCLUDED.status, checked_at = now(), due = false`);
    return;
  }
  if (!prev || !prev.hash) {
    await db.execute(sql`
      INSERT INTO page_fingerprints (path, hash, chars, status, checked_at) VALUES (${path}, ${a.hash!}, ${a.chars!}, 200, now())
      ON CONFLICT (path) DO UPDATE SET hash = EXCLUDED.hash, chars = EXCLUDED.chars, status = 200, checked_at = now(), due = false`);
    out.baseline++;
    return;
  }
  if (prev.hash === a.hash) {
    await db.execute(sql`UPDATE page_fingerprints SET checked_at = now(), status = 200, due = false WHERE path = ${path}`);
    return;
  }
  // Confirm: the same new text twice. A page that differs between two renders has something random in it.
  const b = await render(path);
  if (!b || b.status !== 200 || !b.hash) {
    out.failed.push(path);
    return;
  }
  if (b.hash !== a.hash) {
    await db.execute(sql`
      UPDATE page_fingerprints SET unstable_at = now(), unstable_count = unstable_count + 1, checked_at = now(), due = false
       WHERE path = ${path}`);
    out.unstable.push(path);
    return;
  }
  await db.execute(sql`
    UPDATE page_fingerprints
       SET hash = ${a.hash}, chars = ${a.chars!}, status = 200, checked_at = now(), changed_at = now(), changes = changes + 1, due = false
     WHERE path = ${path}`);
  await db.execute(sql`
    INSERT INTO page_change_log (path, source, chars_before, chars_after) VALUES (${path}, ${source}, ${prev.chars}, ${a.chars!})`);
  out.changed.push(path);
}

async function stored(paths: string[]): Promise<Map<string, Stored>> {
  if (!paths.length) return new Map();
  const rows = (await db.execute(sql`
    SELECT path, hash, chars FROM page_fingerprints WHERE path IN (${sql.join(paths.map((p) => sql`${p}`), sql`, `)})`)) as unknown as Stored[];
  return new Map(rows.map((r) => [r.path, r]));
}

/** Tell everyone what changed: the sitemap and the pages' own dates, IndexNow, Google. Never throws. */
async function announce(changed: string[], source: string): Promise<{ indexnow: string; google: string }> {
  if (!changed.length) return { indexnow: "nothing changed", google: "nothing changed" };
  try {
    revalidateTag("sitemap");
  } catch {
    // Outside a request there is no cache to drop.
  }
  let indexnow = "not sent";
  for (let i = 0; i < changed.length; i += 100) {
    const part = changed.slice(i, i + 100);
    const r = await pingIndexNow(part).catch(() => ({ ok: false, status: undefined as number | undefined }));
    indexnow = r.ok ? `accepted (${r.status})` : `not sent${r.status ? ` (${r.status})` : ""}`;
    if (r.ok) {
      // The lastmod the sitemap now carries for each page, so the hourly IndexNow job does not send it again.
      await db
        .execute(sql`
          INSERT INTO indexnow_sent (url, lastmod, sent_at)
          SELECT ${ORIGIN} || CASE WHEN path = '/' THEN '' ELSE path END,
                 to_char(changed_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI:SS') || '+05:30', now()
            FROM page_fingerprints WHERE path IN (${sql.join(part.map((p) => sql`${p}`), sql`, `)})
          ON CONFLICT (url) DO UPDATE SET lastmod = EXCLUDED.lastmod, sent_at = now()`)
        .catch(() => undefined);
    }
  }
  const { resubmitSitemap } = await import("@/lib/notifyChange");
  const google = await resubmitSitemap();
  console.log(`[page-watch] ${source}: ${changed.length} changed (${changed.slice(0, 6).join(", ")}${changed.length > 6 ? ", …" : ""}); IndexNow ${indexnow}; Google sitemap ${google}`);
  return { indexnow, google };
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>, until = Infinity): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length && Date.now() < until) await fn(items[i++]);
    }),
  );
}

/**
 * Check these pages now (sitemap paths: "/md-ms-india/stipend/rajasthan"), record any change and announce it.
 * For a few pages at a time — a big list belongs in queueCheck. Never throws.
 */
export async function checkPaths(paths: string[], source: string): Promise<CheckResult & { indexnow: string; google: string }> {
  const list = [...new Set(paths.map((p) => p.replace(/[?#].*$/, "").replace(/(.)\/$/, "$1")).filter((p) => p.startsWith("/")))].slice(0, 60);
  const out: CheckResult = { checked: 0, baseline: 0, changed: [], failed: [], unstable: [] };
  try {
    const prev = await stored(list);
    await pool(list, 2, (p) => checkOne(p, prev.get(p), source, out).catch(() => void out.failed.push(p)));
    return { ...out, ...(await announce(out.changed, source)) };
  } catch (error) {
    logError(error, { route: "pageWatch.checkPaths" });
    return { ...out, failed: list, indexnow: "error", google: "error" };
  }
}

/** Put these pages at the front of the next sweep (within ten minutes). Never throws. */
export async function queueCheck(paths: string[]): Promise<void> {
  const list = [...new Set(paths.filter((p) => typeof p === "string" && p.startsWith("/")))];
  if (!list.length) return;
  await db
    .execute(sql`
      INSERT INTO page_fingerprints (path, hash, due) VALUES ${sql.join(list.slice(0, 5000).map((p) => sql`(${p}, '', true)`), sql`, `)}
      ON CONFLICT (path) DO UPDATE SET due = true`)
    .catch((error) => logError(error, { route: "pageWatch.queueCheck" }));
}

const LEASE = "lease.page-watch";

async function takeLease(): Promise<boolean> {
  const got = (await db.execute(sql`
    INSERT INTO integrations (key, value, is_secret, updated_at) VALUES (${LEASE}, 'held', false, now())
    ON CONFLICT (key) DO UPDATE SET value = 'held', updated_at = now()
      WHERE integrations.updated_at < now() - interval '9 minutes'
    RETURNING key`)) as unknown as unknown[];
  return got.length > 0;
}

function tierOf(path: string, group: string): Tier {
  if (LIVE_PAGE.test(path)) return "live";
  if (group === "hubs") return "hub";
  if (group === "states" || group === "branches") return "data";
  return "college";
}

export interface WatchSummary extends CheckResult {
  due: number;
  left: number;
  indexnow: string;
  google: string;
  skipped?: string;
}

/** One sweep: the pages most due, within a time budget. Called every 10 minutes (/api/cron/page-watch). */
export async function runWatch(budgetMs?: number): Promise<WatchSummary> {
  const out: CheckResult = { checked: 0, baseline: 0, changed: [], failed: [], unstable: [] };
  if (!(await takeLease())) return { ...out, due: 0, left: 0, indexnow: "", google: "", skipped: "another sweep is running" };
  try {
    const { sitemapGroups, SITEMAP_GROUPS } = await import("@/lib/sitemapData");
    const groups = await sitemapGroups();
    const tier = new Map<string, Tier>();
    for (const g of SITEMAP_GROUPS) for (const e of groups[g]) tier.set(e.url.replace(ORIGIN, "") || "/", tierOf(e.url.replace(ORIGIN, "") || "/", g));
    const rows = (await db.execute(sql`SELECT path, hash, chars, checked_at, due FROM page_fingerprints`)) as unknown as (Stored & {
      checked_at: string | null;
      due: boolean;
    })[];
    const known = new Map(rows.map((r) => [r.path, r]));
    const now = Date.now();
    const istHour = new Date(now + 330 * MIN).getUTCHours();
    const night = istHour >= 1 && istHour < 7;
    const due: { path: string; rank: number; age: number }[] = [];
    for (const [path, t] of tier) {
      const r = known.get(path);
      const age = r?.checked_at ? now - Date.parse(r.checked_at) : NEVER;
      // Live pages first, always — a big queue (an import) must not hold up a round page; then queued pages.
      if (t === "live" && (r?.due || age >= EVERY.live)) {
        due.push({ path, rank: -2, age });
        continue;
      }
      if (r?.due) {
        due.push({ path, rank: -1, age });
        continue;
      }
      if (age < EVERY[t]) continue;
      // College pages at night, unless a page is 36 hours overdue (a missed night); a first look always waits for night.
      if (t === "college" && !night && (age === NEVER || age < 36 * 60 * MIN)) continue;
      due.push({ path, rank: ORDER.indexOf(t), age });
    }
    // A page queued by name but no longer in the sitemap is checked once all the same (it may be on its way in).
    for (const r of rows) if (r.due && !tier.has(r.path)) due.push({ path: r.path, rank: -1, age: NEVER });
    due.sort((x, y) => x.rank - y.rank || y.age - x.age);
    const until = Date.now() + (budgetMs ?? (night ? 7 * MIN : 3 * MIN));
    const list = due.map((d) => d.path);
    let done = 0;
    await pool(
      list,
      2,
      async (p) => {
        await checkOne(p, known.get(p), "sweep", out).catch(() => void out.failed.push(p));
        done++;
      },
      until,
    );
    const told = await announce(out.changed, "sweep");
    // Prune the change log.
    await db.execute(sql`DELETE FROM page_change_log WHERE at < now() - interval '120 days'`).catch(() => undefined);
    const summary = { ...out, due: list.length, left: Math.max(0, list.length - done), ...told };
    await beat(
      "page-watch",
      out.failed.length < Math.max(5, out.checked),
      `${out.checked} checked, ${out.changed.length} changed, ${out.baseline} new, ${out.failed.length} failed, ${out.unstable.length} unstable, ${summary.left} waiting`,
    );
    return summary;
  } catch (error) {
    logError(error, { route: "pageWatch.runWatch" });
    await beat("page-watch", false, error instanceof Error ? error.message : String(error)).catch(() => undefined);
    return { ...out, due: 0, left: 0, indexnow: "error", google: "error" };
  } finally {
    await db.execute(sql`UPDATE integrations SET updated_at = now() - interval '1 hour' WHERE key = ${LEASE}`).catch(() => undefined);
  }
}

/**
 * Queue every page of these sitemap groups for the next sweeps (an import, an admin edit of copy): the sweep takes them
 * after the live pages, a few hundred a run. Never throws.
 */
export async function queueGroups(names: string[]): Promise<number> {
  try {
    const { sitemapGroups, SITEMAP_GROUPS } = await import("@/lib/sitemapData");
    const g = await sitemapGroups();
    const paths = SITEMAP_GROUPS.filter((n) => names.includes(n)).flatMap((n) => g[n].map((e) => e.url.replace(ORIGIN, "") || "/"));
    for (let i = 0; i < paths.length; i += 1000) await queueCheck(paths.slice(i, i + 1000));
    return paths.length;
  } catch (error) {
    logError(error, { route: "pageWatch.queueGroups" });
    return 0;
  }
}

/** Pages changed in the last `hours` hours, path → epoch ms (the edge's freshness list). */
export async function recentChanges(hours = 48): Promise<Record<string, number>> {
  const rows = (await db.execute(sql`
    SELECT path, (extract(epoch FROM changed_at) * 1000)::bigint AS t FROM page_fingerprints
     WHERE changed_at > now() - make_interval(hours => ${hours})`)) as unknown as { path: string; t: string | number }[];
  return Object.fromEntries(rows.map((r) => [r.path, Number(r.t)]));
}
