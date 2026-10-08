/**
 * `/md-ms-india/states/[slug]` — "PG seats in Karnataka", "NEET PG cutoff Tamil
 * Nadu", "UP NEET PG". One page per state from the counselling data.
 *
 * What a state page states, and what it deliberately does not:
 *  - Per quota, for the general category, a closing-rank range and a fee range
 *    in **separate columns** — each a min/max over different colleges, so they
 *    are never joined into one sentence (the 2026-09-25 rule in CLAUDE.md).
 *  - No seat rows: which college closed where stays on the college's own page,
 *    behind the gate.
 *  - A year's figures come from `closing_ranks` for that year (see
 *    cutoffHubQueries.ts for why not `seat_options`).
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { branchSlug } from "@/lib/branchSlug";

const rows = <T,>(r: unknown) => r as unknown as T[];

/**
 * The open / general-merit category, as each counselling writes it. Most say
 * GEN; Karnataka says GM, J&K OM, Tamil Nadu "OC Open", Kerala SM, Gujarat
 * GQ-OP / UQ-OP / IQ-OP, Goa "Group 1 - GEN". Management and NRI seats are
 * unreserved by nature and some boards code the quota as the category (MNG,
 * NRI, MQ-MQ, NQ-NRI). Read off the data on 2026-10-08 — a state that reports
 * nothing here is one whose open code is missing from this list, not one with
 * no seats.
 */
export const OPEN_CATEGORY_CODES = [
  "GEN", "UR", "OPEN", "GM", "OM", "OC Open", "SM", "GQ-OP", "UQ-OP", "IQ-OP", "Group 1 - GEN",
  "North East Open Quota", "CMC-General Merit", "OPN", "MNG", "NRI", "MQ-MQ", "NQ-NRI",
];
const openCodes = sql.join(OPEN_CATEGORY_CODES.map((c) => sql`${c}`), sql`, `);
const num = (v: unknown) => (v == null ? null : Number(v));

export interface PgState {
  name: string;
  slug: string;
  colleges: number;
}

export const getPgStates = unstable_cache(
  async (): Promise<PgState[]> =>
    rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT st.name, st.slug, COUNT(DISTINCT i.id)::int AS colleges
          FROM institutes i
          JOIN states st ON st.id = i.state_id
         WHERE i.level = 'pg' AND i.is_active = true
           AND EXISTS (SELECT 1 FROM seat_options so WHERE so.institute_id = i.id)
         GROUP BY st.name, st.slug
         ORDER BY colleges DESC, st.name
      `),
    ).map((x) => ({ name: String(x.name), slug: String(x.slug), colleges: Number(x.colleges) })),
  ["pg-states-v1"],
  { revalidate: 86400, tags: ["seat-data"] },
);

export interface QuotaRange {
  quota: string;
  counselling: string;
  colleges: number;
  bestR1: number | null;
  widest: number | null;
  feeFrom: number | null;
  feeTo: number | null;
}

export interface PgStatePage {
  name: string;
  slug: string;
  year: number | null;
  colleges: { name: string; slug: string; ownership: string }[];
  ownership: Record<string, number>;
  counsellings: { name: string; colleges: number }[];
  quotas: QuotaRange[];
  branches: { name: string; slug: string; colleges: number; seats: number }[];
}

export const getPgStatePage = unstable_cache(
  async (slug: string): Promise<PgStatePage | null> => {
    const st = rows<Record<string, unknown>>(await db.execute(sql`SELECT id, name, slug FROM states WHERE slug = ${slug} LIMIT 1`))[0];
    if (!st) return null;
    const stateId = Number(st.id);

    const [colleges, year] = await Promise.all([
      db.execute(sql`
        SELECT i.name, i.slug, i.ownership::text AS ownership
          FROM institutes i
         WHERE i.level = 'pg' AND i.is_active = true AND i.state_id = ${stateId}
           AND EXISTS (SELECT 1 FROM seat_options so WHERE so.institute_id = i.id)
         ORDER BY CASE i.ownership WHEN 'government' THEN 0 WHEN 'deemed' THEN 1 WHEN 'private' THEN 2 ELSE 3 END, i.name
      `),
      db.execute(sql`
        SELECT MAX(cr.year)::int AS y FROM closing_ranks cr JOIN institutes i ON i.id = cr.institute_id
         WHERE cr.level = 'pg' AND i.state_id = ${stateId} AND cr.round_label = 'R3'
      `),
    ]);
    const list = rows<Record<string, unknown>>(colleges).map((x) => ({
      name: String(x.name),
      slug: String(x.slug),
      ownership: String(x.ownership),
    }));
    if (!list.length) return null;
    const y = num(rows<Record<string, unknown>>(year)[0]?.y);

    const [counsellings, quotas, branches] = await Promise.all([
      db.execute(sql`
        SELECT c.name, COUNT(DISTINCT so.institute_id)::int AS colleges
          FROM seat_options so
          JOIN institutes i ON i.id = so.institute_id
          JOIN counsellings c ON c.id = so.counselling_id
         WHERE so.level = 'pg' AND i.state_id = ${stateId}
         GROUP BY c.name ORDER BY colleges DESC
      `),
      y == null
        ? Promise.resolve([])
        : db.execute(sql`
            -- By quota alone: Karnataka's private seats are filed under both KEA
            -- and "Open States", the same rows twice.
            SELECT q.label AS quota, MIN(c.name) AS counselling,
                   COUNT(DISTINCT cr.institute_id)::int AS colleges,
                   MIN(cr.closing_rank) FILTER (WHERE cr.round_label = 'R1')::int AS best_r1,
                   MAX(cr.closing_rank)::int AS widest,
                   MIN(NULLIF(cr.fee_inr, 0)) AS fee_from,
                   MAX(NULLIF(cr.fee_inr, 0)) AS fee_to
              FROM closing_ranks cr
              JOIN institutes i ON i.id = cr.institute_id
              JOIN counsellings c ON c.id = cr.counselling_id
              JOIN categories cat ON cat.id = cr.category_id
              LEFT JOIN quotas q ON q.id = cr.quota_id
             WHERE cr.level = 'pg' AND i.state_id = ${stateId} AND cr.year = ${y}
               AND cat.code IN (${openCodes}) AND cr.closing_rank > 0
             GROUP BY q.label
             ORDER BY COUNT(DISTINCT cr.institute_id) DESC
             LIMIT 12
          `),
      db.execute(sql`
        SELECT co.name, COUNT(DISTINCT so.institute_id)::int AS colleges, COUNT(*)::int AS seats
          FROM seat_options so
          JOIN institutes i ON i.id = so.institute_id
          JOIN courses co ON co.id = so.course_id
         WHERE so.level = 'pg' AND i.state_id = ${stateId}
         GROUP BY co.name ORDER BY colleges DESC, co.name LIMIT 24
      `),
    ]);

    const ownership: Record<string, number> = {};
    for (const c of list) ownership[c.ownership] = (ownership[c.ownership] ?? 0) + 1;

    return {
      name: String(st.name),
      slug: String(st.slug),
      year: y,
      colleges: list,
      ownership,
      counsellings: rows<Record<string, unknown>>(counsellings).map((x) => ({ name: String(x.name), colleges: Number(x.colleges) })),
      quotas: rows<Record<string, unknown>>(quotas).map((x) => ({
        quota: String(x.quota ?? "—"),
        counselling: String(x.counselling),
        colleges: Number(x.colleges),
        bestR1: num(x.best_r1),
        widest: num(x.widest),
        feeFrom: x.fee_from == null ? null : Math.round(Number(x.fee_from)),
        feeTo: x.fee_to == null ? null : Math.round(Number(x.fee_to)),
      })),
      branches: rows<Record<string, unknown>>(branches).map((x) => ({
        name: String(x.name),
        slug: branchSlug(String(x.name)),
        colleges: Number(x.colleges),
        seats: Number(x.seats),
      })),
    };
  },
  ["pg-state-page-v1"],
  { revalidate: 86400, tags: ["seat-data"] },
);
