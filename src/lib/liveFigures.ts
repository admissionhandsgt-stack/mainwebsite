/**
 * Live figures for CMS copy (2026-10-18).
 *
 * The MBBS page said "1 lakh+ seats", "380+ government colleges", "55,000+
 * government seats", "750+ colleges" and "₹10K–₹50K a year at government
 * colleges" — typed once, in code and in content_blocks, and wrong by the time
 * anyone read them (NMC lists 834 colleges and 1,40,314 seats). The PG FAQ said
 * most private colleges pay no stipend, when the median private stipend we hold
 * is over ₹57,000 a month.
 *
 * Now CMS text can carry `{tokens}` and the page fills them from the data:
 * NMC's register for colleges and seats, the fee tables for fees and stipends.
 * The admin keeps the words; the numbers stay current. `fillLive()` leaves an
 * unknown token untouched, so a typo is visible rather than silently blank.
 *
 * Tokens (all strings, formatted for prose):
 *   mbbs_colleges, mbbs_seats, mbbs_seats_lakh, govt_mbbs_colleges, govt_mbbs_seats,
 *   private_mbbs_colleges, private_mbbs_seats, md_ms_seats, md_ms_colleges, ss_seats,
 *   nmc_date, top_state_1 … top_state_5,
 *   govt_mbbs_fee, govt_mbbs_fee_median, private_mbbs_fee, private_mbbs_fee_median,
 *   deemed_mbbs_fee, deemed_mbbs_fee_median,
 *   govt_pg_fee, govt_pg_fee_median, private_pg_fee, private_pg_fee_median,
 *   deemed_pg_fee, deemed_pg_fee_median,
 *   pg_stipend_median, pg_stipend_range, govt_stipend_median, private_stipend_median, stipend_colleges,
 *   closing_ranks_lakh,
 *   nmc_colleges (every college on NMC's register), md_ms_only_colleges (MD or MS, no diploma-only),
 *   md_ms_only_seats, mcc_year, mcc_seats, aiq_colleges, aiq_seats, deemed_pg_colleges, deemed_pg_seats,
 *   dnb_hospitals, dnb_seats (MCC's latest PG seat matrix, counted matrix by matrix — never summed
 *   across matrices into a college total: a hospital with MD/MS and DNB seats is in two of them)
 *
 * Fee and stipend ranges are the middle 80% (10th–90th percentile), never
 * min–max: the extremes of published fees hold slips. A government college's
 * MBBS fee is its lowest published fee (its other blocks are NRI or
 * management seats); a private or deemed college's is every fee block it
 * publishes, because which one applies depends on the quota.
 */

import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { logError } from "@/lib/logger";

export type LiveFigures = Record<string, string>;

const rowsOf = <T,>(r: unknown) => r as unknown as T[];
const inr = (v: number) => Math.round(v).toLocaleString("en-IN");

/** "₹9,000", "₹1.24 lakh", "₹15 lakh", "₹1.2 crore". */
export function rupees(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 10_000_000) return `₹${+(v / 10_000_000).toFixed(2)} crore`;
  if (v >= 100_000) return `₹${+(v / 100_000).toFixed(v >= 1_000_000 ? 1 : 2)} lakh`;
  return `₹${inr(Math.round(v / 100) * 100)}`;
}
const range = (lo: number | null, hi: number | null) => (lo != null && hi != null ? `${rupees(lo)} – ${rupees(hi)}` : "—");
const lakh = (v: number) => `${+(v / 100_000).toFixed(1)} lakh`;

/** What the copy says when the data cannot be read — true statements, just less exact. */
const FALLBACK: LiveFigures = {
  mbbs_colleges: "over 800",
  mbbs_seats: "over 1.2 lakh",
  mbbs_seats_lakh: "over 1.2 lakh",
  govt_mbbs_colleges: "over 400",
  private_mbbs_colleges: "over 350",
  nmc_colleges: "over 900",
  md_ms_only_colleges: "over 600",
  nmc_date: "its latest update",
};

const p = (arr: unknown, i: number) => (Array.isArray(arr) && arr[i] != null ? Number(arr[i]) : null);

async function load(): Promise<LiveFigures> {
  const latest = sql`f.year = (SELECT MAX(f2.year) FROM fees f2 WHERE f2.institute_id = f.institute_id AND f2.level = f.level)`;
  const deemedUg = sql`(SELECT DISTINCT so.institute_id FROM seat_options so JOIN counsellings cn ON cn.id = so.counselling_id WHERE cn.name = 'Deemed UG')`;
  const nmcMbbs = sql`JOIN nmc_institutes m ON m.institute_id = f.institute_id
                      JOIN nmc_courses nc ON nc.college_code = m.college_code AND nc.course_type = 'M.B.B.S.'`;

  const [nmc, states, types, govtUg, privateUg, deemedUgFees, pgFees, stipend, ranks, register, mcc] = await Promise.all([
    db.execute(sql`
      SELECT management_type AS m, COUNT(*)::int AS colleges, COALESCE(SUM(approved_seat), 0)::int AS seats,
             MAX(nmc_updated)::text AS updated
        FROM nmc_courses WHERE course_type = 'M.B.B.S.' GROUP BY ROLLUP (management_type)`),
    db.execute(sql`
      SELECT state_name AS s FROM nmc_courses WHERE course_type = 'M.B.B.S.'
       GROUP BY state_name ORDER BY SUM(approved_seat) DESC NULLS LAST LIMIT 5`),
    db.execute(sql`
      SELECT CASE WHEN course_type IN ('MD', 'MS', 'Diploma') THEN 'pg' ELSE 'ss' END AS k,
             COUNT(DISTINCT college_code)::int AS colleges, COALESCE(SUM(approved_seat), 0)::int AS seats
        FROM nmc_courses WHERE course_type IN ('MD', 'MS', 'Diploma', 'DM', 'M.Ch.') GROUP BY 1`),
    db.execute(sql`
      WITH g AS (
        SELECT f.institute_id, MIN(f.fee_inr) FILTER (WHERE f.fee_inr > 1000) AS fee
          FROM fees f JOIN courses c ON c.id = f.course_id ${nmcMbbs}
         WHERE f.level = 'ug' AND c.name = 'MBBS' AND nc.management_type = 'Government' AND ${latest}
         GROUP BY f.institute_id)
      SELECT PERCENTILE_CONT(ARRAY[0.1, 0.5, 0.9]) WITHIN GROUP (ORDER BY fee) AS p FROM g WHERE fee IS NOT NULL`),
    db.execute(sql`
      SELECT PERCENTILE_CONT(ARRAY[0.1, 0.5, 0.9]) WITHIN GROUP (ORDER BY f.fee_inr) AS p
        FROM fees f JOIN courses c ON c.id = f.course_id ${nmcMbbs}
       WHERE f.level = 'ug' AND c.name = 'MBBS' AND nc.management_type <> 'Government' AND f.fee_inr > 1000
         AND f.institute_id NOT IN ${deemedUg} AND ${latest}`),
    db.execute(sql`
      SELECT PERCENTILE_CONT(ARRAY[0.1, 0.5, 0.9]) WITHIN GROUP (ORDER BY f.fee_inr) AS p
        FROM fees f JOIN courses c ON c.id = f.course_id
       WHERE f.level = 'ug' AND c.name = 'MBBS' AND f.fee_inr > 1000 AND f.institute_id IN ${deemedUg} AND ${latest}`),
    db.execute(sql`
      SELECT i.ownership::text AS o, PERCENTILE_CONT(ARRAY[0.1, 0.5, 0.9]) WITHIN GROUP (ORDER BY NULLIF(so.fee_inr, 0)) AS p
        FROM seat_options so JOIN institutes i ON i.id = so.institute_id
       WHERE so.level = 'pg' AND NULLIF(so.fee_inr, 0) IS NOT NULL AND i.ownership IN ('government', 'private', 'deemed')
       GROUP BY 1`),
    db.execute(sql`
      WITH s AS (
        SELECT DISTINCT ON (f.institute_id) f.institute_id, i.ownership::text AS o, f.stipend_y1_inr AS v
          FROM fees f JOIN institutes i ON i.id = f.institute_id
         WHERE f.level = 'pg' AND f.stipend_y1_inr > 0 AND f.stipend_periodicity = 'per_month'
         ORDER BY f.institute_id, f.year DESC, f.stipend_y1_inr DESC)
      SELECT CASE WHEN o = 'government' THEN 'govt' ELSE 'private' END AS k, COUNT(*)::int AS n,
             PERCENTILE_CONT(ARRAY[0.1, 0.5, 0.9]) WITHIN GROUP (ORDER BY v) AS p
        FROM s GROUP BY ROLLUP (1)`),
    db.execute(sql`SELECT COUNT(*)::int AS n FROM closing_ranks`),
    db.execute(sql`
      SELECT COUNT(DISTINCT college_code)::int AS colleges,
             COUNT(DISTINCT college_code) FILTER (WHERE course_type IN ('MD', 'MS'))::int AS md_ms,
             COALESCE(SUM(approved_seat) FILTER (WHERE course_type IN ('MD', 'MS')), 0)::int AS md_ms_seats
        FROM nmc_courses`),
    db.execute(sql`
      SELECT seat_matrix AS m, MAX(year)::int AS year, COUNT(DISTINCT mcc_institute_code)::int AS colleges,
             COALESCE(SUM(total_seats), 0)::int AS seats
        FROM mcc_seat_matrix WHERE year = (SELECT MAX(year) FROM mcc_seat_matrix)
       GROUP BY ROLLUP (seat_matrix)`),
  ]);

  const out: LiveFigures = {};
  const nm = rowsOf<{ m: string | null; colleges: number; seats: number; updated: string | null }>(nmc);
  const all = nm.find((r) => r.m == null);
  const govt = nm.find((r) => r.m === "Government");
  const priv = nm.filter((r) => r.m != null && r.m !== "Government");
  if (all && all.colleges > 600) {
    out.mbbs_colleges = inr(all.colleges);
    out.mbbs_seats = inr(all.seats);
    out.mbbs_seats_lakh = lakh(all.seats);
    if (all.updated) {
      out.nmc_date = new Date(`${all.updated}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    }
  }
  if (govt) {
    out.govt_mbbs_colleges = inr(govt.colleges);
    out.govt_mbbs_seats = inr(govt.seats);
  }
  if (priv.length) {
    out.private_mbbs_colleges = inr(priv.reduce((a, r) => a + r.colleges, 0));
    out.private_mbbs_seats = inr(priv.reduce((a, r) => a + r.seats, 0));
  }
  rowsOf<{ s: string }>(states).forEach((r, i) => (out[`top_state_${i + 1}`] = r.s));
  for (const t of rowsOf<{ k: string; colleges: number; seats: number }>(types)) {
    if (t.k === "pg") {
      out.md_ms_seats = inr(t.seats);
      out.md_ms_colleges = inr(t.colleges);
    } else out.ss_seats = inr(t.seats);
  }

  const put = (key: string, arr: unknown) => {
    const lo = p(arr, 0);
    const mid = p(arr, 1);
    const hi = p(arr, 2);
    if (lo == null || hi == null) return;
    out[key] = range(lo, hi);
    out[`${key}_median`] = rupees(mid);
  };
  put("govt_mbbs_fee", rowsOf<{ p: unknown }>(govtUg)[0]?.p);
  put("private_mbbs_fee", rowsOf<{ p: unknown }>(privateUg)[0]?.p);
  put("deemed_mbbs_fee", rowsOf<{ p: unknown }>(deemedUgFees)[0]?.p);
  for (const r of rowsOf<{ o: string; p: unknown }>(pgFees)) {
    const key = r.o === "government" ? "govt_pg_fee" : r.o === "private" ? "private_pg_fee" : "deemed_pg_fee";
    put(key, r.p);
  }
  for (const r of rowsOf<{ k: string | null; n: number; p: unknown }>(stipend)) {
    if (r.k == null) {
      out.pg_stipend_median = rupees(p(r.p, 1));
      out.pg_stipend_range = range(p(r.p, 0), p(r.p, 2));
      out.stipend_colleges = inr(r.n);
    } else if (r.k === "govt") out.govt_stipend_median = rupees(p(r.p, 1));
    else out.private_stipend_median = rupees(p(r.p, 1));
  }
  const cr = rowsOf<{ n: number }>(ranks)[0]?.n;
  if (cr) out.closing_ranks_lakh = lakh(cr);

  const reg = rowsOf<{ colleges: number; md_ms: number; md_ms_seats: number }>(register)[0];
  if (reg && reg.colleges > 600) {
    out.nmc_colleges = inr(reg.colleges);
    out.md_ms_only_colleges = inr(reg.md_ms);
    out.md_ms_only_seats = inr(reg.md_ms_seats);
  }
  for (const r of rowsOf<{ m: string | null; year: number; colleges: number; seats: number }>(mcc)) {
    if (r.m == null) {
      out.mcc_year = String(r.year);
      out.mcc_seats = inr(r.seats);
    } else if (r.m === "AIQ") {
      out.aiq_colleges = inr(r.colleges);
      out.aiq_seats = inr(r.seats);
    } else if (r.m === "Deemed") {
      out.deemed_pg_colleges = inr(r.colleges);
      out.deemed_pg_seats = inr(r.seats);
    } else if (r.m === "DNB") {
      out.dnb_hospitals = inr(r.colleges);
      out.dnb_seats = inr(r.seats);
    }
  }
  return out;
}

const cached = unstable_cache(load, ["live-figures-v2"], { revalidate: 3600, tags: ["nmc", "closing-ranks", "mcc"] });

export async function getLiveFigures(): Promise<LiveFigures> {
  try {
    return { ...FALLBACK, ...(await cached()) };
  } catch (error) {
    logError(error, { route: "liveFigures" });
    return FALLBACK;
  }
}

/** Fills `{token}`s; an unknown token is left as written, so it shows up in review. */
export function fillLive(text: string, f: LiveFigures): string {
  return text.replace(/\{([a-z0-9_]+)\}/g, (whole, key: string) => f[key] ?? whole);
}
