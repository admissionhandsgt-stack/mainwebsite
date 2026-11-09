/**
 * Read queries against the counselling database.
 *
 * Everything the college pages, the cutoff explorer and the fee calculator
 * need. Kept in one module so the shape of a "college" is defined once, and
 * every page shows the same numbers for the same seat.
 */

import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { collegeName, decodeEntities } from "@/lib/collegeName";

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
          : // No "rank" sort: ordering colleges by their tightest cut publishes
            // the order of the cuts (2026-10-12, lib/depth.ts).
            sql`i.seats_total DESC NULLS LAST`;

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
    // The scrape left "&#039;" in six names; decoded here so the H1, the title and the JSON-LD read "Era's".
    name: decodeEntities(r.name as string),
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
             -- The ::int is not decoration. seats_latest is a bigint in the
             -- materialized view (it comes out of a SUM), and postgres.js returns
             -- a bigint as a STRING so that no precision is lost. The "as number"
             -- below is a TypeScript assertion and changes nothing at runtime, so
             -- the counts arrived as "3" and "5" and the locked summary added them
             -- with + : 0 + "3" + "5" = "035". A college page read
             -- SEATS 0553315105335556135553310353155553332.
             -- branchQueries and quotaQueries already cast; this one did not.
             so.latest_year, so.seats_latest::int AS seats_latest, so.fee_inr
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
  /** The dollar figure, where the college charges in dollars (feeCurrency "USD") — the exact one; feeInr converts it. */
  feeUsd: number | null;
  /** "per year", "first year", "whole course", "not stated" — or null (as imported; read as a year's fee). */
  feePeriodicity: string | null;
  /** "Tuition fee" or "Fee (as printed) - …" (migration 0046); null where no labelled pass has reached the row. */
  feeLabel: string | null;
  /** The currency the college charges in; a dollar fee's rupee figure is approximate. */
  feeCurrency: string | null;
  /** From an official 2026-27 notice or list (fee_source set), not the imported listing. */
  official: boolean;
  /** An imported figure carried from an earlier year (the listing's 2025 fees). */
  carried: boolean;
  /** The fee's year as stored — 2025 for the listing's figures. */
  year: number | null;
  hostelMinInr: number | null;
  stipendY1Inr: number | null;
  stipendY2Inr: number | null;
  stipendY3Inr: number | null;
  feeNullReason: string | null;
}

export async function getCollegeFees(slug: string, level: Level): Promise<CollegeFee[]> {
  return rows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT c.name AS course, q.code AS quota, f.fee_inr, f.fee_usd, f.fee_periodicity, f.fee_label, f.fee_currency,
             (f.fee_source IS NOT NULL) AS official, f.is_carried_forward AS carried, f.year,
             f.hostel_min_inr, f.stipend_y1_inr, f.stipend_y2_inr, f.stipend_y3_inr,
             f.fee_null_reason
      FROM fees f
      JOIN institutes i ON i.id = f.institute_id
      LEFT JOIN courses c ON c.id = f.course_id
      LEFT JOIN quotas  q ON q.id = f.quota_id
      WHERE i.slug = ${slug} AND f.level = ${level}
        -- UG fee rows carry no quota and some are slips (owner, 2026-11-09: "kachre wali row … verify karke sahi wali
        -- dikhani hai"). Never a fee under ₹1,000 (116 rows read ₹5). At a college NMC does not list as Government
        -- that also lists a fee of ₹3 lakh or more, a figure under ₹1 lakh counts only when the same amount is listed
        -- at 3+ colleges NMC lists as private or trust in the state, for the course — a fee the state fixes (AP Category A ₹16,500 / ₹25,250,
        -- Telangana Category A ₹60,000, Puducherry ₹73,700) — not a lone figure (TN's government fee ₹18,073 at a
        -- private college, ₹60,100 at PES). A college whose every fee is low (CMC Vellore) keeps it.
        AND NOT (${level} = 'ug' AND f.fee_inr IS NOT NULL AND (
          f.fee_inr < 1000
          OR (f.fee_inr < 100000
              AND NOT EXISTS (SELECT 1 FROM nmc_institutes m JOIN nmc_courses nc ON nc.college_code = m.college_code
                               WHERE m.institute_id = i.id AND nc.management_type = 'Government')
              AND EXISTS (SELECT 1 FROM fees g WHERE g.institute_id = f.institute_id AND g.course_id = f.course_id AND g.fee_inr >= 300000)
              AND (SELECT COUNT(DISTINCT g2.institute_id) FROM fees g2 JOIN institutes i2 ON i2.id = g2.institute_id
                    WHERE g2.level = 'ug' AND g2.course_id = f.course_id AND g2.fee_inr = f.fee_inr AND i2.state_id = i.state_id
                      AND EXISTS (SELECT 1 FROM nmc_institutes m2 JOIN nmc_courses n2 ON n2.college_code = m2.college_code
                                   WHERE m2.institute_id = i2.id AND n2.management_type <> 'Government')) < 3)))
      ORDER BY f.fee_inr ASC NULLS LAST
    `),
  ).map((r) => ({
    course: (r.course as string) ?? "—",
    quota: (r.quota as string) ?? "—",
    feeInr: (r.fee_inr as number) ?? null,
    feeUsd: (r.fee_usd as number) ?? null,
    feePeriodicity: (r.fee_periodicity as string) ?? null,
    feeLabel: (r.fee_label as string) ?? null,
    feeCurrency: (r.fee_currency as string) ?? null,
    official: Boolean(r.official),
    carried: Boolean(r.carried),
    year: r.year == null ? null : Number(r.year),
    hostelMinInr: (r.hostel_min_inr as number) ?? null,
    stipendY1Inr: (r.stipend_y1_inr as number) ?? null,
    stipendY2Inr: (r.stipend_y2_inr as number) ?? null,
    stipendY3Inr: (r.stipend_y3_inr as number) ?? null,
    feeNullReason: (r.fee_null_reason as string) ?? null,
  }));
}

/** Colleges a visitor is likely to weigh against this one: same state, similar size. */
/** Names that mark a non-MBBS UG college (the MBBS directory uses the same test). */
const STREAM_NAME = "(dental|ayurved|homoeopath|homeopath|nursing|physiothe|veterinar|unani|siddha)";

/**
 * The same college's page at the other level — its MBBS page from its MD/MS page and back — when the NMC register
 * pairs both of our entries with one NMC college code (nmc_institutes). Search Console, 19 Oct – 2 Nov 2026: a third
 * of "<college> MBBS fees" impressions landed on the PG page, with no way across.
 */
export async function getOtherLevelPage(slug: string, level: Level): Promise<{ slug: string; level: Level } | null> {
  const other: Level = level === "ug" ? "pg" : "ug";
  const r = rows<{ slug: string }>(
    await db.execute(sql`
      SELECT o.slug
        FROM institutes i
        JOIN nmc_institutes m  ON m.institute_id = i.id AND m.college_code IS NOT NULL
        JOIN nmc_institutes m2 ON m2.college_code = m.college_code AND m2.institute_id <> i.id
        JOIN institutes o      ON o.id = m2.institute_id AND o.level = ${other} AND o.is_active = true
       WHERE i.slug = ${slug} AND i.level = ${level}
       -- One NMC college can hold an MD/MS entry and a DNB twin; the MD/MS one is listed first by name length.
       ORDER BY length(o.name), o.slug
       LIMIT 1
    `),
  )[0];
  return r ? { slug: r.slug, level: other } : null;
}

/**
 * The same hospital's other PG page (2026-11-09): our PG list holds many hospitals twice — the MD/MS entry (MCC's
 * name) and a DNB / NBE-diploma entry (NBEMS's name, ending in a PIN code). Search sends "<college> pg fees" to
 * whichever ranks, so each links the other. Paired only when, within one state, exactly two entries share the short
 * name and place and exactly one of them carries a PIN code — 46 pairs on 2026-11-09; an ambiguous group gets none.
 */
const pgTwinMap = unstable_cache(
  async (): Promise<Record<string, { slug: string; dnb: boolean }>> => {
    const all = rows<{ slug: string; name: string; state_id: number | null }>(
      await db.execute(sql`SELECT slug, name, state_id FROM institutes WHERE level = 'pg' AND is_active = true`),
    );
    const pin = (n: string) => /\b\d{6}\b/.test(n);
    const groups = new Map<string, { slug: string; name: string }[]>();
    for (const r of all) {
      const c = collegeName(r.name);
      const k = `${r.state_id}|${c.short}|${c.place ?? ""}`.toLowerCase();
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    const out: Record<string, { slug: string; dnb: boolean }> = {};
    for (const g of groups.values()) {
      if (g.length !== 2) continue;
      const dnb = g.find((x) => pin(x.name));
      const mdms = g.find((x) => !pin(x.name));
      if (!dnb || !mdms) continue;
      out[mdms.slug] = { slug: dnb.slug, dnb: true };
      out[dnb.slug] = { slug: mdms.slug, dnb: false };
    }
    return out;
  },
  ["pg-twin-map-v1"],
  { revalidate: 86400, tags: ["seat-data"] },
);

export async function getPgTwin(slug: string): Promise<{ slug: string; dnb: boolean } | null> {
  return (await pgTwinMap().catch(() => ({}) as Record<string, { slug: string; dnb: boolean }>))[slug] ?? null;
}

export async function getSimilarColleges(slug: string, level: Level, limit = 6) {
  return rows<Record<string, unknown>>(
    await db.execute(sql`
      WITH me AS (
        SELECT id, state_id, seats_total,
               -- UG lists every NEET stream: a dental or AYUSH college is "similar"
               -- only to its own kind, never to an MBBS college.
               (name ~* ${STREAM_NAME}) AS other_stream
          FROM institutes WHERE slug = ${slug} AND level = ${level}
      )
      SELECT i.slug, i.name, i.ownership::text AS ownership, st.name AS state, i.seats_total
      FROM institutes i
      LEFT JOIN states st ON st.id = i.state_id
      WHERE i.level = ${level}
        AND i.id <> (SELECT id FROM me)
        AND i.state_id = (SELECT state_id FROM me)
        AND (${level} <> 'ug' OR (i.name ~* ${STREAM_NAME}) = (SELECT other_stream FROM me))
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
