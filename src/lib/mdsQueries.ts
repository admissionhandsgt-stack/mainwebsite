/**
 * NEET MDS (dental PG) — read from `mds_allotments` (migration 0028), loaded
 * from MCC's published round results by scripts/mds/.
 *
 * MCC fills 50% All India Quota of government dental colleges and every seat
 * in deemed universities ("Management/Paid Seats Quota", renamed "Self-Financed
 * Merit Seat" in 2026). Every range here is within one (quota, category) — the
 * site's rule — and quota names are MCC's own. Which institute closed where is
 * not published here, as everywhere on the site.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

const rows = <T,>(r: unknown) => r as unknown as T[];
const num = (v: unknown) => (v == null ? null : Number(v));

const DEEMED = sql`(quota ILIKE 'Management%' OR quota ILIKE 'Self-Financed%')`;

async function years() {
  const r = rows<{ year: number; rounds: string }>(
    await db.execute(sql`SELECT year, string_agg(DISTINCT round, ',') AS rounds FROM mds_allotments GROUP BY year ORDER BY year DESC`),
  ).map((x) => ({ year: Number(x.year), rounds: String(x.rounds).split(",") }));
  // The newest year that ran to round 3 is "complete"; a newer one is in progress.
  const complete = r.find((y) => y.rounds.includes("R3")) ?? r[0] ?? null;
  const current = r[0] && complete && r[0].year > complete.year ? r[0] : null;
  return { complete, current };
}

export interface MdsCourseRow {
  course: string;
  slug: string;
  seats: number;
  aiqR1: number | null;
  aiqLast: number | null;
  deemedLast: number | null;
  currentAiqLast: number | null;
}

export const getMdsOverview = unstable_cache(
  async () => {
    const { complete, current } = await years();
    if (!complete) return { year: null, current: null, courses: [] as MdsCourseRow[], categories: [] as Record<string, unknown>[] };
    const cy = complete.year;
    const ny = current?.year ?? -1;
    const [courses, categories] = await Promise.all([
      db.execute(sql`
        SELECT course, course_slug,
               COUNT(*) FILTER (WHERE year = ${cy} AND round = 'R1')::int AS seats,
               MAX(rank) FILTER (WHERE year = ${cy} AND round = 'R1' AND quota = 'All India' AND allotted_category = 'Open')::int AS aiq_r1,
               MAX(rank) FILTER (WHERE year = ${cy} AND quota = 'All India' AND allotted_category = 'Open')::int AS aiq_last,
               MAX(rank) FILTER (WHERE year = ${cy} AND ${DEEMED} AND allotted_category = 'Open')::int AS deemed_last,
               MAX(rank) FILTER (WHERE year = ${ny} AND quota = 'All India' AND allotted_category = 'Open')::int AS cur_last
          FROM mds_allotments GROUP BY course, course_slug
         ORDER BY MAX(rank) FILTER (WHERE year = ${cy} AND quota = 'All India' AND allotted_category = 'Open') ASC NULLS LAST
      `),
      db.execute(sql`
        SELECT allotted_category AS category,
               MAX(rank) FILTER (WHERE round = 'R1')::int AS r1, MAX(rank)::int AS last, COUNT(*)::int AS allotments
          FROM mds_allotments WHERE year = ${cy} AND quota = 'All India'
         GROUP BY allotted_category ORDER BY MAX(rank)
      `),
    ]);
    return {
      year: cy,
      current: current ? { year: current.year, rounds: current.rounds.sort() } : null,
      courses: rows<Record<string, unknown>>(courses).map((x) => ({
        course: String(x.course),
        slug: String(x.course_slug),
        seats: Number(x.seats),
        aiqR1: num(x.aiq_r1),
        aiqLast: num(x.aiq_last),
        deemedLast: num(x.deemed_last),
        currentAiqLast: num(x.cur_last),
      })),
      categories: rows<Record<string, unknown>>(categories),
    };
  },
  ["mds-overview-v1"],
  { revalidate: 86400, tags: ["mds-data"] },
);

export interface MdsCut {
  quota: string;
  category: string;
  allotments: number;
  r1: number | null;
  last: number | null;
}

export const getMdsCourse = unstable_cache(
  async (slug: string) => {
    const head = rows<{ course: string }>(await db.execute(sql`SELECT course FROM mds_allotments WHERE course_slug = ${slug} LIMIT 1`))[0];
    if (!head) return null;
    const { complete, current } = await years();
    const cut = async (year: number) =>
      rows<Record<string, unknown>>(
        await db.execute(sql`
          SELECT quota, allotted_category AS category, COUNT(*)::int AS allotments,
                 MAX(rank) FILTER (WHERE round = 'R1')::int AS r1, MAX(rank)::int AS last
            FROM mds_allotments WHERE course_slug = ${slug} AND year = ${year}
           GROUP BY quota, allotted_category
          HAVING COUNT(*) >= 1
           ORDER BY CASE WHEN quota = 'All India' THEN 0 ELSE 1 END, quota,
                    CASE allotted_category WHEN 'Open' THEN 0 WHEN 'EWS' THEN 1 WHEN 'OBC' THEN 2 WHEN 'SC' THEN 3 WHEN 'ST' THEN 4 ELSE 5 END
        `),
      ).map((x) => ({
        quota: String(x.quota),
        category: String(x.category),
        allotments: Number(x.allotments),
        r1: num(x.r1),
        last: num(x.last),
      }));
    const [cuts, currentCuts, inst] = await Promise.all([
      complete ? cut(complete.year) : Promise.resolve([] as MdsCut[]),
      current ? cut(current.year) : Promise.resolve([] as MdsCut[]),
      db.execute(sql`
        SELECT institute, MIN(state) AS state, COUNT(*) FILTER (WHERE round = 'R1')::int AS seats
          FROM mds_allotments WHERE course_slug = ${slug} AND year = ${complete?.year ?? 0}
         GROUP BY institute ORDER BY MIN(state) NULLS LAST, institute
      `),
    ]);
    return {
      course: head.course,
      slug,
      year: complete?.year ?? null,
      current: current ? { year: current.year, rounds: current.rounds.sort() } : null,
      cuts,
      currentCuts,
      institutes: rows<Record<string, unknown>>(inst).map((x) => ({
        name: String(x.institute),
        state: (x.state as string) ?? null,
        seats: Number(x.seats),
      })),
    };
  },
  ["mds-course-v1"],
  { revalidate: 86400, tags: ["mds-data"] },
);

export const getMdsSlugs = unstable_cache(
  async () => rows<{ course_slug: string }>(await db.execute(sql`SELECT DISTINCT course_slug FROM mds_allotments`)).map((x) => x.course_slug),
  ["mds-slugs-v1"],
  { revalidate: 86400, tags: ["mds-data"] },
);
