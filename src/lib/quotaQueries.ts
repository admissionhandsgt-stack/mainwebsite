/**
 * NRI and management seats, as pages of their own.
 *
 * "NRI quota MBBS fees", "management quota rank required", "NRI seat medical
 * college fees" are among the highest-intent searches in this market — the
 * people typing them are the ones who convert — and the site had no page for
 * any of them, despite holding every one of those seats with its published
 * rank and fee.
 *
 * ## The families are drawn conservatively
 *
 * Quota labels are the authority's own and there are hundreds of them, many
 * state-specific. A seat is counted here only when its label *says* what it
 * is: `%NRI%` for NRI, `%management%` or exactly `MNG` for management. That
 * deliberately leaves out labels like "Karnataka Private Seats - GMP Quota",
 * which is a government-merit seat sitting inside a private college and is
 * not a management seat at all. Guessing a taxonomy we cannot verify is how
 * the branch table ended up telling people a management rank came with a
 * government fee.
 *
 * NRI wins ties. Several labels are both — "TN Management - NRI Quota" — and
 * a candidate reading them is buying an NRI seat.
 *
 * ## UG has no fee, and says so
 *
 * The UG source publishes several unlabelled fee blocks per college and never
 * says which quota each belongs to, so `fees.quota_id` is null for every UG
 * row (see CLAUDE.md). UG seats therefore carry a rank and no fee here. That
 * is stated on the page rather than filled with a number from another quota —
 * which is exactly the mistake this file exists to avoid repeating.
 */

import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { sql, type SQL } from "drizzle-orm";
import { logError } from "@/lib/logger";

const rows = <T,>(r: unknown) => r as unknown as T[];

/**
 * A fee of zero is not a fee.
 *
 * 35 management seats and a handful of others record `fee_inr = 0`, which the
 * source means as "not published" — there is no free management seat at a
 * deemed university. Reported as-is it produced "Management quota seats from
 * ₹0", which reads as broken and takes the page's credibility with it.
 *
 * `NULLIF(fee_inr, 0)` everywhere a fee is aggregated or shown. Deliberately
 * only zero: some state management quotas inside government colleges really
 * are inexpensive, and inventing a plausibility threshold would be the same
 * guessing that produced the branch-table fault.
 */

export type QuotaFamilyId = "nri" | "management";

export interface QuotaFamily {
  id: QuotaFamilyId;
  /** What the page calls it. */
  label: string;
  /** For headings and prose. */
  short: string;
  path: string;
}

export const QUOTA_FAMILIES: Record<QuotaFamilyId, QuotaFamily> = {
  nri: { id: "nri", label: "NRI quota", short: "NRI", path: "/nri-quota/fees" },
  management: {
    id: "management",
    label: "Management quota",
    short: "management",
    path: "/management-quota",
  },
};

/** The `WHERE` that defines a family. Conservative on purpose — see the note above. */
function familyClause(id: QuotaFamilyId): SQL {
  if (id === "nri") return sql`q.label ILIKE '%NRI%'`;
  // NRI takes precedence, so a management-NRI label belongs to NRI only.
  return sql`(q.label ILIKE '%management%' OR q.label = 'MNG') AND q.label NOT ILIKE '%NRI%'`;
}

export interface QuotaSeat {
  college: string;
  slug: string;
  state: string | null;
  ownership: string;
  level: "ug" | "pg";
  course: string;
  quota: string;
  seats: number;
  r1: number | null;
  widest: number | null;
  feeInr: number | null;
}

export interface QuotaOverview {
  family: QuotaFamily;
  level: "ug" | "pg";
  colleges: number;
  seats: number;
  states: number;
  /** Null for UG, where the source publishes no per-quota fee. */
  minFee: number | null;
  maxFee: number | null;
  medianFee: number | null;
  bestRank: number | null;
  widestRank: number | null;
  year: number | null;
  rowsList: QuotaSeat[];
  truncated: boolean;
}

const ROW_LIMIT = 250;

async function load(id: QuotaFamilyId, level: "ug" | "pg"): Promise<QuotaOverview | null> {
  const family = QUOTA_FAMILIES[id];
  const clause = familyClause(id);

  try {
    const [summary, seatRows] = await Promise.all([
      db.execute(sql`
        SELECT COUNT(DISTINCT so.institute_id)::int AS colleges,
               COUNT(*)::int                        AS seats,
               COUNT(DISTINCT i.state_id)::int      AS states,
               MIN(NULLIF(so.fee_inr, 0))::bigint   AS min_fee,
               MAX(NULLIF(so.fee_inr, 0))::bigint   AS max_fee,
               PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY NULLIF(so.fee_inr, 0))::bigint AS median_fee,
               MIN(so.r1_latest)::int               AS best_rank,
               MAX(so.widest_latest)::int           AS widest_rank,
               MAX(so.latest_year)::int             AS year
          FROM seat_options so
          JOIN quotas q ON q.id = so.quota_id
          JOIN institutes i ON i.id = so.institute_id
         WHERE so.level = ${level} AND ${clause}
      `),
      // Grouped to one row per college + course + quota, so the rank and the
      // fee on a row are the same seat. Widest reach first: the seats the most
      // ranks can actually get to are the reason somebody is on this page.
      db.execute(sql`
        SELECT i.name, i.slug, st.name AS state, i.ownership::text AS ownership,
               c.name AS course, q.label AS quota,
               SUM(COALESCE(so.seats_latest, 1))::int AS seats,
               MIN(so.r1_latest)::int     AS r1,
               MAX(so.widest_latest)::int AS widest,
               MAX(NULLIF(so.fee_inr, 0))::bigint AS fee_inr
          FROM seat_options so
          JOIN quotas q ON q.id = so.quota_id
          JOIN institutes i ON i.id = so.institute_id
          JOIN courses c ON c.id = so.course_id
          LEFT JOIN states st ON st.id = i.state_id
         WHERE so.level = ${level} AND ${clause}
         GROUP BY i.name, i.slug, st.name, i.ownership, c.name, q.label
         ORDER BY MAX(so.widest_latest) DESC NULLS LAST
         LIMIT ${ROW_LIMIT + 1}
      `),
    ]);

    const s = rows<Record<string, unknown>>(summary)[0] ?? {};
    const raw = rows<Record<string, unknown>>(seatRows);
    if ((s.seats as number) === 0) return null;

    const num = (v: unknown) => (v == null ? null : Number(v));

    return {
      family,
      level,
      colleges: (s.colleges as number) ?? 0,
      seats: (s.seats as number) ?? 0,
      states: (s.states as number) ?? 0,
      minFee: num(s.min_fee),
      maxFee: num(s.max_fee),
      medianFee: num(s.median_fee),
      bestRank: (s.best_rank as number) ?? null,
      widestRank: (s.widest_rank as number) ?? null,
      year: (s.year as number) ?? null,
      truncated: raw.length > ROW_LIMIT,
      rowsList: raw.slice(0, ROW_LIMIT).map((x) => ({
        college: x.name as string,
        slug: x.slug as string,
        state: (x.state as string) ?? null,
        ownership: x.ownership as string,
        level,
        course: x.course as string,
        quota: x.quota as string,
        seats: x.seats as number,
        r1: (x.r1 as number) ?? null,
        widest: (x.widest as number) ?? null,
        feeInr: num(x.fee_inr),
      })),
    };
  } catch (error) {
    logError(error, { route: `quotaQueries:${id}:${level}` });
    return null;
  }
}

export const getQuotaOverview = (id: QuotaFamilyId, level: "ug" | "pg") =>
  unstable_cache(() => load(id, level), ["quota-overview", id, level], {
    revalidate: 86400,
    tags: ["closing-ranks"],
  })();
