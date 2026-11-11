import { unstable_cache } from "next/cache";
import { getBranches } from "@/lib/branchQueries";
import { getBranchStateCombos } from "@/lib/branchStateQueries";
import { getPgStates } from "@/lib/pgStateQueries";
import { getStipends } from "@/lib/cutoffHubQueries";
import { getFeeStates } from "@/lib/pgFeeMatrix";
import { getSsCourses } from "@/lib/ssQueries";
import { getMdsSlugs } from "@/lib/mdsQueries";
import { ROUNDS, getCounsellingYear, getCounsellingYears, getLatestLiveRound, getRoundState, roundPath } from "@/lib/mccResults";
import { isMeritQuota } from "@/lib/chance";
import { getHubNotices, getStateNotices } from "@/lib/stateNotices";
import { getCounselPgStates, getCounselUgStates } from "@/lib/counselStates";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { getThinDnbSlugs } from "@/lib/thinPages";

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
  { path: "/mbbs-india/new-medical-colleges", priority: 0.8, freq: "weekly" },
  { path: "/neet-counselling-updates", priority: 0.9, freq: "daily" },
  { path: "/md-ms-india", priority: 0.9, freq: "weekly" },
  { path: "/md-ms-india/colleges", priority: 0.8, freq: "weekly" },
  { path: "/md-ms-india/branches", priority: 0.8, freq: "weekly" },
  // National cutoff, stipend and BDS pages (2026-10-08): the most-typed
  // admission searches, answered from the same data as the predictor.
  { path: "/neet-ug-cutoff", priority: 0.9, freq: "weekly" },
  { path: "/neet-pg-cutoff", priority: 0.9, freq: "weekly" },
  // NBEMS's score and rank of every candidate (2026-10-26): "neet pg marks vs rank".
  { path: "/neet-pg-marks-vs-rank", priority: 0.9, freq: "weekly" },
  { path: "/md-ms-india/stipend", priority: 0.8, freq: "monthly" },
  { path: "/bds-india", priority: 0.8, freq: "weekly" },
  { path: "/ayush-colleges", priority: 0.6, freq: "monthly" },
  { path: "/md-ms-india/states", priority: 0.8, freq: "monthly" },
  { path: "/neet-ss-cutoff", priority: 0.8, freq: "monthly" },
  { path: "/neet-mds-cutoff", priority: 0.8, freq: "monthly" },
  // Open data and the press report — the pages other sites are asked to cite.
  { path: "/data", priority: 0.7, freq: "monthly" },
  { path: "/how-we-check-data", priority: 0.5, freq: "monthly" },
  { path: "/reports/neet-pg-stipend-2026", priority: 0.7, freq: "yearly" },
  // MCC's own seat matrix, and the bond/seat-leaving terms by state (2026-10-20).
  { path: "/neet-pg-seat-matrix", priority: 0.9, freq: "weekly" },
  { path: "/md-ms-india/bond", priority: 0.8, freq: "monthly" },
  { path: "/md-ms-india/private-college-fees", priority: 0.8, freq: "monthly" },
  { path: "/md-ms-india/deemed-universities", priority: 0.8, freq: "monthly" },
  // The PG fee matrix, state by state (2026-11-09), and MCC's choice filling / upgrade / free exit rules.
  { path: "/md-ms-india/fees", priority: 0.9, freq: "weekly" },
  { path: "/neet-pg-choice-filling", priority: 0.9, freq: "weekly" },
  // Clinical branches at a low rank, and the statistics page made to be cited (2026-11-10).
  { path: "/neet-pg-low-score-clinical-branches", priority: 0.8, freq: "weekly" },
  { path: "/neet-pg-statistics", priority: 0.8, freq: "weekly" },
  { path: "/md-vs-dnb", priority: 0.8, freq: "weekly" },
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
    const [hidden, pg, st, terms, mccLive, ugRanks] = await Promise.all([
      db.execute(sql`SELECT route FROM page_seo WHERE no_index = true`),
      // Both levels serve a page per college, so both belong here. Only
      // colleges with published rounds are listed — a page with no cutoff
      // data is thin content and asking Google to index it does not help.
      // A PG college page shows its bond / stipend / seat-leaving terms (pg_seat_terms, fetched_on) and
      // its fees (fees.updated_at, migration 0044): the page changed when either did, even though the
      // institute row did not. Likewise its closing ranks (extracted_at — MCC's NEET UG 2026 results reached 602
      // MBBS/BDS pages on 2026-11-09 while every UG lastmod still said 2026-09-22), and for a UG college the state
      // rounds of the year in progress moved off its page into state_round_cuts the same day (imported_at).
      db.execute(sql`
        SELECT i.level::text AS level, i.slug,
               GREATEST(i.updated_at::date,
                        COALESCE((SELECT MAX(t.fetched_on) FROM pg_seat_terms t WHERE t.institute_id = i.id), DATE '1970-01-01'),
                        COALESCE((SELECT MAX(f.updated_at)::date FROM fees f WHERE f.institute_id = i.id), DATE '1970-01-01'),
                        COALESCE((SELECT MAX(cr.extracted_at AT TIME ZONE 'Asia/Kolkata')::date FROM closing_ranks cr WHERE cr.institute_id = i.id), DATE '1970-01-01'),
                        COALESCE((SELECT MAX(sc.imported_at AT TIME ZONE 'Asia/Kolkata')::date FROM state_round_cuts sc
                                  WHERE sc.institute_id = i.id AND sc.level = 'ug'), DATE '1970-01-01'))::text AS updated
        FROM institutes i
        WHERE i.is_active = true
          -- A page with something on it beyond the name: published rounds, a published fee, or the NMC's record.
          -- The same test sends the rest noindex (the college pages' generateMetadata, 2026-11-04) — before, 418
          -- such UG pages were indexable, linked from state pages, and left out of here: two signals at once.
          AND (EXISTS (SELECT 1 FROM seat_options so WHERE so.institute_id = i.id)
               OR EXISTS (SELECT 1 FROM fees f WHERE f.institute_id = i.id AND f.fee_inr > 0)
               OR EXISTS (SELECT 1 FROM nmc_institutes n WHERE n.institute_id = i.id))
        ORDER BY i.level, i.slug
      `),
      db.execute(sql`SELECT slug FROM mbbs_states WHERE is_active = true ORDER BY slug`),
      db.execute(sql`SELECT MAX(fetched_on)::text AS d FROM pg_seat_terms`),
      // The PG colleges MCC has allotted in its latest counselling year, with the quota: a college page prints that
      // year's bands for its merit quotas (lib/collegeLiveBands.ts), so it changes when a round goes live.
      db.execute(sql`
        SELECT DISTINCT i.slug, a.year, a.quota
        FROM mcc_allotments a JOIN institutes i ON i.id = a.institute_id
        WHERE a.year = (SELECT MAX(year) FROM mcc_allotments)
      `),
      // The day the newest UG closing ranks arrived: /neet-ug-cutoff and /bds-india print MCC's AIQ figures.
      db.execute(sql`SELECT (MAX(extracted_at) AT TIME ZONE 'Asia/Kolkata')::date::text AS d FROM closing_ranks WHERE level = 'ug'`),
    ]);

    const result = {
      noIndex: rows<{ route: string }>(hidden).map((r) => r.route),
      colleges: rows<{ level: string; slug: string; updated: string }>(pg),
      states: rows<{ slug: string }>(st).map((r) => r.slug),
      termsDate: rows<{ d: string | null }>(terms)[0]?.d ?? null,
      mccLive: rows<{ slug: string; year: number; quota: string }>(mccLive),
      ugRanksDate: rows<{ d: string | null }>(ugRanks)[0]?.d ?? null,
    };

    // A sitemap with no colleges means the query silently returned nothing.
    // Throwing keeps it out of the cache so the next request tries again.
    if (result.colleges.length === 0) {
      throw new Error("sitemap: no college routes returned — refusing to cache an empty sitemap");
    }
    return result;
  },
  ["sitemap-routes-v6"],
  { revalidate: 86400, tags: ["sitemap"] },
);

/**
 * `lastmod` is only worth sending when it is true. A college page changes when
 * its row is imported; a state or branch page when its level's data is. Static
 * pages carry none rather than a made-up one.
 */
const newest = (dates: string[]) => dates.reduce((a, b) => (b > a ? b : a), "");

/**
 * The day PG college pages began printing MCC's bands for the counselling year in progress (commit 2372e12,
 * deployed 2026-11-09). Before it their lastmod stayed where the data left it (most at 2026-10-18), so Google
 * had no reason to re-read 1,400 pages that now say "Cut Off 2026".
 */
const LIVE_BANDS_FROM = "2026-11-09";

/** A slug as a URL path segment. A raw "&" in two state slugs once made the whole file invalid XML. */
const seg = (slug: string) => encodeURIComponent(slug);

export async function sitemapGroups(): Promise<Record<SitemapGroup, SitemapEntry[]>> {
  let noIndex = new Set<string>();
  let colleges: { level: string; slug: string; updated: string }[] = [];
  let states: string[] = [];
  let termsDate: string | undefined;
  let mccLive: { slug: string; year: number; quota: string }[] = [];
  let ugRanksDate: string | undefined;
  try {
    const data = await loadSitemapData();
    noIndex = new Set(data.noIndex);
    colleges = data.colleges;
    states = data.states;
    termsDate = data.termsDate ?? undefined;
    mccLive = data.mccLive;
    ugRanksDate = data.ugRanksDate ?? undefined;
  } catch (error) {
    // Degrade this one response rather than 500 — but loudly, because a
    // sitemap missing thousands of URLs is not a small problem.
    console.error("[sitemap] could not load routes from the database", error);
  }

  const out: Record<SitemapGroup, SitemapEntry[]> = { hubs: [], states: [], branches: [], "ug-colleges": [], "pg-colleges": [] };
  const ugDate = newest(colleges.filter((c) => c.level === "ug").map((c) => c.updated)) || undefined;
  const pgDate = newest(colleges.filter((c) => c.level === "pg").map((c) => c.updated)) || undefined;

  // The day MCC's latest live round reached the site: the branch pages, /neet-pg-cutoff and
  // /neet-pg-marks-vs-rank print it, so that is when they last changed.
  let live: Awaited<ReturnType<typeof getLatestLiveRound>> = null;
  let liveDay: string | undefined;
  try {
    live = await getLatestLiveRound();
    if (live) {
      const st = await getRoundState(live.year, live.spec.round);
      liveDay = (st?.updatedAt ?? st?.publishedAt ?? "").slice(0, 10) || undefined;
    }
  } catch (error) {
    console.error("[sitemap] latest round could not be read", error);
  }
  const ROUND_HUBS = new Set(["/neet-pg-cutoff", "/neet-pg-marks-vs-rank", "/neet-pg-low-score-clinical-branches", "/neet-pg-statistics", "/md-vs-dnb"]);
  // More of what really changes a page (2026-11-10; owner: "Google latest updated date ka data pehle dekhta hai… daily
  // update ho"). The date moves when the page's data moves — never the day of the request, which teaches Google to
  // ignore every lastmod here. Seats MCC adds between rounds and NMC's register (the statistics and seat matrix pages),
  // the admin's MCC schedule (the pages that print its dates), and a state's latest notices (its state pages, below).
  let addedDay: string | undefined;
  let nmcDay: string | undefined;
  let scheduleDay: string | undefined;
  try {
    const [a, nmc, sch] = await Promise.all([
      db.execute(sql`SELECT (MAX(updated_at) AT TIME ZONE 'Asia/Kolkata')::date::text AS d FROM mcc_added_seat_files WHERE status = 'live'`).catch(() => []),
      db.execute(sql`SELECT MAX(nmc_updated)::text AS d FROM nmc_courses`),
      // The schedule rows themselves, or MCC's dates applied from a notice (Zyn's apply does not touch updated_at).
      db.execute(sql`
        SELECT (GREATEST(
                  (SELECT MAX(updated_at) FROM content_blocks WHERE collection = 'pg_schedule'),
                  (SELECT MAX(decided_at) FROM zyn_notices WHERE schedule_status = 'applied')) AT TIME ZONE 'Asia/Kolkata')::date::text AS d`),
    ]);
    addedDay = rows<{ d: string | null }>(a)[0]?.d ?? undefined;
    nmcDay = rows<{ d: string | null }>(nmc)[0]?.d?.slice(0, 10) ?? undefined;
    scheduleDay = rows<{ d: string | null }>(sch)[0]?.d ?? undefined;
  } catch (error) {
    console.error("[sitemap] change dates could not be read", error);
  }
  const SEAT_HUBS = new Set(["/neet-pg-statistics", "/neet-pg-seat-matrix"]);
  const SCHEDULE_HUBS = new Set(["/neet-pg-choice-filling", "/neet-pg-process"]);
  /** The newest notice on a state's page — the page lists them, so a new one is a change to it. */
  const noticeDay = async (state: string, level: "pg" | "ug") => (await getStateNotices(state, level, 1).catch(() => []))[0]?.on?.slice(0, 10) ?? "";
  const TERMS_HUBS = new Set(["/md-ms-india/bond"]);
  const UG_RANK_HUBS = new Set(["/neet-ug-cutoff", "/bds-india"]);
  /** Pages built on NMC's register alone: they change when it does. */
  const NMC_HUBS = new Set(["/mbbs-india/new-medical-colleges"]);
  /** The notices hub changes with its newest notice. */
  const NOTICE_HUBS = new Set(["/neet-counselling-updates"]);
  const hubDay = newest(
    await Promise.all((["pg", "ug"] as const).map(async (l) => (await getHubNotices(l, 1).catch(() => []))[0]?.on?.slice(0, 10) ?? "")),
  );

  // PG college pages that print MCC's bands for the counselling year in progress: a merit-quota allotment
  // (collegeLiveBands' own test — a deemed university's paid seat is not a band) in the latest live round's year.
  const liveColleges = new Set(
    mccLive
      .filter((r) => live && Number(r.year) === live.year && isMeritQuota(r.quota) && !/self.?financed/i.test(r.quota))
      .map((r) => r.slug),
  );

  for (const s of STATIC) {
    if (noIndex.has(s.path)) continue;
    const lastModified = SEAT_HUBS.has(s.path)
      ? newest([liveDay ?? "", addedDay ?? "", nmcDay ?? ""]) || undefined
      : SCHEDULE_HUBS.has(s.path)
        ? newest([liveDay ?? "", scheduleDay ?? ""]) || undefined
      : ROUND_HUBS.has(s.path)
      ? liveDay
      : TERMS_HUBS.has(s.path)
        ? termsDate
        : UG_RANK_HUBS.has(s.path)
          ? ugRanksDate
          : NMC_HUBS.has(s.path)
            ? nmcDay
            : NOTICE_HUBS.has(s.path)
              ? hubDay || undefined
              : undefined;
    out.hubs.push({ url: BASE + s.path, lastModified, changeFrequency: s.freq, priority: s.priority });
  }

  // NEET PG counselling, year by year and round by round (2026-10-21): every round that is out, and
  // of this year's rounds still awaited only the next one — the rest are noindex until their turn.
  try {
    const [current, years] = await Promise.all([getCounsellingYear(), getCounsellingYears()]);
    for (const year of [...new Set([current, ...years])].sort((a, b) => b - a)) {
      const states = await Promise.all(ROUNDS.map((r) => getRoundState(year, r.round)));
      const next = ROUNDS.find((r, i) => r.order <= 4 && states[i]?.status === "pending" && year === current);
      const listed = ROUNDS.filter((r, i) => states[i]?.status !== "pending" || r === next);
      if (!listed.length) continue;
      const day = (s: (typeof states)[number]) => (s?.updatedAt ?? s?.publishedAt ?? "").slice(0, 10) || undefined;
      const latest = newest(states.map((s) => day(s) ?? "")) || undefined;
      out.hubs.push({ url: `${BASE}/neet-pg-counselling/${year}`, lastModified: latest, changeFrequency: year === current ? "daily" : "yearly", priority: year === current ? 0.9 : 0.6 });
      for (const r of listed) {
        const s = states[ROUNDS.indexOf(r)];
        out.hubs.push({
          url: BASE + roundPath(year, r.slug),
          lastModified: day(s),
          changeFrequency: year === current ? "hourly" : "yearly",
          priority: year === current ? 0.9 : 0.6,
        });
      }
    }
  } catch (error) {
    console.error("[sitemap] counselling rounds could not be listed", error);
  }

  for (const slug of states) {
    const notice = await noticeDay(slug.replace(/-and-/g, " and ").replace(/-/g, " "), "ug");
    out.states.push({ url: `${BASE}/mbbs-india/${seg(slug)}`, lastModified: newest([ugDate ?? "", notice]) || undefined, changeFrequency: "weekly", priority: 0.6 });
  }
  // One page per state with PG colleges: "PG seats in Karnataka", "NEET PG cutoff Tamil Nadu".
  try {
    for (const s of await getPgStates()) {
      const notice = await noticeDay(s.name, "pg");
      out.states.push({ url: `${BASE}/md-ms-india/states/${seg(s.slug)}`, lastModified: newest([pgDate ?? "", notice]) || undefined, changeFrequency: "weekly", priority: 0.7 });
    }
  } catch (error) {
    console.error("[sitemap] PG states could not be listed", error);
  }
  // The counselling-guidance pages by state (2026-11-11): dated like the state's data page — its newest notice or the
  // level's data, never the day of the request.
  try {
    const [pgCounsel, ugCounsel] = await Promise.all([getCounselPgStates(), getCounselUgStates()]);
    const dates: string[] = [];
    for (const s of pgCounsel) {
      const d = newest([pgDate ?? "", await noticeDay(s.name, "pg")]);
      dates.push(d);
      out.states.push({ url: `${BASE}/counselling/neet-pg/${seg(s.slug)}`, lastModified: d || undefined, changeFrequency: "weekly", priority: 0.6 });
    }
    for (const s of ugCounsel) {
      const d = newest([ugDate ?? "", await noticeDay(s.name, "ug")]);
      dates.push(d);
      out.states.push({ url: `${BASE}/counselling/mbbs/${seg(s.slug)}`, lastModified: d || undefined, changeFrequency: "weekly", priority: 0.6 });
    }
    out.hubs.push({ url: `${BASE}/counselling`, lastModified: newest(dates) || undefined, changeFrequency: "weekly", priority: 0.6 });
  } catch (error) {
    console.error("[sitemap] counselling pages could not be listed", error);
  }
  // One stipend page per state with three or more colleges publishing one (2026-10-20).
  try {
    const slugOf = new Map((await getPgStates()).map((s) => [s.name, s.slug]));
    for (const s of (await getStipends()).states) {
      const slug = slugOf.get(s.state);
      // Each carries the state's bond box from pg_seat_terms.
      if (slug) out.states.push({ url: `${BASE}/md-ms-india/stipend/${seg(slug)}`, lastModified: newest([pgDate ?? "", termsDate ?? ""]) || undefined, changeFrequency: "monthly", priority: 0.7 });
    }
  } catch (error) {
    console.error("[sitemap] stipend states could not be listed", error);
  }
  // One fee-matrix page per state with three or more colleges publishing a yearly PG fee (2026-11-09); dated by
  // the newest fee change in the state (fees.updated_at).
  try {
    for (const s of (await getFeeStates()).states) {
      out.states.push({ url: `${BASE}/md-ms-india/fees/${seg(s.slug)}`, lastModified: s.updated ?? undefined, changeFrequency: "monthly", priority: 0.8 });
    }
  } catch (error) {
    console.error("[sitemap] fee states could not be listed", error);
  }

  // One page per PG branch — "MD Radiology cutoff", "rank required for MD Dermatology".
  try {
    for (const b of await getBranches()) {
      // A branch the latest live round has a cut for shows that round's box (liveFor in the page; it is
      // hidden only when the branch's own data is that year, which PG closing ranks — 2024–25 — never are).
      const shown = live?.byCourse.has(b.name) ? liveDay : undefined;
      out.branches.push({ url: `${BASE}/md-ms-india/branches/${seg(b.slug)}`, lastModified: newest([pgDate ?? "", shown ?? ""]) || undefined, changeFrequency: "monthly", priority: 0.7 });
    }
  } catch (error) {
    console.error("[sitemap] branches could not be listed", error);
  }
  // One page per clinical branch in each state where five or more colleges offer it (2026-10-26).
  try {
    for (const c of await getBranchStateCombos()) {
      const shown = live?.byCourse.has(c.course) ? liveDay : undefined;
      out.branches.push({
        url: `${BASE}/md-ms-india/branches/${seg(c.courseSlug)}/${seg(c.stateSlug)}`,
        lastModified: newest([pgDate ?? "", shown ?? ""]) || undefined,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error("[sitemap] branch × state pages could not be listed", error);
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

  // The thinnest DNB-only hospital pages are noindex and stay out (lib/thinPages.ts — the page reads the same list).
  const thinDnb = new Set(await getThinDnbSlugs().catch((): string[] => []));
  for (const c of colleges) {
    const pg = c.level === "pg";
    if (pg && thinDnb.has(c.slug)) continue;
    // A page showing the year in progress changed when the latest round went live, and no earlier than the day
    // the template began printing it.
    const shown = pg && liveColleges.has(c.slug) ? newest([liveDay ?? "", LIVE_BANDS_FROM]) : "";
    (pg ? out["pg-colleges"] : out["ug-colleges"]).push({
      url: `${BASE}${pg ? "/md-ms-india/colleges" : "/mbbs-india/colleges"}/${seg(c.slug)}`,
      lastModified: newest([c.updated ?? "", shown]) || undefined,
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
