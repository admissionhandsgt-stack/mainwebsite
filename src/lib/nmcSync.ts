/**
 * Syncs the National Medical Commission's college-and-course register (2026-10-18).
 *
 * Source: NMC's public search, nmc.org.in/information-desk-college-and-course-search
 * (robots.txt allows it). One request per 500 rows, a pause between pages; the
 * whole register is ~11,600 rows — every MBBS, MD/MS, diploma and DM/MCh course at
 * every college NMC lists, with its approved seats, ownership, university,
 * founding year and recognition status.
 *
 * A sync replaces the register in one transaction, and only after the fetch passes
 * sanity checks — a half-read NMC (a timeout on page 9) must never blank the
 * facts on 2,000 college pages. Then it re-matches NMC colleges to our
 * institutes, keeping every mapping a person made in the admin.
 *
 * Server only (database + outbound fetch). Called from POST /api/admin/nmc-sync
 * and the weekly cron, never from a page render.
 */

import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { logError } from "@/lib/logger";
import { ugCourseOf } from "@/lib/seoTitle";

const SEARCH = "https://nmc.org.in/information-desk-college-and-course-search/search";
const PER_PAGE = 500;
const UA = "Mozilla/5.0 (compatible; AdmissionHandsBot/1.0; +https://www.admissionhands.com)";

export interface NmcRow {
  college_code: string;
  course_name: string;
  course_type: string | null;
  college_id: number | null;
  college_name: string;
  state_name: string | null;
  university_name: string | null;
  management_type: string | null;
  inception_year: number | null;
  approved_seat: number | null;
  previous_approved_seat: number | null;
  recognition_status: string | null;
  remark: string | null;
  lop_date: string | null;
  approval_date: string | null;
  updated_date: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const int = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Math.round(Number(v)));
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

async function fetchPage(page: number) {
  let last: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${SEARCH}?page=${page}&per_page=${PER_PAGE}`, {
        headers: { "user-agent": UA, accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) throw new Error(`NMC answered ${res.status} for page ${page}`);
      const j = (await res.json()) as {
        success?: boolean;
        data?: Record<string, unknown>[];
        pagination?: { last_page?: number; total?: number };
      };
      if (!j?.success || !Array.isArray(j.data)) throw new Error(`NMC page ${page} did not have the expected shape`);
      return { rows: j.data, lastPage: Number(j.pagination?.last_page ?? page), total: Number(j.pagination?.total ?? 0) };
    } catch (e) {
      last = e;
      await sleep(4000 * attempt);
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

/** Every row of the register, deduplicated on (college, course). */
export async function fetchRegister(): Promise<NmcRow[]> {
  const first = await fetchPage(1);
  const raw = [...first.rows];
  for (let p = 2; p <= first.lastPage; p++) {
    await sleep(800);
    raw.push(...(await fetchPage(p)).rows);
  }
  const seen = new Map<string, NmcRow>();
  for (const r of raw) {
    const code = str(r.college_code);
    const course = str(r.course_name);
    const name = str(r.college_name);
    if (!code || !course || !name) continue;
    seen.set(`${code}|${course}`, {
      college_code: code,
      course_name: course,
      course_type: str(r.course_type),
      college_id: int(r.college_id),
      college_name: name,
      state_name: str(r.state_name),
      university_name: str(r.university_name),
      management_type: str(r.management_type),
      inception_year: int(r.inception_year ?? r.year_of_inception_of_college),
      approved_seat: int(r.approved_seat),
      previous_approved_seat: int(r.previous_approved_seat),
      recognition_status: str(r.recognition_status),
      remark: str(r.remark),
      lop_date: date(r.lop_date),
      approval_date: date(r.approval_date),
      updated_date: date(r.updated_date),
    });
  }
  const rows = [...seen.values()];
  if (first.total && rows.length < first.total * 0.97) {
    throw new Error(`NMC listed ${first.total} rows but ${rows.length} arrived — not replacing the register`);
  }
  return rows;
}

/* ---------------------------------------------------------------- matching */

const SYNONYMS: [RegExp, string][] = [
  [/\bgovt\b|\bgovernment\b|\brajkiya\b/g, "government"],
  [/\bshri\b|\bshree\b|\bsree\b|\bsri\b/g, "sri"],
  [/\binstt\b|\binst\b/g, "institute"],
  [/\bdr\b/g, "dr"],
  [/\bst\b/g, "saint"],
  // NMC writes "Employees State Insurance Corporation Medical College, Patna"; the
  // counselling lists say "ESIC Medical College" or "ESI-PGIMSR".
  [/\bemployees?'?\s+state\s+insurance(\s+corporation)?\b|\besic?\b/g, "esic"],
];

/**
 * The same state, spelt two ways (2026-10-20): NMC's "Chattisgarh" against our
 * "Chhattisgarh" left all 21 of its colleges without a single candidate, and our
 * "Pondicherry" and "Dadra Nagar Havelli" missed NMC's spellings the same way.
 */
const STATE_ALIASES: Record<string, string> = {
  chattisgarh: "chhattisgarh",
  pondicherry: "puducherry",
  "dadra nagar havelli": "dadra nagar haveli",
};

/**
 * A college's earlier names, from NMC's own brackets: "Government Medical College,
 * Kadapa ( previously Rajiv Gandhi Institute of Medical Sciences, Kadapa)". The
 * counselling lists often still use the old one, and `nameTokens` drops brackets.
 */
export function formerNames(name: string): string[] {
  const out: string[] = [];
  for (const m of name.matchAll(/\(\s*(?:previously|formerly|formely|earlier|prev\.?|old name)\s*(?:known as|named|called)?\s*:?\s*([^)]+)\)?/gi)) {
    const n = m[1].trim();
    if (n.length > 4) out.push(n);
  }
  return out;
}
// Words every second college shares. Matching on them would pair "Government Medical
// College, Nagpur" with "Government Medical College, Akola".
const GENERIC = new Set(
  "medical college colleges institute institutes institution sciences science hospital hospitals research centre center government and of the for in at post graduate pg health university deemed to be foundation trust society memorial general district teaching dental mbbs india school faculty medicine dist district previously formerly formely state".split(
    " ",
  ),
);

/** Lower case, no brackets, PIN codes or single letters, `&` as "and", a plural `s` dropped. */
export function nameTokens(name: string, keepInitials = false): string[] {
  let s = name.toLowerCase().replace(/\(.*?\)/g, " ").replace(/&/g, " and ").replace(/\b\d{6}\b/g, " ");
  for (const [re, to] of SYNONYMS) s = s.replace(re, to);
  return s
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > (keepInitials ? 0 : 1))
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
}

export const stateKey = (s: string | null | undefined) => {
  const k = nameTokens(s ?? "")
    .filter((t) => t !== "and")
    .join(" ");
  return STATE_ALIASES[k] ?? k;
};

/**
 * A name scorer weighted by how rare each word is across every name it will see.
 *
 * Plain overlap made "ACSR Government Medical College" a poor match for "ACSR
 * Government Medical College Nellore (SVU)" — the city and the university tag
 * count against it — while a plain containment test would match a city-only name
 * to every college in that city. Weighting fixes both: "ACSR", "Pragjyotishpur",
 * "Vivekanandha" carry a match; "Bangalore", which a dozen names share, barely
 * counts. Score = 0.65 × weighted containment + 0.35 × weighted Jaccard, over the
 * distinguishing words only.
 */
export function makeScorer(names: string[]) {
  const df = new Map<string, number>();
  for (const n of names) for (const t of new Set(nameTokens(n).filter((t) => !GENERIC.has(t)))) df.set(t, (df.get(t) ?? 0) + 1);
  const N = Math.max(1, names.length);
  const idf = (t: string) => Math.log(1 + N / (df.get(t) ?? 1));
  const sig = (n: string) => new Set(nameTokens(n).filter((t) => !GENERIC.has(t)));
  const weight = (s: Set<string>) => [...s].reduce((a, t) => a + idf(t), 0);
  return (a: string, b: string) => {
    const sa = sig(a);
    const sb = sig(b);
    if (!sa.size || !sb.size) return 0;
    let shared = 0;
    for (const t of sa) if (sb.has(t)) shared += idf(t);
    if (shared === 0) return 0;
    const wa = weight(sa);
    const wb = weight(sb);
    return 0.65 * (shared / Math.min(wa, wb)) + 0.35 * (shared / (wa + wb - shared));
  };
}

/** Unweighted, for a one-off comparison. Matching uses `makeScorer` over the whole set. */
export const nameScore = (a: string, b: string) => makeScorer([a, b])(a, b);

/** The better of an NMC name and its former names (see `formerNames`) against one of ours. */
export const bestNameScore = (nmcName: string, ourName: string) =>
  Math.max(...[nmcName, ...formerNames(nmcName)].map((v) => nameScore(v, ourName)));

/**
 * Words used as a place somewhere: the last comma-separated part of any name
 * ("…, Kadapa", "…, Dist Purulia West Bengal"). A match that shares only these
 * shares a town, not a college — "Government Medical College, Kadapa" scored
 * 0.79 against "Fathima Institute of Medical Sciences, Kadapa".
 */
function placeWords(names: string[]) {
  const out = new Set<string>();
  for (const n of names) {
    const parts = n.replace(/\(.*?\)/g, " ").split(",");
    if (parts.length < 2) continue;
    for (const t of nameTokens(parts[parts.length - 1])) if (!GENERIC.has(t)) out.add(t);
  }
  return out;
}
const INSTITUTION = /\b(college|institute|university|school|faculty|academy|aiims|jipmer|pgimer|kgmu|nimhans)\b/i;
const isGovernment = (n: string) => nameTokens(n).includes("government");

/**
 * Pairs a score alone would get wrong (2026-10-18, on the real register):
 * - NMC lists colleges, so a candidate with no college/institute word (a district
 *   hospital that holds DNB seats) is never a match — "Purulia Government Medical
 *   College" was paired with "Deben Mahato (Sadar) Hospital, Purulia";
 * - when the only shared distinguishing words are place names, both names must
 *   agree on "Government".
 */
function plausible(nmcName: string, ourName: string, places: Set<string>) {
  if (/\bcollege\b/i.test(nmcName) && !INSTITUTION.test(ourName)) return false;
  // Initials are dropped from the score, so "K.H. Patil Institute" and "Shri B M Patil
  // Medical College" shared only "Patil" (2026-10-20). When both names carry initials,
  // they must be the same initials.
  const initials = (n: string) => nameTokens(n, true).filter((t) => t.length === 1).join("");
  const ia = initials(nmcName);
  const ib = initials(ourName);
  if (ia && ib && ia !== ib) return false;
  const a = new Set(nameTokens(nmcName).filter((t) => !GENERIC.has(t)));
  const shared = nameTokens(ourName).filter((t) => !GENERIC.has(t) && a.has(t));
  if (shared.length && shared.every((t) => places.has(t)) && isGovernment(nmcName) !== isGovernment(ourName)) return false;
  return true;
}

const AUTO_MIN = 0.7; // below this a person decides
const AUTO_MARGIN = 0.15; // and the runner-up must be clearly worse

interface Candidate {
  id: number;
  name: string;
  state: string;
  level: "ug" | "pg";
}

/**
 * Pairs NMC colleges with our institutes, one level at a time, greedily from the
 * surest pair down so an institute is never claimed twice. Same state only.
 */
export function matchColleges(
  nmc: { code: string; name: string; state: string | null; hasMbbs: boolean; hasPg: boolean }[],
  ours: Candidate[],
  taken: { codes: Set<string>; institutes: Set<number> },
) {
  const variants = (n: string) => [n, ...formerNames(n)];
  const allNames = [...nmc.flatMap((c) => variants(c.name)), ...ours.map((o) => o.name)];
  const score = makeScorer(allNames);
  const places = placeWords(allNames);
  // Every word, generic ones and initials included: "L.N. Medical College and
  // Research Centre, Bhopal" shares every distinguishing word with "Bhopal Memorial
  // Hospital and Research Centre", and "S N" / "F H Medical College, Agra" differ
  // only in their initials.
  const sigOf = (n: string) => [...new Set(nameTokens(n, true))].sort().join(" ");
  const rank = (cands: Candidate[], s: (o: Candidate) => number) => {
    const scored = cands.map((o) => ({ o, s: s(o) })).sort((x, y) => y.s - x.s);
    const top = scored[0];
    return top && top.s >= AUTO_MIN && top.s - (scored[1]?.s ?? 0) >= AUTO_MARGIN
      ? { inst: top.o, score: top.s, margin: top.s - (scored[1]?.s ?? 0) }
      : null;
  };
  /**
   * In order, each only when the one before settles nothing (2026-10-20):
   * 1. the current name, as before;
   * 2. exactly one of ours with the same name, word for word once normalised —
   *    "Gulbarga Institute of Medical Sciences, Gulbarga" against an ESIC college in
   *    the same town scores too close for the margin;
   * 3. a former name from NMC's brackets — tried last, because our lists can hold
   *    the old name and the new one side by side.
   */
  const decide = (c: { name: string }, cands: Candidate[]) => {
    const now = rank(cands, (o) => (plausible(c.name, o.name, places) ? score(c.name, o.name) : 0));
    if (now) return now;
    const sig = sigOf(c.name);
    const same = sig ? cands.filter((o) => sigOf(o.name) === sig && isGovernment(o.name) === isGovernment(c.name)) : [];
    if (same.length === 1) return { inst: same[0], score: 1, margin: 1 };
    const former = formerNames(c.name);
    if (!former.length) return null;
    return rank(cands, (o) => Math.max(0, ...former.map((v) => (plausible(v, o.name, places) ? score(v, o.name) : 0))));
  };
  const out: { code: string; instituteId: number; score: number }[] = [];
  for (const level of ["ug", "pg"] as const) {
    const pool = ours.filter((o) => o.level === level && !taken.institutes.has(o.id));
    const byState = new Map<string, Candidate[]>();
    for (const o of pool) byState.set(stateKey(o.state), [...(byState.get(stateKey(o.state)) ?? []), o]);

    // Two NMC colleges with one name in one state (IMS & SUM Hospital, Bhubaneswar: the
    // 2007 college and its 2024 campus) — which is which is not in the names, so a
    // person decides; an automatic pick paired the old college's seats with the new one.
    const sameName = new Map<string, number>();
    for (const c of nmc) {
      if (level === "ug" ? !c.hasMbbs : !c.hasPg) continue;
      const k = `${stateKey(c.state)}|${sigOf(c.name)}`;
      sameName.set(k, (sameName.get(k) ?? 0) + 1);
    }

    const pairs: { code: string; inst: Candidate; score: number; margin: number }[] = [];
    for (const c of nmc) {
      if (level === "ug" ? !c.hasMbbs : !c.hasPg) continue;
      if (taken.codes.has(`${c.code}|${level}`)) continue;
      if ((sameName.get(`${stateKey(c.state)}|${sigOf(c.name)}`) ?? 0) > 1) continue;
      const cands = byState.get(stateKey(c.state)) ?? [];
      const d = decide(c, cands);
      if (d) pairs.push({ code: c.code, ...d });
    }
    pairs.sort((a, b) => b.score - a.score);
    const used = new Set<number>();
    const coded = new Set<string>();
    for (const p of pairs) {
      if (used.has(p.inst.id) || coded.has(p.code)) continue;
      used.add(p.inst.id);
      coded.add(p.code);
      out.push({ code: p.code, instituteId: p.inst.id, score: Math.round(p.score * 1000) / 1000 });
    }
  }
  return out;
}

const rowsOf = <T,>(r: unknown) => r as unknown as T[];

/** Our institutes an NMC college could be: UG MBBS colleges, and every PG institute. */
async function loadCandidates(): Promise<Candidate[]> {
  const r = rowsOf<{ id: number; name: string; state: string | null; level: "ug" | "pg"; mbbs: boolean }>(
    await db.execute(sql`
      SELECT i.id, i.name, COALESCE(st.name, '') AS state, i.level::text AS level,
             EXISTS (SELECT 1 FROM seat_options so JOIN courses c ON c.id = so.course_id
                      WHERE so.institute_id = i.id AND c.name = 'MBBS') AS mbbs
        FROM institutes i
        LEFT JOIN states st ON st.id = i.state_id
       WHERE i.level IN ('ug', 'pg')
    `),
  );
  // A dental or AYUSH college is never an NMC college, whatever its rows say (the
  // source misfiles a few — CLAUDE.md, known gaps).
  return r
    .filter((x) => x.level === "pg" || (x.mbbs && ugCourseOf(x.name) === "MBBS"))
    .map((x) => ({ id: x.id, name: x.name, state: x.state ?? "", level: x.level }));
}

export interface SyncResult {
  rows: number;
  colleges: number;
  seats: number;
  matched: number;
}

/** NMC's own course types for the courses NEET PG fills (DM and M.Ch. are NEET SS). */
export const PG_COURSE_TYPES = new Set(["MD", "MS", "Diploma"]);
const isMbbs = (r: { course_type: string | null; course_name: string }) => r.course_type === "M.B.B.S." || r.course_name === "M.B.B.S.";

/** The whole sync: fetch, check, replace, re-match, record. Throws on failure (the run is recorded). */
export async function syncNmc(triggeredBy: string): Promise<SyncResult> {
  const run = rowsOf<{ id: number }>(
    await db.execute(sql`INSERT INTO nmc_sync_runs (triggered_by) VALUES (${triggeredBy}) RETURNING id`),
  )[0];
  try {
    const rows = await fetchRegister();
    const mbbsColleges = new Set(rows.filter(isMbbs).map((r) => r.college_code));
    const prev = rowsOf<{ n: number }>(await db.execute(sql`SELECT COUNT(*)::int AS n FROM nmc_courses`))[0]?.n ?? 0;
    // Sanity before anything is replaced: NMC lists 800+ MBBS colleges, and a register
    // a tenth smaller than the last one is a broken read, not a mass closure.
    if (mbbsColleges.size < 600) throw new Error(`only ${mbbsColleges.size} MBBS colleges in the read — not replacing`);
    if (prev && rows.length < prev * 0.9) throw new Error(`${rows.length} rows against ${prev} last time — not replacing`);

    const ours = await loadCandidates();
    let matched = 0;
    await db.transaction(async (tx) => {
      await tx.execute(sql`DELETE FROM nmc_courses`);
      for (let i = 0; i < rows.length; i += 400) {
        const chunk = rows.slice(i, i + 400);
        await tx.execute(sql`
          INSERT INTO nmc_courses (college_code, course_name, course_type, nmc_college_id, college_name, state_name,
                                   university_name, management_type, inception_year, approved_seat, previous_approved_seat,
                                   recognition_status, remark, lop_date, approval_date, nmc_updated)
          VALUES ${sql.join(
            chunk.map(
              (r) => sql`(${r.college_code}, ${r.course_name}, ${r.course_type}, ${r.college_id}, ${r.college_name}, ${r.state_name},
                          ${r.university_name}, ${r.management_type}, ${r.inception_year}, ${r.approved_seat}, ${r.previous_approved_seat},
                          ${r.recognition_status}, ${r.remark}, ${r.lop_date}::date, ${r.approval_date}::date, ${r.updated_date}::date)`,
            ),
            sql`, `,
          )}
        `);
      }

      // Re-match: drop the automatic pairs, keep a person's.
      await tx.execute(sql`DELETE FROM nmc_institutes WHERE method = 'auto'`);
      const kept = rowsOf<{ college_code: string; institute_id: number | null; level: string | null }>(
        await tx.execute(sql`
          SELECT m.college_code, m.institute_id, COALESCE(i.level::text, m.level) AS level
            FROM nmc_institutes m LEFT JOIN institutes i ON i.id = m.institute_id
        `),
      );
      const taken = { codes: new Set<string>(), institutes: new Set<number>() };
      for (const k of kept) {
        if (k.institute_id) taken.institutes.add(k.institute_id);
        // A pair closes its own level; "admin-none" closes the level it names, or both
        // when it names none (migration 0037).
        if (k.level) taken.codes.add(`${k.college_code}|${k.level}`);
        else if (!k.institute_id) {
          taken.codes.add(`${k.college_code}|ug`);
          taken.codes.add(`${k.college_code}|pg`);
        }
      }

      const colleges = new Map<string, { code: string; name: string; state: string | null; hasMbbs: boolean; hasPg: boolean }>();
      for (const r of rows) {
        const c = colleges.get(r.college_code) ?? { code: r.college_code, name: r.college_name, state: r.state_name, hasMbbs: false, hasPg: false };
        if (isMbbs(r)) c.hasMbbs = true;
        else if (PG_COURSE_TYPES.has(r.course_type ?? "")) c.hasPg = true;
        colleges.set(r.college_code, c);
      }
      const pairs = matchColleges([...colleges.values()], ours, taken);
      for (let i = 0; i < pairs.length; i += 400) {
        const chunk = pairs.slice(i, i + 400);
        await tx.execute(sql`
          INSERT INTO nmc_institutes (college_code, institute_id, method, score)
          VALUES ${sql.join(chunk.map((p) => sql`(${p.code}, ${p.instituteId}, 'auto', ${p.score})`), sql`, `)}
        `);
      }
      matched = pairs.length + kept.filter((k) => k.institute_id).length;
    });

    const result: SyncResult = {
      rows: rows.length,
      colleges: new Set(rows.map((r) => r.college_code)).size,
      seats: rows.reduce((a, r) => a + (r.approved_seat ?? 0), 0),
      matched,
    };
    await db.execute(sql`
      UPDATE nmc_sync_runs
         SET finished_at = now(), status = 'ok', rows = ${result.rows}, colleges = ${result.colleges},
             seats = ${result.seats}, matched = ${result.matched}
       WHERE id = ${run.id}
    `);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .execute(sql`UPDATE nmc_sync_runs SET finished_at = now(), status = 'failed', error = ${message.slice(0, 2000)} WHERE id = ${run.id}`)
      .catch(() => undefined);
    logError(error, { route: "nmcSync" });
    throw error;
  }
}
