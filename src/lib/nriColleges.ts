/**
 * The colleges that offer NRI seats, read out of the counselling results.
 *
 * `/nri-quota/colleges` was eight hand-typed cards until 2026-10-18 — "AIIMS
 * Delhi, NRI ₹15–20 lakh a year, 7 seats" among them, at an institute that has
 * no NRI quota at all. Every college here is one whose NRI seat a counselling
 * authority actually allotted, by the same conservative rule as
 * `quotaQueries.ts`: the quota label has to say NRI.
 *
 * What is on the page and what is not:
 * - no closing rank, for anybody (the 2026-10-12 rule) — which colleges a rank
 *   reaches is the chance view after sign-in;
 * - MD/MS: the NRI seat's own published fee, as a bracket. Never another
 *   quota's fee. Authorities quote some per year and some for the whole course
 *   (`fees.fee_periodicity` is empty for every NRI row), so the page does not
 *   call it yearly;
 * - MBBS/BDS: no fee. The UG source never says which quota a fee block belongs
 *   to (see CLAUDE.md), and a guessed NRI fee is the most expensive guess to
 *   get wrong.
 */

import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { logError } from "@/lib/logger";
import { ugCourseOf } from "@/lib/seoTitle";

export type NriStream = "mbbs" | "bds" | "pg";
export const NRI_STREAMS: NriStream[] = ["mbbs", "bds", "pg"];

export interface NriCollege {
  name: string;
  slug: string;
  /** Where its own page lives. */
  href: string;
  state: string;
  /** MD/MS only — the UG extract records no ownership (CLAUDE.md, known gaps). */
  ownership: "private" | "deemed" | null;
  /** Who allots its NRI seats, readable: "MCC · deemed universities", "Karnataka · state counselling". */
  counsellings: string[];
  /** The authority's own quota labels, as printed. */
  quotas: string[];
  /** MD/MS: the branches with an NRI seat. MBBS/BDS: the one course. */
  courses: string[];
  /** NRI seat options — a seat × category × counselling row, not a count of seats. */
  options: number;
  minFee: number | null;
  maxFee: number | null;
}

export interface NriState {
  state: string;
  slug: string;
  colleges: NriCollege[];
}

export interface NriFeeSpread {
  colleges: number;
  p10Fee: number | null;
  medianFee: number | null;
  p90Fee: number | null;
}

export interface NriStreamData {
  stream: NriStream;
  colleges: number;
  options: number;
  states: NriState[];
  /** MD/MS: colleges by who owns them. */
  privateCount: number;
  deemedCount: number;
  /** MD/MS: per-seat fee spread across every NRI option — p10/p90 for print, min/max kept for the record. */
  minFee: number | null;
  p10Fee: number | null;
  medianFee: number | null;
  p90Fee: number | null;
  maxFee: number | null;
  /** Colleges per counselling, most first. */
  byCounselling: { label: string; colleges: number }[];
  /** MD/MS: the fee spread at private colleges and at deemed universities, separately. */
  byOwnership: Partial<Record<"private" | "deemed", NriFeeSpread>>;
}

export interface NriCollegeData {
  year: number | null;
  streams: Record<NriStream, NriStreamData>;
  /** MBBS colleges whose NRI seat is labelled a government one ("Govt. NRI" — Haryana's label). */
  govtNriColleges: number;
  govtNriCounselling: string | null;
}

const rows = <T,>(r: unknown) => r as unknown as T[];
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** "TEL Mgmt PG" means nothing to a parent; the state it belongs to does. */
function counsellingLabel(name: string, stateGroup: string | null): string {
  if (!stateGroup || stateGroup === "Central") {
    return /deemed/i.test(name) ? "MCC · deemed universities" : "MCC · All India";
  }
  return /mgmt|management/i.test(name) ? `${stateGroup} · management counselling` : `${stateGroup} · state counselling`;
}

function streamOf(level: string, course: string, college: string): NriStream | null {
  if (level === "pg") return "pg";
  // MBBS rows filed under a dental or homoeopathy college are the source's
  // misfiling (CLAUDE.md, known gaps) — the college's own name wins.
  if (course === "MBBS") return ugCourseOf(college) === "MBBS" ? "mbbs" : null;
  if (course === "BDS") return "bds";
  return null;
}

async function load(): Promise<NriCollegeData | null> {
  try {
    const [raw, spread] = await Promise.all([
      db.execute(sql`
        SELECT so.level::text AS level, i.name, i.slug, COALESCE(st.name, '') AS state,
               i.ownership::text AS ownership, c.name AS course,
               COALESCE(cn.name, '') AS counselling, cn.state_group,
               string_agg(DISTINCT q.label, '|') AS quotas,
               COUNT(*)::int AS options,
               MIN(NULLIF(so.fee_inr, 0))::bigint AS min_fee,
               MAX(NULLIF(so.fee_inr, 0))::bigint AS max_fee,
               MAX(so.latest_year)::int AS year
          FROM seat_options so
          JOIN quotas q ON q.id = so.quota_id
          JOIN institutes i ON i.id = so.institute_id
          JOIN courses c ON c.id = so.course_id
          LEFT JOIN states st ON st.id = i.state_id
          LEFT JOIN counsellings cn ON cn.id = so.counselling_id
         WHERE q.label ILIKE '%NRI%'
           AND (so.level = 'pg' OR c.name IN ('MBBS', 'BDS'))
         GROUP BY so.level, i.name, i.slug, st.name, i.ownership, c.name, cn.name, cn.state_group
      `),
      // The fee spread per seat option, not per college: the median is "the
      // middle NRI seat", which is what somebody budgeting for one wants. The
      // ROLLUP row (ownership NULL) is the whole of MD/MS.
      db.execute(sql`
        SELECT i.ownership::text AS ownership,
               COUNT(DISTINCT so.institute_id)::int AS colleges,
               MIN(NULLIF(so.fee_inr, 0))::bigint AS min_fee,
               PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY NULLIF(so.fee_inr, 0))::bigint AS p10_fee,
               PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY NULLIF(so.fee_inr, 0))::bigint AS median_fee,
               PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY NULLIF(so.fee_inr, 0))::bigint AS p90_fee,
               MAX(NULLIF(so.fee_inr, 0))::bigint AS max_fee
          FROM seat_options so
          JOIN quotas q ON q.id = so.quota_id
          JOIN institutes i ON i.id = so.institute_id
         WHERE so.level = 'pg' AND q.label ILIKE '%NRI%'
         GROUP BY ROLLUP (i.ownership)
      `),
    ]);

    const list = rows<Record<string, unknown>>(raw);
    if (list.length === 0) return null;
    const num = (v: unknown) => (v == null ? null : Number(v));

    const byStream = new Map<NriStream, Map<string, NriCollege>>(NRI_STREAMS.map((s) => [s, new Map()]));
    const counsellingCount = new Map<NriStream, Map<string, Set<string>>>(NRI_STREAMS.map((s) => [s, new Map()]));
    const govt = new Set<string>();
    const govtCounselling = new Set<string>();
    let year: number | null = null;

    for (const r of list) {
      const level = r.level as string;
      const name = r.name as string;
      const course = r.course as string;
      const stream = streamOf(level, course, name);
      if (!stream) continue;

      const slug = r.slug as string;
      const label = counsellingLabel(r.counselling as string, (r.state_group as string) ?? null);
      const quotas = String(r.quotas ?? "").split("|").filter(Boolean);
      year = Math.max(year ?? 0, (r.year as number) ?? 0) || year;

      if (stream === "mbbs" && quotas.some((q) => /^govt\.? ?nri$/i.test(q))) {
        govt.add(slug);
        govtCounselling.add((r.state_group as string) ?? "");
      }

      const colleges = byStream.get(stream)!;
      const own = r.ownership as string;
      const c =
        colleges.get(slug) ??
        ({
          name,
          slug,
          href: level === "pg" ? `/md-ms-india/colleges/${slug}` : `/mbbs-india/colleges/${slug}`,
          state: (r.state as string) || "Other",
          ownership: level === "pg" && (own === "private" || own === "deemed") ? own : null,
          counsellings: [],
          quotas: [],
          courses: [],
          options: 0,
          minFee: null,
          maxFee: null,
        } satisfies NriCollege);

      if (!c.counsellings.includes(label)) c.counsellings.push(label);
      for (const q of quotas) if (!c.quotas.includes(q)) c.quotas.push(q);
      if (!c.courses.includes(course)) c.courses.push(course);
      c.options += (r.options as number) ?? 0;
      const lo = num(r.min_fee);
      const hi = num(r.max_fee);
      if (stream === "pg") {
        if (lo != null) c.minFee = c.minFee == null ? lo : Math.min(c.minFee, lo);
        if (hi != null) c.maxFee = c.maxFee == null ? hi : Math.max(c.maxFee, hi);
      }
      colleges.set(slug, c);

      const cc = counsellingCount.get(stream)!;
      cc.set(label, (cc.get(label) ?? new Set()).add(slug));
    }

    const spreadRows = rows<Record<string, unknown>>(spread);
    const s = spreadRows.find((r) => r.ownership == null) ?? {};
    const feeSpread = (r: Record<string, unknown>): NriFeeSpread => ({
      colleges: Number(r.colleges ?? 0),
      p10Fee: num(r.p10_fee),
      medianFee: num(r.median_fee),
      p90Fee: num(r.p90_fee),
    });
    const byOwnership: NriStreamData["byOwnership"] = {};
    for (const r of spreadRows) {
      if (r.ownership === "private" || r.ownership === "deemed") byOwnership[r.ownership] = feeSpread(r);
    }
    const streams = Object.fromEntries(
      NRI_STREAMS.map((stream) => {
        const all = [...byStream.get(stream)!.values()];
        for (const c of all) c.courses.sort();
        const states = new Map<string, NriCollege[]>();
        for (const c of all) states.set(c.state, [...(states.get(c.state) ?? []), c]);
        const grouped: NriState[] = [...states.entries()]
          .map(([state, colleges]) => ({
            state,
            slug: slugify(state),
            colleges: colleges.sort((a, b) => a.name.localeCompare(b.name)),
          }))
          .sort((a, b) => b.colleges.length - a.colleges.length || a.state.localeCompare(b.state));
        const data: NriStreamData = {
          stream,
          colleges: all.length,
          options: all.reduce((a, c) => a + c.options, 0),
          states: grouped,
          privateCount: all.filter((c) => c.ownership === "private").length,
          deemedCount: all.filter((c) => c.ownership === "deemed").length,
          minFee: stream === "pg" ? num(s.min_fee) : null,
          p10Fee: stream === "pg" ? num(s.p10_fee) : null,
          medianFee: stream === "pg" ? num(s.median_fee) : null,
          p90Fee: stream === "pg" ? num(s.p90_fee) : null,
          maxFee: stream === "pg" ? num(s.max_fee) : null,
          byCounselling: [...counsellingCount.get(stream)!.entries()]
            .map(([label, set]) => ({ label, colleges: set.size }))
            .sort((a, b) => b.colleges - a.colleges || a.label.localeCompare(b.label)),
          byOwnership: stream === "pg" ? byOwnership : {},
        };
        return [stream, data];
      }),
    ) as Record<NriStream, NriStreamData>;

    return {
      year,
      streams,
      govtNriColleges: govt.size,
      govtNriCounselling: govtCounselling.size === 1 ? [...govtCounselling][0] || null : null,
    };
  } catch (error) {
    logError(error, { route: "nriColleges" });
    return null;
  }
}

export const getNriColleges = unstable_cache(load, ["nri-colleges-v2"], {
  revalidate: 86400,
  tags: ["closing-ranks"],
});
