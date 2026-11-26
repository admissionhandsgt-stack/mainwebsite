/**
 * NEET PG cut off reduction — /neet-pg-cut-off-reduction (2026-11-26, owner: "cut off reduction 2026-2027 session ka
 * page bhi banado, kabhi bhi update aa sakta hai … koi bhi advance ya galat dawa nhi thokna … previous year ka dal denge,
 * is saal ka abhi update nhi hai, jab hoga automatic dal jaye"). Server only.
 *
 * What it reads, all official and nothing typed for the year in progress:
 *   - the qualifying cut off declared with each result, and the lowered one (lib/neetPgQualifying.ts — NBEMS's notices);
 *   - NBEMS's and MCC's own notice lists as the site's alert feed reads them (`alert_feed_seen`, every two hours), and the
 *     owner-approved Zyn notices (`zyn_notices`, every five minutes): a notice lowering the year's qualifying percentile
 *     shows here the moment either list holds it — the page never says one is coming, and never that none will;
 *   - NBEMS's result (score_ranks) for how many candidates scored at or above each cut off.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getCounsellingYear } from "@/lib/mccResults";
import { logError } from "@/lib/logger";

export interface CutNotice {
  title: string;
  url: string | null;
  /** YYYY-MM-DD: the day the authority published it (or first listed it, when it prints no date). */
  on: string | null;
  by: string;
  brief: string | null;
  points: string[];
}

/** Lowering words, and the thing lowered. "Revised cut-off scores …" is how NBEMS titles each one. */
const LOWER = /\b(lower\w*|reduc\w*|relax\w*|revised (minimum )?(qualifying|cut.?off))\b/i;
const CUT = /percentile|cut.?off|qualifying/i;
/** Not NEET PG medical: dental, super speciality, UG, and the internship "cut-off date" notices. */
const NOT_PG = /\bmds\b|dental|neet.?ss|super.?special|\bug\b|mbbs|\bbds\b|nursing|ayush|bams|bhms|bums|internship|date for/i;
const PG = /neet.?\s?pg|pg (medical )?counsel|\bmd\/?ms\b|post.?graduate medical|pg medical/i;

const rows = <T,>(r: unknown) => r as unknown as T[];
const day = (v: unknown) => (typeof v === "string" ? v.slice(0, 10) : v instanceof Date ? v.toISOString().slice(0, 10) : null);

/** The NEET PG year a notice is about: the year it names after NEET-PG, else its session ("2026-27"), else null. */
function yearOf(title: string): number | null {
  const m = title.match(/neet.?\s?pg\s*[-–]?\s*(20\d\d)/i) ?? title.match(/\b(20\d\d)\s*[-–]\s*(?:20)?\d\d\b/);
  return m ? Number(m[1]) : null;
}

export interface CutReduction {
  year: number;
  /** Notices lowering this year's NEET PG qualifying percentile: NBEMS's and MCC's first. */
  current: CutNotice[];
  /** What the counselling authorities posted after it (fresh registration, revised merit lists), this year. */
  states: CutNotice[];
  /** NBEMS's notices lowering an earlier NEET PG year's cut off, one per year, newest first. */
  earlier: (CutNotice & { year: number })[];
  /** NBEMS's notice lowering NEET MDS's cut off this year, if there is one (dental PG — a different exam). */
  mds: CutNotice | null;
  /** The newest of all of them (YYYY-MM-DD), for the page's date. */
  newest: string | null;
}

export const getCutReduction = unstable_cache(
  async (): Promise<CutReduction> => {
    const year = await getCounsellingYear().catch(() => new Date().getFullYear());
    try {
      const [feed, zyn] = await Promise.all([
        db.execute(sql`
          SELECT source, title, url, COALESCE(published_on, first_seen::date)::text AS on
            FROM alert_feed_seen
           WHERE source IN ('nbems', 'mcc-pg') AND title ~* 'percentil|cut.?off|qualif'`),
        db.execute(sql`
          SELECT title, url, authority, COALESCE(payload->>'published_on', COALESCE(approved_at, received_at)::date::text) AS on,
                 payload->>'public_brief' AS brief, payload->'public_points' AS points
            FROM zyn_notices
           WHERE status = 'published' AND title ~* 'percentil|cut.?off|qualif'`),
      ]);
      const fromFeed = rows<{ source: string; title: string; url: string | null; on: string | null }>(feed).map((r) => ({
        title: r.title.replace(/\s+/g, " ").trim(),
        url: r.url,
        on: day(r.on),
        by: r.source === "nbems" ? "NBEMS" : "MCC",
        brief: null,
        points: [] as string[],
      }));
      const fromZyn = rows<{ title: string; url: string | null; authority: string | null; on: string | null; brief: string | null; points: unknown }>(zyn).map((r) => {
        const raw = typeof r.points === "string" ? (() => { try { return JSON.parse(r.points as string); } catch { return []; } })() : r.points;
        return {
          title: r.title.replace(/\s+/g, " ").trim(),
          url: r.url,
          on: day(r.on),
          by: (r.authority ?? "").split(" · ")[0].replace(/\s*\([^)]*\.[a-z]{2,}[^)]*\)\s*$/i, "").trim() || "Counselling authority",
          brief: r.brief?.trim() || null,
          points: Array.isArray(raw) ? raw.filter((p): p is string => typeof p === "string" && !!p.trim()).slice(0, 6) : [],
        };
      });
      const lowering = (n: CutNotice) => LOWER.test(n.title) && CUT.test(n.title);
      const central = (n: CutNotice) => /^(NBEMS|MCC)$/i.test(n.by) || /\b(nbems|national board|mcc|medical counselling committee)\b/i.test(n.by);
      // This year's: a NEET PG notice that names the year, or — naming none — one published after the year's result.
      const isThisYear = (n: CutNotice) => {
        const y = yearOf(n.title);
        return y != null ? y === year : !!n.on && n.on >= `${year}-08-01`;
      };
      const all = [...fromFeed, ...fromZyn].filter((n) => lowering(n) && !NOT_PG.test(n.title));
      const seen = new Set<string>();
      const once = (n: CutNotice) => {
        const k = `${n.title.toLowerCase()}|${n.on}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      };
      const byDate = (a: CutNotice, b: CutNotice) => (b.on ?? "").localeCompare(a.on ?? "");
      // MCC's PG list is PG by itself: its notice may say "qualifying percentile" without repeating "NEET PG".
      const current = all.filter((n) => central(n) && (PG.test(n.title) || n.by === "MCC") && isThisYear(n)).sort(byDate).filter(once);
      // A state's notice counts only once a central notice for the year exists — "lowering of cut-off" from a state before
      // NBEMS has lowered anything is about some other list.
      const states = current.length ? all.filter((n) => !central(n) && isThisYear(n) && (PG.test(n.title) || /cut.?off/i.test(n.title))).sort(byDate).filter(once).slice(0, 8) : [];
      // Earlier years, NBEMS's own "Revised cut-off scores of NEET-PG <year>" first; one notice per year.
      const earlierAll = fromFeed
        .filter((n) => n.by === "NBEMS" && lowering(n) && PG.test(n.title) && !NOT_PG.test(n.title))
        .map((n) => ({ ...n, year: yearOf(n.title) ?? 0 }))
        .filter((n) => n.year && n.year < year)
        .sort((a, b) => b.year - a.year || Number(/^revised/i.test(b.title)) - Number(/^revised/i.test(a.title)) || byDate(a, b));
      const earlier = earlierAll.filter((n, i) => earlierAll.findIndex((x) => x.year === n.year) === i);
      const mds =
        fromFeed
          .filter((n) => n.by === "NBEMS" && /neet.?\s?mds\s*[-–]?\s*\d{4}/i.test(n.title) && lowering(n) && (n.title.match(/mds\s*[-–]?\s*(20\d\d)/i)?.[1] ?? "") === String(year))
          .sort(byDate)[0] ?? null;
      const newest = [...current, ...states, ...(mds ? [mds] : [])].map((n) => n.on ?? "").sort().pop() || null;
      return { year, current, states, earlier, mds, newest };
    } catch (error) {
      logError(error, { route: "cutoffReduction" });
      return { year, current: [], states: [], earlier: [], mds: null, newest: null };
    }
  },
  ["cut-reduction-v1"],
  { revalidate: 900, tags: ["alerts"] },
);
