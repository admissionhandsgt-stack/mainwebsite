/**
 * The chance view: what a signed-in, verified student sees in place of
 * closing ranks.
 *
 * Server only. The ranks are read here, turned into words (lib/chance.ts) and
 * an approximate fee bracket, and nothing numeric about a named college's cut
 * leaves this file. See lib/depth.ts for why ranks are staff-only.
 */

import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { userFromRequest, currentUser, type SiteUser } from "@/lib/userAuth";
import { approxFee, CHANCE_ORDER, type ChanceBand } from "@/lib/chance";

/** A verified account — proved by a code, not just a typed number. */
export async function optionsUser(request: Request): Promise<SiteUser | null> {
  const u = await userFromRequest(request);
  return u?.verified ? u : null;
}

export async function optionsUserServer(): Promise<SiteUser | null> {
  const u = await currentUser();
  return u?.verified ? u : null;
}

/**
 * How many different (rank, category) pairs one account may look at a day.
 * Enough to check a revised rank or a second category; far too few to walk the
 * boundaries of every college. More than that is a counsellor's conversation.
 */
export const DISTINCT_PER_DAY = 3;

export async function allowQuery(
  userId: number,
  q: { level: string; stream: string; rank: number; category: string },
): Promise<{ ok: true } | { ok: false; used: { rank: number; category: string }[] }> {
  const rows = (await db.execute(sql`
    SELECT DISTINCT rank, category FROM chance_queries
     WHERE user_id = ${userId} AND level = ${q.level} AND created_at > now() - interval '1 day'
  `)) as unknown as { rank: number; category: string }[];
  const seen = rows.some((r) => r.rank === q.rank && r.category === q.category);
  if (!seen && rows.length >= DISTINCT_PER_DAY) return { ok: false, used: rows };
  return { ok: true };
}

export async function logQuery(
  userId: number,
  q: { level: string; stream: string; rank: number; category: string; options: number },
) {
  await db.execute(sql`
    INSERT INTO chance_queries (user_id, level, stream, rank, category, options)
    VALUES (${userId}, ${q.level}, ${q.stream}, ${q.rank}, ${q.category}, ${q.options})
  `);
}

export interface ChanceRow {
  institute: string;
  instituteSlug: string;
  state: string | null;
  ownership: string | null;
  course: string;
  band: ChanceBand;
  feeInr: number | null;
}

export interface CollegeOption {
  name: string;
  slug: string;
  state: string | null;
  ownership: string | null;
  /** The best chance word any of its seats earns. */
  best: ChanceBand;
  /** How many seat options (course × quota) at each chance. */
  bands: Record<ChanceBand, number>;
  options: number;
  /** PG: each branch with its best chance. UG: empty. */
  branches: { name: string; best: ChanceBand }[];
  /** "≈ ₹5–10 L /yr*", or null when nothing is published. */
  fee: string | null;
}

/**
 * Rows → one entry per college, best chance first. A college's fee bracket
 * spans its own seats in this result only — the seats the student can reach,
 * not the dearest NRI seat they cannot.
 */
export function toOptions(rows: ChanceRow[], level: "ug" | "pg"): CollegeOption[] {
  const by = new Map<
    string,
    CollegeOption & { fees: number[]; branchBest: Map<string, ChanceBand> }
  >();
  for (const r of rows) {
    let c = by.get(r.instituteSlug);
    if (!c) {
      c = {
        name: r.institute,
        slug: r.instituteSlug,
        state: r.state,
        // UG ownership is "other" for every college in the source extract.
        ownership: r.ownership && r.ownership !== "other" ? r.ownership : null,
        best: r.band,
        bands: { safe: 0, likely: 0, possible: 0, stretch: 0 },
        options: 0,
        branches: [],
        fee: null,
        fees: [],
        branchBest: new Map(),
      };
      by.set(r.instituteSlug, c);
    }
    c.options += 1;
    c.bands[r.band] += 1;
    if (CHANCE_ORDER.indexOf(r.band) < CHANCE_ORDER.indexOf(c.best)) c.best = r.band;
    if (typeof r.feeInr === "number" && r.feeInr > 0) c.fees.push(r.feeInr);
    if (level === "pg") {
      const prev = c.branchBest.get(r.course);
      if (!prev || CHANCE_ORDER.indexOf(r.band) < CHANCE_ORDER.indexOf(prev)) c.branchBest.set(r.course, r.band);
    }
  }
  return [...by.values()]
    .map(({ fees, branchBest, ...c }) => ({
      ...c,
      fee: fees.length ? approxFee(Math.min(...fees), Math.max(...fees)) : null,
      branches: [...branchBest.entries()]
        .map(([name, best]) => ({ name, best }))
        .sort((a, b) => CHANCE_ORDER.indexOf(a.best) - CHANCE_ORDER.indexOf(b.best)),
    }))
    // Stable sort on the chance alone. Inside a chance the order is the one the
    // rows arrived in — tightest seat first, so the most sought-after college
    // the student reaches leads, which is how a counsellor reads a list.
    .sort((a, b) => CHANCE_ORDER.indexOf(a.best) - CHANCE_ORDER.indexOf(b.best));
}
