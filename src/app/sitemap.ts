import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

/**
 * Built per request, not at build time.
 *
 * As a build-time artifact this was generated once against the database — and
 * when that query failed on a momentary connection drop, the catch below
 * returned the static list and Next baked a 19-URL sitemap into the output,
 * telling crawlers the site had nineteen pages. Computed per request and
 * cached for a day instead: `unstable_cache` does not store a rejected
 * promise, so a failure degrades one response and the next request retries.
 */
export const dynamic = "force-dynamic";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.admissionhands.com").replace(
  /\/$/,
  "",
);

/** Routes that exist in code rather than in the database. */
const STATIC: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, freq: "weekly" },
  // The tool is the acquisition page, so it ranks with the homepage rather
  // than below the section landing pages it used to sit under.
  { path: "/neet-college-predictor", priority: 1.0, freq: "weekly" },
  { path: "/mbbs-india", priority: 0.9, freq: "weekly" },
  { path: "/mbbs-india/colleges", priority: 0.8, freq: "weekly" },
  { path: "/mbbs-india/deemed-universities", priority: 0.7, freq: "monthly" },
  { path: "/md-ms-india", priority: 0.9, freq: "weekly" },
  { path: "/md-ms-india/colleges", priority: 0.8, freq: "weekly" },
  { path: "/nri-quota", priority: 0.7, freq: "monthly" },
  { path: "/nri-quota/colleges", priority: 0.6, freq: "monthly" },
  { path: "/nri-quota/documents", priority: 0.6, freq: "monthly" },
  { path: "/neet-ug-process", priority: 0.7, freq: "monthly" },
  { path: "/services", priority: 0.7, freq: "monthly" },
  { path: "/know-us", priority: 0.5, freq: "monthly" },
  { path: "/videos", priority: 0.5, freq: "weekly" },
  { path: "/terms", priority: 0.3, freq: "yearly" },
];

const rows = <T,>(r: unknown) => r as unknown as T[];

/**
 * The database-backed half of the sitemap.
 *
 * Kept separate so the cache wraps only the query. Throwing here means nothing
 * is cached, which is the point — a blank result must never be stored.
 */
const loadSitemapData = unstable_cache(
  async () => {
    const [hidden, pg, st] = await Promise.all([
      db.execute(sql`SELECT route FROM page_seo WHERE no_index = true`),
      // Both levels serve a page per college, so both belong here. Only
      // colleges with published rounds are listed — a page with no cutoff
      // data is thin content and asking Google to index it does not help.
      db.execute(sql`
        SELECT i.level::text AS level, i.slug
        FROM institutes i
        WHERE i.is_active = true
          AND EXISTS (SELECT 1 FROM seat_options so WHERE so.institute_id = i.id)
        ORDER BY i.level, i.slug
      `),
      db.execute(sql`SELECT slug FROM mbbs_states WHERE is_active = true ORDER BY slug`),
    ]);

    const result = {
      noIndex: rows<{ route: string }>(hidden).map((r) => r.route),
      colleges: rows<{ level: string; slug: string }>(pg),
      states: rows<{ slug: string }>(st).map((r) => r.slug),
    };

    // A sitemap with no colleges means the query silently returned nothing.
    // Throwing keeps it out of the cache so the next request tries again.
    if (result.colleges.length === 0) {
      throw new Error("sitemap: no college routes returned — refusing to cache an empty sitemap");
    }
    return result;
  },
  ["sitemap-routes"],
  { revalidate: 86400, tags: ["sitemap"] },
);

/**
 * The sitemap.
 *
 * The file this replaces listed 25 URLs by hand while the site served a
 * per-college page for every PG institute, so most of the site was invisible
 * to crawlers. Pages the admin excludes (`page_seo.no_index`) are left out
 * here too — a sitemap should not ask Google to index a page that tells it to
 * stay away.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  let noIndex = new Set<string>();
  let colleges: { level: string; slug: string }[] = [];
  let states: string[] = [];

  try {
    const data = await loadSitemapData();
    noIndex = new Set(data.noIndex);
    colleges = data.colleges;
    states = data.states;
  } catch (error) {
    // Degrade this one response rather than 500 — but loudly, because a
    // sitemap missing thousands of URLs is not a small problem.
    console.error("[sitemap] could not load routes from the database", error);
  }

  const entries: MetadataRoute.Sitemap = [];

  for (const s of STATIC) {
    if (noIndex.has(s.path)) continue;
    entries.push({
      url: BASE + s.path,
      lastModified: now,
      changeFrequency: s.freq,
      priority: s.priority,
    });
  }

  for (const slug of states) {
    entries.push({
      url: `${BASE}/mbbs-india/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  for (const c of colleges) {
    const base = c.level === "ug" ? "/mbbs-india/colleges" : "/md-ms-india/colleges";
    entries.push({
      url: `${BASE}${base}/${c.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
