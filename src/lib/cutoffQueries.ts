/**
 * Row-level cutoff and cost queries.
 *
 * Separate from collegeQueries because these read `closing_ranks` and `fees`
 * directly — one row per published round, not the collapsed seat view — and
 * are always paginated: 230k rows never reach a browser.
 */

import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import type { Level } from "@/lib/collegeQueries";

const rows = <T,>(r: unknown) => r as unknown as T[];

/* ------------------------------------------------------------------ *
 * Cutoff explorer
 * ------------------------------------------------------------------ */

export interface CutoffFilters {
  level: Level;
  counselling?: string;
  state?: string;
  course?: string;
  category?: string;
  quota?: string;
  year?: number;
  page?: number;
  perPage?: number;
}

export interface CutoffRow {
  institute: string;
  instituteSlug: string;
  state: string | null;
  course: string;
  quota: string;
  category: string;
  counselling: string | null;
  year: number;
  roundLabel: string | null;
  closingRank: number | null;
  seatsAllotted: number | null;
  feeInr: number | null;
}

export async function listCutoffs(f: CutoffFilters) {
  const perPage = Math.min(f.perPage ?? 50, 100);
  const page = Math.max(1, f.page ?? 1);
  const offset = (page - 1) * perPage;

  const where = [sql`cr.level = ${f.level}`, sql`cr.closing_rank IS NOT NULL`];
  if (f.counselling) where.push(sql`cn.name = ${f.counselling}`);
  if (f.state) where.push(sql`st.name = ${f.state}`);
  if (f.course) where.push(sql`c.name = ${f.course}`);
  if (f.category) where.push(sql`cat.code = ${f.category}`);
  if (f.quota) where.push(sql`q.code = ${f.quota}`);
  if (f.year) where.push(sql`cr.year = ${f.year}`);
  const whereSql = sql.join(where, sql` AND `);

  const from = sql`
    FROM closing_ranks cr
    JOIN institutes  i   ON i.id  = cr.institute_id
    JOIN courses     c   ON c.id  = cr.course_id
    JOIN quotas      q   ON q.id  = cr.quota_id
    JOIN categories  cat ON cat.id = cr.category_id
    LEFT JOIN states       st ON st.id = i.state_id
    LEFT JOIN counsellings cn ON cn.id = cr.counselling_id
    WHERE ${whereSql}
  `;

  const [items, total] = await Promise.all([
    db.execute(sql`
      SELECT i.name AS institute, i.slug AS institute_slug, st.name AS state,
             c.name AS course, q.code AS quota, cat.code AS category, cn.name AS counselling,
             cr.year, cr.round_label, cr.closing_rank, cr.seats_allotted, cr.fee_inr
      ${from}
      ORDER BY cr.closing_rank ASC
      LIMIT ${perPage} OFFSET ${offset}
    `),
    db.execute(sql`SELECT COUNT(*)::int AS n ${from}`),
  ]);

  return {
    items: rows<Record<string, unknown>>(items).map(
      (r): CutoffRow => ({
        institute: r.institute as string,
        instituteSlug: r.institute_slug as string,
        state: (r.state as string) ?? null,
        course: r.course as string,
        quota: r.quota as string,
        category: r.category as string,
        counselling: (r.counselling as string) ?? null,
        year: r.year as number,
        roundLabel: (r.round_label as string) ?? null,
        closingRank: (r.closing_rank as number) ?? null,
        seatsAllotted: (r.seats_allotted as number) ?? null,
        feeInr: (r.fee_inr as number) ?? null,
      }),
    ),
    total: rows<{ n: number }>(total)[0]?.n ?? 0,
    page,
    perPage,
  };
}

export async function getCutoffFacets(level: Level) {
  const [counsellings, states, courses, categories, quotas, years] = await Promise.all([
    db.execute(sql`
      SELECT cn.name, COUNT(*)::int AS n FROM counsellings cn
      JOIN closing_ranks cr ON cr.counselling_id = cn.id
      WHERE cr.level = ${level} GROUP BY cn.name ORDER BY n DESC LIMIT 40`),
    db.execute(sql`
      SELECT st.name, COUNT(*)::int AS n FROM states st
      JOIN institutes i ON i.state_id = st.id
      JOIN closing_ranks cr ON cr.institute_id = i.id
      WHERE cr.level = ${level} GROUP BY st.name ORDER BY n DESC`),
    db.execute(sql`
      SELECT c.name, COUNT(*)::int AS n FROM courses c
      JOIN closing_ranks cr ON cr.course_id = c.id
      WHERE cr.level = ${level} GROUP BY c.name ORDER BY n DESC LIMIT 60`),
    db.execute(sql`
      SELECT cat.code, COUNT(*)::int AS n FROM categories cat
      JOIN closing_ranks cr ON cr.category_id = cat.id
      WHERE cr.level = ${level} GROUP BY cat.code ORDER BY n DESC LIMIT 20`),
    db.execute(sql`
      SELECT q.code, COUNT(*)::int AS n FROM quotas q
      JOIN closing_ranks cr ON cr.quota_id = q.id
      WHERE cr.level = ${level} GROUP BY q.code ORDER BY n DESC LIMIT 20`),
    db.execute(sql`SELECT DISTINCT year FROM closing_ranks WHERE level = ${level} ORDER BY year DESC`),
  ]);

  return {
    counsellings: rows<{ name: string }>(counsellings).map((r) => r.name),
    states: rows<{ name: string }>(states).map((r) => r.name),
    courses: rows<{ name: string }>(courses).map((r) => r.name),
    categories: rows<{ code: string }>(categories).map((r) => r.code),
    quotas: rows<{ code: string }>(quotas).map((r) => r.code),
    years: rows<{ year: number }>(years).map((r) => r.year),
  };
}

/* ------------------------------------------------------------------ *
 * Net cost — what three years actually leaves a family with
 * ------------------------------------------------------------------ */

export interface NetCostRow {
  institute: string;
  instituteSlug: string;
  state: string | null;
  ownership: string;
  course: string;
  quota: string;
  feeInr: number | null;
  hostelMinInr: number | null;
  stipendY1Inr: number | null;
  netThreeYears: number | null;
}

export async function listNetCost(opts: {
  level: Level;
  state?: string;
  ownership?: string;
  maxFee?: number | null;
  sort?: "net" | "fee" | "stipend";
  page?: number;
  perPage?: number;
}) {
  const perPage = Math.min(opts.perPage ?? 40, 80);
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * perPage;

  const where = [sql`f.level = ${opts.level}`, sql`f.fee_inr IS NOT NULL`];
  if (opts.state) where.push(sql`st.name = ${opts.state}`);
  if (opts.ownership) where.push(sql`i.ownership::text = ${opts.ownership}`);
  if (opts.maxFee) where.push(sql`f.fee_inr <= ${opts.maxFee}`);
  const whereSql = sql.join(where, sql` AND `);

  // Three years is the standard MD/MS length. Diplomas are two, and the source
  // does not mark them reliably, so the UI labels this column "over 3 years"
  // rather than presenting it as a per-course total.
  const net = sql`(COALESCE(f.stipend_y1_inr, 0) * 36) - (f.fee_inr * 3)`;
  const order =
    opts.sort === "fee"
      ? sql`f.fee_inr ASC`
      : opts.sort === "stipend"
        ? sql`f.stipend_y1_inr DESC NULLS LAST`
        : sql`${net} DESC`;

  const from = sql`
    FROM fees f
    JOIN institutes i ON i.id = f.institute_id
    LEFT JOIN courses c ON c.id = f.course_id
    LEFT JOIN quotas  q ON q.id = f.quota_id
    LEFT JOIN states st ON st.id = i.state_id
    WHERE ${whereSql}
  `;

  const [items, total] = await Promise.all([
    db.execute(sql`
      SELECT i.name AS institute, i.slug AS institute_slug, st.name AS state,
             i.ownership::text AS ownership, c.name AS course, q.code AS quota,
             f.fee_inr, f.hostel_min_inr, f.stipend_y1_inr, ${net} AS net_three_years
      ${from}
      ORDER BY ${order}
      LIMIT ${perPage} OFFSET ${offset}
    `),
    db.execute(sql`SELECT COUNT(*)::int AS n ${from}`),
  ]);

  return {
    items: rows<Record<string, unknown>>(items).map(
      (r): NetCostRow => ({
        institute: r.institute as string,
        instituteSlug: r.institute_slug as string,
        state: (r.state as string) ?? null,
        ownership: r.ownership as string,
        course: (r.course as string) ?? "—",
        quota: (r.quota as string) ?? "—",
        feeInr: (r.fee_inr as number) ?? null,
        hostelMinInr: (r.hostel_min_inr as number) ?? null,
        stipendY1Inr: (r.stipend_y1_inr as number) ?? null,
        netThreeYears: (r.net_three_years as number) ?? null,
      }),
    ),
    total: rows<{ n: number }>(total)[0]?.n ?? 0,
    page,
    perPage,
  };
}
