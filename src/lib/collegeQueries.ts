/**
 * Read queries against the counselling database.
 *
 * Everything the college pages, the cutoff explorer and the fee calculator
 * need. Kept in one module so the shape of a "college" is defined once, and
 * every page shows the same numbers for the same seat.
 */

import { db } from "@/db/client";
import { sql } from "drizzle-orm";

const rows = <T,>(r: unknown) => r as unknown as T[];

export type Level = "ug" | "pg";

export interface CollegeListItem {
  slug: string;
  name: string;
  ownership: string;
  state: string | null;
  district: string | null;
  establishedYear: number | null;
  beds: number | null;
  seatsTotal: number | null;
  branchCount: number | null;
  minFee: number | null;
  maxStipend: number | null;
  bestRank: number | null;
}

export interface CollegeFilters {
  level: Level;
  search?: string;
  states?: string[];
  ownership?: string[];
  maxFee?: number | null;
  sort?: "seats" | "fee" | "stipend" | "name" | "rank";
  page?: number;
  perPage?: number;
}

/**
 * The listing. Aggregates are pulled with correlated subqueries rather than
 * joins so a college with 40 courses still produces exactly one row.
 */
export async function listColleges(f: CollegeFilters) {
  const perPage = Math.min(f.perPage ?? 24, 60);
  const page = Math.max(1, f.page ?? 1);
  const offset = (page - 1) * perPage;

  const where = [sql`i.level = ${f.level}`, sql`i.is_active = true`];
  if (f.search?.trim()) {
    const q = `%${f.search.trim().toLowerCase()}%`;
    where.push(sql`(lower(i.name) LIKE ${q} OR lower(COALESCE(i.district, '')) LIKE ${q} OR lower(COALESCE(st.name, '')) LIKE ${q})`);
  }
  if (f.states?.length) {
    where.push(sql`st.name IN (${sql.join(f.states.map((s) => sql`${s}`), sql`, `)})`);
  }
  if (f.ownership?.length) {
    where.push(sql`i.ownership::text IN (${sql.join(f.ownership.map((o) => sql`${o}`), sql`, `)})`);
  }
  if (f.maxFee) {
    where.push(sql`COALESCE((SELECT MIN(fe.fee_inr) FROM fees fe WHERE fe.institute_id = i.id), 0) <= ${f.maxFee}`);
  }
  const whereSql = sql.join(where, sql` AND `);

  const order =
    f.sort === "fee"
      ? sql`min_fee ASC NULLS LAST`
      : f.sort === "stipend"
        ? sql`max_stipend DESC NULLS LAST`
        : f.sort === "name"
          ? sql`i.name ASC`
          : f.sort === "rank"
            ? sql`best_rank ASC NULLS LAST`
            : sql`i.seats_total DESC NULLS LAST`;

  const [items, total] = await Promise.all([
    db.execute(sql`
      SELECT
        i.slug, i.name, i.ownership::text AS ownership, st.name AS state, i.district,
        i.established_year, i.beds, i.seats_total, i.branch_count,
        (SELECT MIN(fe.fee_inr)        FROM fees fe WHERE fe.institute_id = i.id) AS min_fee,
        (SELECT MAX(fe.stipend_y1_inr) FROM fees fe WHERE fe.institute_id = i.id) AS max_stipend,
        (SELECT MIN(so.r1_latest)      FROM seat_options so WHERE so.institute_id = i.id) AS best_rank
      FROM institutes i
      LEFT JOIN states st ON st.id = i.state_id
      WHERE ${whereSql}
      ORDER BY ${order}
      LIMIT ${perPage} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT COUNT(*)::int AS n
      FROM institutes i
      LEFT JOIN states st ON st.id = i.state_id
      WHERE ${whereSql}
    `),
  ]);

  return {
    items: rows<Record<string, unknown>>(items).map(
      (r): CollegeListItem => ({
        slug: r.slug as string,
        name: r.name as string,
        ownership: r.ownership as string,
        state: (r.state as string) ?? null,
        district: (r.district as string) ?? null,
        establishedYear: (r.established_year as number) ?? null,
        beds: (r.beds as number) ?? null,
        seatsTotal: (r.seats_total as number) ?? null,
        branchCount: (r.branch_count as number) ?? null,
        minFee: (r.min_fee as number) ?? null,
        maxStipend: (r.max_stipend as number) ?? null,
        bestRank: (r.best_rank as number) ?? null,
      }),
    ),
    total: rows<{ n: number }>(total)[0]?.n ?? 0,
    page,
    perPage,
  };
}

export interface CollegeDetail {
  slug: string;
  name: string;
  ownership: string;
  state: string | null;
  district: string | null;
  city: string | null;
  university: string | null;
  management: string | null;
  establishedYear: number | null;
  beds: number | null;
  seatsTotal: number | null;
  branchCount: number | null;
}

export async function getCollege(slug: string, level: Level): Promise<CollegeDetail | null> {
  const r = rows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT i.slug, i.name, i.ownership::text AS ownership, st.name AS state,
             i.district, i.city, i.university, i.management,
             i.established_year, i.beds, i.seats_total, i.branch_count
      FROM institutes i
      LEFT JOIN states st ON st.id = i.state_id
      WHERE i.slug = ${slug} AND i.level = ${level}
      LIMIT 1
    `),
  )[0];
  if (!r) return null;
  return {
    slug: r.slug as string,
    name: r.name as string,
    ownership: r.ownership as string,
    state: (r.state as string) ?? null,
    district: (r.district as string) ?? null,
    city: (r.city as string) ?? null,
    university: (r.university as string) ?? null,
    management: (r.management as string) ?? null,
    establishedYear: (r.established_year as number) ?? null,
    beds: (r.beds as number) ?? null,
    seatsTotal: (r.seats_total as number) ?? null,
    branchCount: (r.branch_count as number) ?? null,
  };
}

export interface CourseCutoff {
  course: string;
  quota: string;
  category: string;
  counselling: string | null;
  r1Latest: number | null;
  widestLatest: number | null;
  widestPrevious: number | null;
  furthestEver: number | null;
  latestYear: number | null;
  seats: number | null;
  feeInr: number | null;
}

/** Every seat this college offers, with the cut behind each one. */
export async function getCollegeCutoffs(slug: string, level: Level): Promise<CourseCutoff[]> {
  return rows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT c.name AS course, q.code AS quota, cat.code AS category, cn.name AS counselling,
             so.r1_latest, so.widest_latest, so.widest_previous, so.furthest_ever,
             so.latest_year, so.seats_latest, so.fee_inr
      FROM seat_options so
      JOIN institutes i   ON i.id  = so.institute_id
      JOIN courses    c   ON c.id  = so.course_id
      JOIN quotas     q   ON q.id  = so.quota_id
      JOIN categories cat ON cat.id = so.category_id
      LEFT JOIN counsellings cn ON cn.id = so.counselling_id
      WHERE i.slug = ${slug} AND so.level = ${level}
      ORDER BY c.name, q.code, so.r1_latest ASC NULLS LAST
    `),
  ).map((r) => ({
    course: r.course as string,
    quota: r.quota as string,
    category: r.category as string,
    counselling: (r.counselling as string) ?? null,
    r1Latest: (r.r1_latest as number) ?? null,
    widestLatest: (r.widest_latest as number) ?? null,
    widestPrevious: (r.widest_previous as number) ?? null,
    furthestEver: (r.furthest_ever as number) ?? null,
    latestYear: (r.latest_year as number) ?? null,
    seats: (r.seats_latest as number) ?? null,
    feeInr: (r.fee_inr as number) ?? null,
  }));
}

export interface CollegeFee {
  course: string;
  quota: string;
  feeInr: number | null;
  feePeriodicity: string | null;
  hostelMinInr: number | null;
  stipendY1Inr: number | null;
  stipendY2Inr: number | null;
  stipendY3Inr: number | null;
  feeNullReason: string | null;
}

export async function getCollegeFees(slug: string, level: Level): Promise<CollegeFee[]> {
  return rows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT c.name AS course, q.code AS quota, f.fee_inr, f.fee_periodicity,
             f.hostel_min_inr, f.stipend_y1_inr, f.stipend_y2_inr, f.stipend_y3_inr,
             f.fee_null_reason
      FROM fees f
      JOIN institutes i ON i.id = f.institute_id
      LEFT JOIN courses c ON c.id = f.course_id
      LEFT JOIN quotas  q ON q.id = f.quota_id
      WHERE i.slug = ${slug} AND f.level = ${level}
      ORDER BY f.fee_inr ASC NULLS LAST
    `),
  ).map((r) => ({
    course: (r.course as string) ?? "—",
    quota: (r.quota as string) ?? "—",
    feeInr: (r.fee_inr as number) ?? null,
    feePeriodicity: (r.fee_periodicity as string) ?? null,
    hostelMinInr: (r.hostel_min_inr as number) ?? null,
    stipendY1Inr: (r.stipend_y1_inr as number) ?? null,
    stipendY2Inr: (r.stipend_y2_inr as number) ?? null,
    stipendY3Inr: (r.stipend_y3_inr as number) ?? null,
    feeNullReason: (r.fee_null_reason as string) ?? null,
  }));
}

/** Colleges a visitor is likely to weigh against this one: same state, similar size. */
export async function getSimilarColleges(slug: string, level: Level, limit = 6) {
  return rows<Record<string, unknown>>(
    await db.execute(sql`
      WITH me AS (SELECT id, state_id, seats_total FROM institutes WHERE slug = ${slug} AND level = ${level})
      SELECT i.slug, i.name, i.ownership::text AS ownership, st.name AS state, i.seats_total
      FROM institutes i
      LEFT JOIN states st ON st.id = i.state_id
      WHERE i.level = ${level}
        AND i.id <> (SELECT id FROM me)
        AND i.state_id = (SELECT state_id FROM me)
      ORDER BY ABS(COALESCE(i.seats_total, 0) - COALESCE((SELECT seats_total FROM me), 0)) ASC
      LIMIT ${limit}
    `),
  ).map((r) => ({
    slug: r.slug as string,
    name: r.name as string,
    ownership: r.ownership as string,
    state: (r.state as string) ?? null,
    seatsTotal: (r.seats_total as number) ?? null,
  }));
}

/** Distinct filter values, read from the data so a re-import updates them. */
export async function getCollegeFacets(level: Level) {
  const [statesRes, countRes] = await Promise.all([
    db.execute(sql`
      SELECT st.name, COUNT(*)::int AS n
      FROM institutes i JOIN states st ON st.id = i.state_id
      WHERE i.level = ${level} GROUP BY st.name ORDER BY n DESC
    `),
    db.execute(sql`
      SELECT ownership::text AS ownership, COUNT(*)::int AS n
      FROM institutes WHERE level = ${level} GROUP BY ownership ORDER BY n DESC
    `),
  ]);
  return {
    states: rows<{ name: string; n: number }>(statesRes).map((r) => ({ name: r.name, count: r.n })),
    ownership: rows<{ ownership: string; n: number }>(countRes).map((r) => ({
      name: r.ownership,
      count: r.n,
    })),
  };
}

/** Slugs for the sitemap and for static generation of the busiest pages. */
export async function getCollegeSlugs(level: Level, limit?: number) {
  return rows<{ slug: string }>(
    await db.execute(sql`
      SELECT slug FROM institutes
      WHERE level = ${level} AND is_active = true
      ORDER BY seats_total DESC NULLS LAST
      ${limit ? sql`LIMIT ${limit}` : sql``}
    `),
  ).map((r) => r.slug);
}
