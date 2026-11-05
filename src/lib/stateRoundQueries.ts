/**
 * A state counselling's round for the year in progress (state_round_cuts, migration 0047), for the PG
 * state page's "this year so far" block.
 *
 * Kept apart from closing_ranks by the owner's rule (2026-11-04): the predictor does not read a year still
 * in progress. What this returns follows the chance-view rule like every public figure: group figures over
 * 3+ colleges (`groupRank`), never a college's own closing rank. The main figures are open merit: no
 * in-service seats (Rajasthan and others rank in-service candidates with a bonus), no disability or other
 * sub-category, no NRI merit list.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { groupRank } from "@/lib/chance";
import { branchSlug } from "@/lib/branchSlug";

const rows = <T,>(r: unknown) => r as unknown as T[];
const num = (v: unknown) => (v == null ? null : Number(v));

export interface StateRound {
  year: number;
  /** "Round 1" */
  round: string;
  roundPrinted: string;
  counselling: string;
  sourceUrl: string | null;
  /** The board's own word on the round's standing — a hold, a court order — with its notice. */
  note: string | null;
  noteUrl: string | null;
  colleges: number;
  /** Open merit, by quota: the tightest close and the last admitted, each over 3+ colleges. */
  byQuota: { quota: string; colleges: number; tightest: number | null; last: number | null }[];
  /** The quota most of the state's colleges fill, which the category and branch tables read. */
  mainQuota: string | null;
  byCategory: { category: string; colleges: number; last: number | null }[];
  byBranch: { course: string; slug: string | null; colleges: number; last: number | null }[];
}

// BC, BCM and SCA are Tamil Nadu's own reserved groups (2026-11-05; used by no other state loaded): Backward Classes,
// Backward Class Muslims and Scheduled Caste (Arunthathiyar). Rajasthan and TN both have an MBC list.
const CATEGORY_ORDER = ["GEN", "EWS", "OBC", "BC", "BCM", "MBC", "SC", "SCA", "ST"];
export const CATEGORY_LABEL: Record<string, string> = {
  GEN: "General (UR)", EWS: "EWS", OBC: "OBC", BC: "BC", BCM: "BC (Muslim)", MBC: "MBC", SC: "SC", SCA: "SC (Arunthathiyar)", ST: "ST",
};

/** A college is its institute when we matched one, else its name as printed. */
const COLLEGE = sql`COALESCE(c.institute_id::text, c.college_printed)`;
const OPEN_MERIT = sql`NOT c.pwd AND c.additional_category IS NULL AND NOT c.in_service AND c.closing_air > 0`;

export const getStateRound = unstable_cache(
  async (stateSlug: string): Promise<StateRound | null> => {
    const head = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT c.state_id, c.year, c.round, MIN(c.round_printed) AS round_printed, MIN(c.counselling) AS counselling,
               MIN(c.source_url) AS source_url, MIN(c.note) AS note, MIN(c.note_url) AS note_url,
               COUNT(DISTINCT ${COLLEGE})::int AS colleges
          FROM state_round_cuts c JOIN states s ON s.id = c.state_id
         WHERE s.slug = ${stateSlug} AND c.level = 'pg'
         GROUP BY c.state_id, c.year, c.round
         ORDER BY c.year DESC, c.round DESC
         LIMIT 1`),
    )[0];
    if (!head) return null;
    const stateId = Number(head.state_id);
    const year = Number(head.year);
    const round = String(head.round);
    const where = sql`c.state_id = ${stateId} AND c.level = 'pg' AND c.year = ${year} AND c.round = ${round}`;

    const byQuota = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT c.quota, COUNT(DISTINCT ${COLLEGE})::int AS colleges, MIN(c.closing_air)::int AS tightest, MAX(c.closing_air)::int AS last
          FROM state_round_cuts c
         WHERE ${where} AND c.category = 'GEN' AND ${OPEN_MERIT}
         GROUP BY c.quota
         ORDER BY COUNT(DISTINCT ${COLLEGE}) DESC, c.quota`),
    ).map((x) => {
      const colleges = Number(x.colleges);
      return { quota: String(x.quota), colleges, tightest: groupRank(num(x.tightest), colleges), last: groupRank(num(x.last), colleges) };
    });
    const mainQuota = byQuota[0]?.quota ?? null;

    const [cats, branches] = mainQuota
      ? await Promise.all([
          db.execute(sql`
            SELECT c.category, COUNT(DISTINCT ${COLLEGE})::int AS colleges, MAX(c.closing_air)::int AS last
              FROM state_round_cuts c
             WHERE ${where} AND c.quota = ${mainQuota} AND ${OPEN_MERIT}
             GROUP BY c.category`),
          db.execute(sql`
            SELECT COALESCE(co.name, c.course_printed) AS course, (co.id IS NOT NULL) AS ours,
                   COUNT(DISTINCT ${COLLEGE})::int AS colleges, MAX(c.closing_air)::int AS last
              FROM state_round_cuts c LEFT JOIN courses co ON co.id = c.course_id
             WHERE ${where} AND c.quota = ${mainQuota} AND c.category = 'GEN' AND ${OPEN_MERIT}
             GROUP BY 1, 2`),
        ])
      : [[], []];

    const byCategory = rows<Record<string, unknown>>(cats)
      .map((x) => {
        const colleges = Number(x.colleges);
        return { category: String(x.category), colleges, last: groupRank(num(x.last), colleges) };
      })
      .filter((x) => CATEGORY_ORDER.includes(x.category))
      .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

    const byBranch = rows<Record<string, unknown>>(branches)
      .map((x) => {
        const colleges = Number(x.colleges);
        const course = String(x.course);
        return { course, slug: x.ours ? branchSlug(course) : null, colleges, last: groupRank(num(x.last), colleges) };
      })
      // A branch at one or two colleges would be those colleges' own cut: it is left out, not shown blank.
      .filter((x) => x.last != null)
      .sort((a, b) => (a.last ?? 0) - (b.last ?? 0));

    // Nothing to show — one college (Goa), or no All India Rank printed (Punjab, Odisha until their merit
    // lists are joined): no round at all, so the page's title does not promise a round it cannot show.
    const shownQuota = byQuota.filter((q) => q.last != null);
    if (shownQuota.length === 0 && byBranch.length === 0) return null;

    return {
      year,
      round: /^R(\d+)$/.test(round) ? `Round ${round.slice(1)}` : round,
      roundPrinted: String(head.round_printed),
      counselling: String(head.counselling),
      sourceUrl: (head.source_url as string) ?? null,
      note: (head.note as string) ?? null,
      noteUrl: (head.note_url as string) ?? null,
      colleges: Number(head.colleges),
      byQuota: shownQuota,
      mainQuota,
      byCategory: byCategory.filter((c) => c.last != null),
      byBranch,
    };
  },
  ["state-round-v1"],
  { revalidate: 3600, tags: ["state-round", "seat-data"] },
);
