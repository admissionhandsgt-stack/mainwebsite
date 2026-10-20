/**
 * Admin → Data sync: what the NMC register holds, how much of it is matched to
 * our colleges, and the colleges a person still has to match (2026-10-18).
 * Server only. The sync itself is lib/nmcSync.ts.
 */

import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { bestNameScore, stateKey } from "@/lib/nmcSync";
import { ugCourseOf } from "@/lib/seoTitle";

const rowsOf = <T,>(r: unknown) => r as unknown as T[];

export interface NmcRun {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: "running" | "ok" | "failed";
  rows: number | null;
  colleges: number | null;
  seats: number | null;
  matched: number | null;
  error: string | null;
  triggered_by: string | null;
}

export interface Suggestion {
  instituteId: number;
  name: string;
  score: number;
}

export interface Unmatched {
  code: string;
  name: string;
  state: string | null;
  level: "ug" | "pg";
  seats: number | null;
  management: string | null;
  suggestions: Suggestion[];
}

export interface NmcStatus {
  runs: NmcRun[];
  totals: { rows: number; colleges: number; mbbsColleges: number; mbbsSeats: number; updated: string | null };
  byManagement: { management: string; colleges: number; seats: number }[];
  coverage: { ugMatched: number; ugTotal: number; pgMatched: number; pgTotal: number };
  unmatched: Unmatched[];
  decided: { id: number; code: string; name: string; institute: string | null; method: string; level: string | null }[];
}

// NMC's course types for what NEET PG fills — see PG_COURSE_TYPES in nmcSync.ts.
const PG = sql`course_type IN ('MD', 'MS', 'Diploma')`;

export async function nmcStatus(): Promise<NmcStatus> {
  const [runs, totals, byManagement, colleges, maps, candidates] = await Promise.all([
    db.execute(sql`SELECT * FROM nmc_sync_runs ORDER BY id DESC LIMIT 8`),
    db.execute(sql`
      SELECT COUNT(*)::int AS rows, COUNT(DISTINCT college_code)::int AS colleges,
             COUNT(DISTINCT college_code) FILTER (WHERE course_name = 'M.B.B.S.')::int AS mbbs_colleges,
             COALESCE(SUM(approved_seat) FILTER (WHERE course_name = 'M.B.B.S.'), 0)::int AS mbbs_seats,
             MAX(nmc_updated)::text AS updated
        FROM nmc_courses`),
    db.execute(sql`
      SELECT COALESCE(management_type, 'Not stated') AS management, COUNT(*)::int AS colleges,
             COALESCE(SUM(approved_seat), 0)::int AS seats
        FROM nmc_courses WHERE course_name = 'M.B.B.S.'
       GROUP BY 1 ORDER BY 2 DESC`),
    db.execute(sql`
      SELECT college_code AS code, MIN(college_name) AS name, MIN(state_name) AS state,
             MIN(management_type) AS management,
             MAX(approved_seat) FILTER (WHERE course_name = 'M.B.B.S.') AS mbbs_seats,
             BOOL_OR(course_name = 'M.B.B.S.') AS has_mbbs,
             BOOL_OR(${PG}) AS has_pg,
             COALESCE(SUM(approved_seat) FILTER (WHERE ${PG}), 0)::int AS pg_seats
        FROM nmc_courses GROUP BY college_code`),
    db.execute(sql`
      SELECT m.id, m.college_code AS code, m.method, m.institute_id, i.name AS institute,
             COALESCE(i.level::text, m.level) AS level
        FROM nmc_institutes m LEFT JOIN institutes i ON i.id = m.institute_id`),
    db.execute(sql`
      SELECT i.id, i.name, i.level::text AS level, COALESCE(st.name, '') AS state,
             EXISTS (SELECT 1 FROM seat_options so JOIN courses c ON c.id = so.course_id
                      WHERE so.institute_id = i.id AND c.name = 'MBBS') AS mbbs
        FROM institutes i LEFT JOIN states st ON st.id = i.state_id
       WHERE i.level IN ('ug', 'pg')`),
  ]);

  const t = rowsOf<Record<string, unknown>>(totals)[0] ?? {};
  const cs = rowsOf<{
    code: string;
    name: string;
    state: string | null;
    management: string | null;
    mbbs_seats: number | null;
    has_mbbs: boolean;
    has_pg: boolean;
    pg_seats: number;
  }>(colleges);
  const ms = rowsOf<{ id: number; code: string; method: string; institute_id: number | null; institute: string | null; level: string | null }>(maps);
  const cands = rowsOf<{ id: number; name: string; level: "ug" | "pg"; state: string; mbbs: boolean }>(candidates).filter(
    (c) => c.level === "pg" || (c.mbbs && ugCourseOf(c.name) === "MBBS"),
  );

  const closed = new Set<string>();
  const usedInstitutes = new Set<number>();
  for (const m of ms) {
    if (m.institute_id) usedInstitutes.add(m.institute_id);
    // "None of ours" closes the level it names; one naming none closes both.
    if (m.level) closed.add(`${m.code}|${m.level}`);
    else if (m.method === "admin-none") {
      closed.add(`${m.code}|ug`);
      closed.add(`${m.code}|pg`);
    }
  }

  // The sync's own state key, so a spelling it treats as one state (Chattisgarh /
  // Chhattisgarh) is one state here too.
  const byState = new Map<string, typeof cands>();
  for (const c of cands) {
    if (usedInstitutes.has(c.id)) continue;
    const k = stateKey(c.state);
    byState.set(k, [...(byState.get(k) ?? []), c]);
  }

  const unmatched: Unmatched[] = [];
  for (const c of cs) {
    for (const level of ["ug", "pg"] as const) {
      if (level === "ug" ? !c.has_mbbs : !c.has_pg) continue;
      if (closed.has(`${c.code}|${level}`)) continue;
      const pool = (byState.get(stateKey(c.state)) ?? []).filter((x) => x.level === level);
      const suggestions = pool
        .map((x) => ({ instituteId: x.id, name: x.name, score: Math.round(bestNameScore(c.name, x.name) * 100) / 100 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .filter((s) => s.score > 0.15);
      unmatched.push({
        code: c.code,
        name: c.name,
        state: c.state,
        level,
        seats: level === "ug" ? c.mbbs_seats : c.pg_seats,
        management: c.management,
        suggestions,
      });
    }
  }
  unmatched.sort((a, b) => (b.suggestions[0]?.score ?? 0) - (a.suggestions[0]?.score ?? 0));

  const ugTotal = cs.filter((c) => c.has_mbbs).length;
  const pgTotal = cs.filter((c) => c.has_pg).length;
  const nameOf = new Map(cs.map((c) => [c.code, c.name]));
  return {
    runs: rowsOf<NmcRun>(runs),
    totals: {
      rows: Number(t.rows ?? 0),
      colleges: Number(t.colleges ?? 0),
      mbbsColleges: Number(t.mbbs_colleges ?? 0),
      mbbsSeats: Number(t.mbbs_seats ?? 0),
      updated: (t.updated as string) ?? null,
    },
    byManagement: rowsOf<{ management: string; colleges: number; seats: number }>(byManagement),
    coverage: {
      ugMatched: ugTotal - unmatched.filter((u) => u.level === "ug").length,
      ugTotal,
      pgMatched: pgTotal - unmatched.filter((u) => u.level === "pg").length,
      pgTotal,
    },
    unmatched,
    decided: ms
      .filter((m) => m.method !== "auto")
      .map((m) => ({ id: m.id, code: m.code, name: nameOf.get(m.code) ?? m.code, institute: m.institute, method: m.method, level: m.level })),
  };
}

/** A person's decision: this NMC college is that institute (replacing any pairing either had at that level). */
export async function mapNmc(code: string, instituteId: number) {
  await db.transaction(async (tx) => {
    const inst = rowsOf<{ level: string }>(await tx.execute(sql`SELECT level::text AS level FROM institutes WHERE id = ${instituteId}`))[0];
    if (!inst) throw new Error("No such institute");
    await tx.execute(sql`DELETE FROM nmc_institutes WHERE institute_id = ${instituteId}`);
    await tx.execute(sql`
      DELETE FROM nmc_institutes m USING institutes i
       WHERE m.institute_id = i.id AND m.college_code = ${code} AND i.level::text = ${inst.level}`);
    await tx.execute(sql`INSERT INTO nmc_institutes (college_code, institute_id, method) VALUES (${code}, ${instituteId}, 'admin')`);
  });
}

/**
 * A person's decision: at this level the NMC college is none of our institutes — stop
 * suggesting it there. The other level is left to its own pairing (migration 0037).
 */
export async function markNmcNone(code: string, level: "ug" | "pg") {
  await db.execute(sql`
    INSERT INTO nmc_institutes (college_code, institute_id, method, level)
    SELECT ${code}, NULL, 'admin-none', ${level}
     WHERE NOT EXISTS (SELECT 1 FROM nmc_institutes WHERE college_code = ${code} AND method = 'admin-none' AND level = ${level})`);
}

/** Undo one decision (or one automatic pairing). The next sync may pair it again automatically. */
export async function unmapNmc(id: number) {
  await db.execute(sql`DELETE FROM nmc_institutes WHERE id = ${id}`);
}

/** Our institutes whose name contains the text — for matching by hand when no suggestion is right. */
export async function findInstitutes(q: string, level: "ug" | "pg") {
  const like = `%${q.replace(/[%_\\]/g, "").trim()}%`;
  if (like.length < 5) return [];
  return rowsOf<{ id: number; name: string; state: string | null }>(
    await db.execute(sql`
      SELECT i.id, i.name, st.name AS state
        FROM institutes i LEFT JOIN states st ON st.id = i.state_id
       WHERE i.level = ${level} AND i.name ILIKE ${like}
       ORDER BY i.name LIMIT 12`),
  );
}
