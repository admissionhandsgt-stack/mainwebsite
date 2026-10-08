/**
 * NEET SS (DM / MCh / DrNB) — read from `ss_allotments` (migration 0027),
 * loaded from MCC's published round results by scripts/ss/.
 *
 * Ranks are **group ranks**: each NEET SS group (Medical, Surgical, Paediatric…)
 * has its own merit list, so "rank 4,000" means nothing without the group, and
 * every figure here carries it. SS has no quota or category column — open merit
 * — so a course's range is one comparable scale.
 *
 * As everywhere on the site, a course's range is public; which institute
 * closed at which rank is not (CLAUDE.md, "Googlebot reads it, a visitor signs
 * in"). The course page lists the institutes and their seat counts, no ranks.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

const rows = <T,>(r: unknown) => r as unknown as T[];
const num = (v: unknown) => (v == null ? null : Number(v));

export interface SsCourseSummary {
  course: string;
  slug: string;
  grp: string;
  year: number;
  colleges: number;
  /** Seats allotted in round 1 — the course's size, near enough. */
  seats: number;
  r1Close: number | null;
  widest: number | null;
  prevWidest: number | null;
}

/** The newest session, and per course its size and both ends of its cutoff, with last year's for comparison. */
export const getSsCourses = unstable_cache(
  async (): Promise<{ year: number | null; prevYear: number | null; courses: SsCourseSummary[] }> => {
    const years = rows<{ year: number }>(await db.execute(sql`SELECT DISTINCT year FROM ss_allotments ORDER BY year DESC`)).map(
      (y) => Number(y.year),
    );
    const year = years[0] ?? null;
    const prevYear = years[1] ?? null;
    if (year == null) return { year, prevYear, courses: [] };
    const r = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT a.course, a.course_slug, MIN(a.grp) AS grp,
               COUNT(DISTINCT a.institute) FILTER (WHERE a.year = ${year})::int AS colleges,
               COUNT(*) FILTER (WHERE a.year = ${year} AND a.round = 'R1')::int AS seats,
               MAX(a.rank) FILTER (WHERE a.year = ${year} AND a.round = 'R1')::int AS r1_close,
               MAX(a.rank) FILTER (WHERE a.year = ${year})::int AS widest,
               MAX(a.rank) FILTER (WHERE a.year = ${prevYear ?? -1})::int AS prev_widest
          FROM ss_allotments a
         GROUP BY a.course, a.course_slug
        HAVING COUNT(*) FILTER (WHERE a.year = ${year}) > 0
         ORDER BY MIN(a.grp), COUNT(*) FILTER (WHERE a.year = ${year} AND a.round = 'R1') DESC
      `),
    );
    return {
      year,
      prevYear,
      courses: r.map((x) => ({
        course: String(x.course),
        slug: String(x.course_slug),
        grp: String(x.grp),
        year,
        colleges: Number(x.colleges),
        seats: Number(x.seats),
        r1Close: num(x.r1_close),
        widest: num(x.widest),
        prevWidest: num(x.prev_widest),
      })),
    };
  },
  ["ss-courses-v1"],
  { revalidate: 86400, tags: ["ss-data"] },
);

export interface SsCoursePage {
  course: string;
  slug: string;
  grp: string;
  years: { year: number; colleges: number; seats: number; r1Close: number | null; widest: number | null; rounds: string[] }[];
  institutes: { name: string; state: string | null; seats: number }[];
  states: { state: string; colleges: number }[];
}

export const getSsCourse = unstable_cache(
  async (slug: string): Promise<SsCoursePage | null> => {
    const head = rows<Record<string, unknown>>(
      await db.execute(sql`SELECT course, MIN(grp) AS grp FROM ss_allotments WHERE course_slug = ${slug} GROUP BY course LIMIT 1`),
    )[0];
    if (!head) return null;
    const [years, institutes] = await Promise.all([
      db.execute(sql`
        SELECT year, COUNT(DISTINCT institute)::int AS colleges,
               COUNT(*) FILTER (WHERE round = 'R1')::int AS seats,
               MAX(rank) FILTER (WHERE round = 'R1')::int AS r1_close,
               MAX(rank)::int AS widest,
               string_agg(DISTINCT round, ',') AS rounds
          FROM ss_allotments WHERE course_slug = ${slug}
         GROUP BY year ORDER BY year DESC
      `),
      db.execute(sql`
        SELECT institute, MIN(state) AS state, COUNT(*) FILTER (WHERE round = 'R1')::int AS seats
          FROM ss_allotments
         WHERE course_slug = ${slug} AND year = (SELECT MAX(year) FROM ss_allotments WHERE course_slug = ${slug})
         GROUP BY institute ORDER BY MIN(state) NULLS LAST, institute
      `),
    ]);
    const inst = rows<Record<string, unknown>>(institutes).map((x) => ({
      name: String(x.institute),
      state: (x.state as string) ?? null,
      seats: Number(x.seats),
    }));
    const byState = new Map<string, number>();
    for (const i of inst) if (i.state) byState.set(i.state, (byState.get(i.state) ?? 0) + 1);
    return {
      course: String(head.course),
      slug,
      grp: String(head.grp),
      years: rows<Record<string, unknown>>(years).map((x) => ({
        year: Number(x.year),
        colleges: Number(x.colleges),
        seats: Number(x.seats),
        r1Close: num(x.r1_close),
        widest: num(x.widest),
        rounds: String(x.rounds ?? "").split(",").filter(Boolean),
      })),
      institutes: inst,
      states: [...byState.entries()].map(([state, colleges]) => ({ state, colleges })).sort((a, b) => b.colleges - a.colleges),
    };
  },
  ["ss-course-v1"],
  { revalidate: 86400, tags: ["ss-data"] },
);
