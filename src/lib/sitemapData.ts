import { unstable_cache } from "next/cache";
import { getBranches } from "@/lib/branchQueries";
import { getPgStates } from "@/lib/pgStateQueries";
import { getStipends } from "@/lib/cutoffHubQueries";
import { getSsCourses } from "@/lib/ssQueries";
import { getMdsSlugs } from "@/lib/mdsQueries";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

/**
 * The sitemap, split by page type (2026-10-17): /sitemap.xml is an index of
 * /sitemaps/<type>.xml, so Search Console reports coverage per type — on
 * 2026-10-17 only 54% of the 3,762 URLs had ever had an impression, and one
 * flat file could not say which kinds of page were being left out.
 *
 * Same URLs, same honest lastmod as the single file had. Built per request and
 * cached for a day: `unstable_cache` does not store a rejected promise, so a
 * failed query degrades one response and the next request retries.
 */

export const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.admissionhands.com").replace(/\/$/, "");

export const SITEMAP_GROUPS = ["hubs", "states", "branches", "ug-colleges", "pg-colleges"] as const;
export type SitemapGroup = (typeof SITEMAP_GROUPS)[number];

export interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

/** Routes that exist in code rather than in the database. */
const STATIC: { path: string; priority: number; freq: SitemapEntry["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, freq: "weekly" },
  // The tool is the acquisition page, so it ranks with the homepage rather
  // than below the section landing pages it used to sit under.
  { path: "/neet-college-predictor", priority: 1.0, freq: "weekly" },
  { path: "/mbbs-india", priority: 0.9, freq: "weekly" },
  { path: "/mbbs-india/colleges", priority: 0.8, freq: "weekly" },
  { path: "/mbbs-india/deemed-universities", priority: 0.7, freq: "monthly" },
  { path: "/md-ms-india", priority: 0.9, freq: "weekly" },
  { path: "/md-ms-india/colleges", priority: 0.8, freq: "weekly" },
  { path: "/md-ms-india/branches", priority: 0.8, freq: "weekly" },
  // National cutoff, stipend and BDS pages (2026-10-08): the most-typed
  // admission searches, answered from the same data as the predictor.
  { path: "/neet-ug-cutoff", priority: 0.9, freq: "weekly" },
  { path: "/neet-pg-cutoff", priority: 0.9, freq: "weekly" },
  { path: "/md-ms-india/stipend", priority: 0.8, freq: "monthly" },
  { path: "/bds-india", priority: 0.8, freq: "weekly" },
  { path: "/ayush-colleges", priority: 0.6, freq: "monthly" },
  { path: "/md-ms-india/states", priority: 0.8, freq: "monthly" },
  { path: "/neet-ss-cutoff", priority: 0.8, freq: "monthly" },
  { path: "/neet-mds-cutoff", priority: 0.8, freq: "monthly" },
  // Open data and the press report — the pages other sites are asked to cite.
  { path: "/data", priority: 0.7, freq: "monthly" },
  { path: "/reports/neet-pg-stipend-2026", priority: 0.7, freq: "yearly" },
  // MCC's own seat matrix, and the bond/seat-leaving terms by state (2026-10-20).
  { path: "/neet-pg-seat-matrix", priority: 0.9, freq: "weekly" },
  { path: "/md-ms-india/bond", priority: 0.8, freq: "monthly" },
  { path: "/md-ms-india/private-college-fees", priority: 0.8, freq: "monthly" },
  { path: "/md-ms-india/deemed-universities", priority: 0.8, freq: "monthly" },
  { path: "/nri-quota", priority: 0.7, freq: "monthly" },
  { path: "/nri-quota/colleges", priority: 0.6, freq: "monthly" },
  // The two highest-value quota queries in this market: what an NRI or a
  // management seat costs, and what rank it stays open to.
  { path: "/nri-quota/fees", priority: 0.9, freq: "weekly" },
  { path: "/management-quota", priority: 0.9, freq: "weekly" },
  { path: "/nri-quota/documents", priority: 0.6, freq: "monthly" },
  { path: "/neet-ug-process", priority: 0.7, freq: "monthly" },
  { path: "/neet-pg-process", priority: 0.8, freq: "monthly" },
  { path: "/services", priority: 0.7, freq: "monthly" },
  { path: "/know-us", priority: 0.5, freq: "monthly" },
  { path: "/contact", priority: 0.5, freq: "monthly" },
  { path: "/team", priority: 0.5, freq: "monthly" },
  { path: "/videos", priority: 0.5, freq: "weekly" },
  { path: "/terms", priority: 0.3, freq: "yearly" },
];

const rows = <T,>(r: unknown) => r as unknown as T[];

/**
 * The database-backed half. Throwing here means nothing is cached, which is
 * the point — a blank result must never be stored.
 */
const loadSitemapData = unstable_cache(
  async () => {
    const [hidden, pg, st] = await Promise.all([
      db.execute(sql`SELECT route FROM page_seo WHERE no_index = true`),
      // Both levels serve a page per college, so both belong here. Only
      // colleges with published rounds are listed — a page with no cutoff
      // data is thin content and asking Google to index it does not help.
      db.execute(sql`
        SELECT i.level::text AS level, i.slug, i.updated_at::date::text AS updated
        FROM institutes i
        WHERE i.is_active = true
          AND EXISTS (SELECT 1 FROM seat_options so WHERE so.institute_id = i.id)
        ORDER BY i.level, i.slug
      `),
      db.execute(sql`SELECT slug FROM mbbs_states WHERE is_active = true ORDER BY slug`),
    ]);

    const result = {
      noIndex: rows<{ route: string }>(hidden).map((r) => r.route),
      colleges: rows<{ level: string; slug: string; updated: string }>(pg),
      states: rows<{ slug: string }>(st).map((r) => r.slug),
    };

    // A sitemap with no colleges means the query silently returned nothing.
    // Throwing keeps it out of the cache so the next request tries again.
    if (result.colleges.length === 0) {
      throw new Error("sitemap: no college routes returned — refusing to cache an empty sitemap");
    }
    return result;
  },
  ["sitemap-routes-v2"],
  { revalidate: 86400, tags: ["sitemap"] },
);

/**
 * `lastmod` is only worth sending when it is true. A college page changes when
 * its row is imported; a state or branch page when its level's data is. Static
 * pages carry none rather than a made-up one.
 */
const newest = (dates: string[]) => dates.reduce((a, b) => (b > a ? b : a), "");

/** A slug as a URL path segment. A raw "&" in two state slugs once made the whole file invalid XML. */
const seg = (slug: string) => encodeURIComponent(slug);

export async function sitemapGroups(): Promise<Record<SitemapGroup, SitemapEntry[]>> {
  let noIndex = new Set<string>();
  let colleges: { level: string; slug: string; updated: string }[] = [];
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

  const out: Record<SitemapGroup, SitemapEntry[]> = { hubs: [], states: [], branches: [], "ug-colleges": [], "pg-colleges": [] };
  const ugDate = newest(colleges.filter((c) => c.level === "ug").map((c) => c.updated)) || undefined;
  const pgDate = newest(colleges.filter((c) => c.level === "pg").map((c) => c.updated)) || undefined;

  for (const s of STATIC) {
    if (noIndex.has(s.path)) continue;
    out.hubs.push({ url: BASE + s.path, changeFrequency: s.freq, priority: s.priority });
  }

  for (const slug of states) {
    out.states.push({ url: `${BASE}/mbbs-india/${seg(slug)}`, lastModified: ugDate, changeFrequency: "monthly", priority: 0.6 });
  }
  // One page per state with PG colleges: "PG seats in Karnataka", "NEET PG cutoff Tamil Nadu".
  try {
    for (const s of await getPgStates()) {
      out.states.push({ url: `${BASE}/md-ms-india/states/${seg(s.slug)}`, lastModified: pgDate, changeFrequency: "monthly", priority: 0.7 });
    }
  } catch (error) {
    console.error("[sitemap] PG states could not be listed", error);
  }
  // One stipend page per state with three or more colleges publishing one (2026-10-20).
  try {
    const slugOf = new Map((await getPgStates()).map((s) => [s.name, s.slug]));
    for (const s of (await getStipends()).states) {
      const slug = slugOf.get(s.state);
      if (slug) out.states.push({ url: `${BASE}/md-ms-india/stipend/${seg(slug)}`, lastModified: pgDate, changeFrequency: "monthly", priority: 0.7 });
    }
  } catch (error) {
    console.error("[sitemap] stipend states could not be listed", error);
  }

  // One page per PG branch — "MD Radiology cutoff", "rank required for MD Dermatology".
  try {
    for (const b of await getBranches()) {
      out.branches.push({ url: `${BASE}/md-ms-india/branches/${seg(b.slug)}`, lastModified: pgDate, changeFrequency: "monthly", priority: 0.7 });
    }
  } catch (error) {
    console.error("[sitemap] branches could not be listed", error);
  }
  // One page per DM / MCh / DrNB course, from MCC's SS results (ss_allotments).
  try {
    for (const c of (await getSsCourses()).courses) {
      out.branches.push({ url: `${BASE}/neet-ss/${seg(c.slug)}`, changeFrequency: "yearly", priority: 0.6 });
    }
  } catch (error) {
    console.error("[sitemap] SS courses could not be listed", error);
  }
  // One page per MDS speciality, from MCC's MDS results (mds_allotments).
  try {
    for (const slug of await getMdsSlugs()) {
      out.branches.push({ url: `${BASE}/neet-mds/${seg(slug)}`, changeFrequency: "monthly", priority: 0.6 });
    }
  } catch (error) {
    console.error("[sitemap] MDS specialities could not be listed", error);
  }

  for (const c of colleges) {
    const pg = c.level === "pg";
    (pg ? out["pg-colleges"] : out["ug-colleges"]).push({
      url: `${BASE}${pg ? "/md-ms-india/colleges" : "/mbbs-india/colleges"}/${seg(c.slug)}`,
      lastModified: c.updated || undefined,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function urlsetXml(entries: SitemapEntry[]): string {
  const body = entries
    .map(
      (e) =>
        `<url>\n<loc>${esc(e.url)}</loc>\n` +
        (e.lastModified ? `<lastmod>${esc(e.lastModified)}</lastmod>\n` : "") +
        (e.changeFrequency ? `<changefreq>${e.changeFrequency}</changefreq>\n` : "") +
        (e.priority != null ? `<priority>${e.priority}</priority>\n` : "") +
        `</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function indexXml(groups: Record<SitemapGroup, SitemapEntry[]>): string {
  const body = SITEMAP_GROUPS.map((g) => {
    const last = newest(groups[g].map((e) => e.lastModified ?? ""));
    return `<sitemap>\n<loc>${BASE}/sitemaps/${g}.xml</loc>\n${last ? `<lastmod>${last}</lastmod>\n` : ""}</sitemap>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

/** The headers the single sitemap was served with. */
export const XML_HEADERS = { "Content-Type": "application/xml", "Cache-Control": "public, max-age=0, must-revalidate" };
