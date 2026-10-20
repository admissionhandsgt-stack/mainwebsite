/**
 * PG seat data beyond closing ranks (2026-10-20). Server only.
 *
 * Two sources, never mixed up on a page:
 *   - mcc_seat_matrix / mcc_allotments (migration 0038): MCC's own published 2026 seat matrix
 *     and 2024–25 AIQ results — official, cited as MCC.
 *   - pg_seat_terms (migration 0039): stipend, service bond and seat-leaving terms per seat
 *     type — a third-party compilation. Shown as "listed for the 2026 counselling", never as
 *     official, always with "confirm with the state's notice" (copy in page.college_pg.mcc /
 *     page.pg_bond.*).
 *
 * No college's closing rank comes out of here (the 2026-10-12 rule): the allotments only feed
 * round-level counts. A state figure built from per-college values needs three colleges.
 */

import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { branchSlug } from "@/lib/branchSlug";
import { stateKey } from "@/lib/nmcSync";
import { logError } from "@/lib/logger";

const rows = <T,>(r: unknown) => r as unknown as T[];
const DAY = 86_400;
const MIN_GROUP = 3;

/** MCC writes states its own way ("JAMMU AND KASHMIR", "Delhi (NCT)"); ours are the names our pages use. */
async function stateNames(): Promise<(raw: string | null) => string | null> {
  const ours = rows<{ name: string }>(await db.execute(sql`SELECT name FROM states`));
  const byKey = new Map(ours.map((s) => [stateKey(s.name), s.name]));
  return (raw) => (raw ? byKey.get(stateKey(raw)) ?? null : null);
}

/* ------------------------------------------------------------ seat matrix */

export interface Categories {
  open: number;
  ews: number;
  obc: number;
  sc: number;
  st: number;
  /** PwD seats across every category; the category columns exclude them, so a row adds up. */
  pwd: number;
}

export interface MatrixRow extends Categories {
  course: string;
  programme: string;
  seatMatrix: string;
  quota: string | null;
  total: number;
}

export interface CollegeMatrix {
  year: number;
  total: number;
  byMatrix: { seatMatrix: string; seats: number }[];
  rows: MatrixRow[];
}

const MATRIX_ORDER = ["AIQ", "Deemed", "Central Institutes Internal Quota", "DNB"];
const matrixRank = (m: string) => {
  const i = MATRIX_ORDER.indexOf(m);
  return i === -1 ? 9 : i;
};
/** What a reader calls each of MCC's seat matrices. */
export const MATRIX_LABEL: Record<string, string> = {
  AIQ: "All India Quota",
  Deemed: "Deemed universities",
  "Central Institutes Internal Quota": "Central universities' quotas",
  DNB: "DNB and NBE diploma",
};

const CAT_SQL = sql`SUM(m.open_seats)::int AS open, SUM(m.ews)::int AS ews, SUM(m.obc)::int AS obc,
  SUM(m.sc)::int AS sc, SUM(m.st)::int AS st,
  SUM(m.open_pwd + m.ews_pwd + m.obc_pwd + m.sc_pwd + m.st_pwd)::int AS pwd,
  SUM(m.total_seats)::int AS total`;

async function loadCollegeMatrix(slug: string): Promise<CollegeMatrix | null> {
  try {
    const r = rows<MatrixRow & { year: number; seat_matrix: string }>(
      await db.execute(sql`
        SELECT m.year, COALESCE(c.name, m.mcc_course) AS course, m.programme, m.seat_matrix, m.quota, ${CAT_SQL}
          FROM mcc_seat_matrix m
          JOIN institutes i ON i.id = m.institute_id
          LEFT JOIN courses c ON c.id = m.course_id
         WHERE i.slug = ${slug} AND i.level = 'pg'
         GROUP BY m.year, 2, m.programme, m.seat_matrix, m.quota`),
    );
    if (!r.length) return null;
    const list: MatrixRow[] = r
      .map((x) => ({
        course: x.course,
        programme: x.programme,
        seatMatrix: x.seat_matrix,
        quota: x.quota,
        open: x.open,
        ews: x.ews,
        obc: x.obc,
        sc: x.sc,
        st: x.st,
        pwd: x.pwd,
        total: x.total,
      }))
      .sort(
        (a, b) =>
          matrixRank(a.seatMatrix) - matrixRank(b.seatMatrix) ||
          a.course.localeCompare(b.course) ||
          (a.quota ?? "").localeCompare(b.quota ?? ""),
      );
    const byMatrix = new Map<string, number>();
    for (const x of list) byMatrix.set(x.seatMatrix, (byMatrix.get(x.seatMatrix) ?? 0) + x.total);
    return {
      year: r[0].year,
      total: list.reduce((a, x) => a + x.total, 0),
      byMatrix: [...byMatrix]
        .map(([seatMatrix, seats]) => ({ seatMatrix, seats }))
        .sort((a, b) => matrixRank(a.seatMatrix) - matrixRank(b.seatMatrix)),
      rows: list,
    };
  } catch (error) {
    logError(error, { route: `pgSeatData:matrix:${slug}` });
    return null;
  }
}

/** One college's seats in MCC's counselling, course by course. */
export const getCollegeSeatMatrix = (slug: string) =>
  unstable_cache(() => loadCollegeMatrix(slug), ["mcc-college-v1", slug], { revalidate: DAY, tags: ["mcc"] })();

export interface BranchMatrix {
  year: number;
  total: number;
  colleges: number;
  byMatrix: { seatMatrix: string; seats: number }[];
  categories: Categories;
  topStates: { state: string; seats: number }[];
}

async function loadBranchMatrix(course: string): Promise<BranchMatrix | null> {
  try {
    const r = rows<Categories & { year: number; seat_matrix: string; inst: string; our_state: string | null; mcc_state: string | null; total: number }>(
      await db.execute(sql`
        SELECT m.year, m.seat_matrix, COALESCE(m.institute_id::text, m.mcc_college_name) AS inst,
               s.name AS our_state, m.state AS mcc_state, ${CAT_SQL}
          FROM mcc_seat_matrix m
          JOIN courses c ON c.id = m.course_id
          LEFT JOIN institutes i ON i.id = m.institute_id
          LEFT JOIN states s ON s.id = i.state_id
         WHERE c.name = ${course}
         GROUP BY m.year, m.seat_matrix, 3, s.name, m.state`),
    );
    if (!r.length) return null;
    const ourState = await stateNames();
    const byMatrix = new Map<string, number>();
    const byState = new Map<string, number>();
    const colleges = new Set<string>();
    const cat: Categories = { open: 0, ews: 0, obc: 0, sc: 0, st: 0, pwd: 0 };
    for (const x of r) {
      colleges.add(x.inst);
      byMatrix.set(x.seat_matrix, (byMatrix.get(x.seat_matrix) ?? 0) + x.total);
      const st = x.our_state ?? ourState(x.mcc_state);
      if (st) byState.set(st, (byState.get(st) ?? 0) + x.total);
      for (const k of Object.keys(cat) as (keyof Categories)[]) cat[k] += x[k];
    }
    return {
      year: r[0].year,
      total: r.reduce((a, x) => a + x.total, 0),
      colleges: colleges.size,
      byMatrix: [...byMatrix]
        .map(([seatMatrix, seats]) => ({ seatMatrix, seats }))
        .sort((a, b) => matrixRank(a.seatMatrix) - matrixRank(b.seatMatrix)),
      categories: cat,
      topStates: [...byState]
        .map(([state, seats]) => ({ state, seats }))
        .sort((a, b) => b.seats - a.seats)
        .slice(0, 5),
    };
  } catch (error) {
    logError(error, { route: `pgSeatData:branch:${course}` });
    return null;
  }
}

/** One course's seats across every college in MCC's counselling (for a branch page). */
export const getBranchSeatMatrix = (course: string) =>
  unstable_cache(() => loadBranchMatrix(course), ["mcc-branch-v1", course], { revalidate: DAY, tags: ["mcc"] })();

export interface StateMatrix {
  year: number;
  total: number;
  byMatrix: { seatMatrix: string; seats: number }[];
  courses: { course: string; slug: string; total: number; aiq: number; deemed: number; dnb: number }[];
}

async function loadStateMatrix(state: string): Promise<StateMatrix | null> {
  try {
    const r = rows<{ year: number; seat_matrix: string; course: string; our_state: string | null; mcc_state: string | null; total: number }>(
      await db.execute(sql`
        SELECT m.year, m.seat_matrix, c.name AS course, s.name AS our_state, m.state AS mcc_state, SUM(m.total_seats)::int AS total
          FROM mcc_seat_matrix m
          JOIN courses c ON c.id = m.course_id
          LEFT JOIN institutes i ON i.id = m.institute_id
          LEFT JOIN states s ON s.id = i.state_id
         GROUP BY m.year, m.seat_matrix, c.name, s.name, m.state`),
    );
    const ourState = await stateNames();
    const mine = r.filter((x) => (x.our_state ?? ourState(x.mcc_state)) === state);
    if (!mine.length) return null;
    const byMatrix = new Map<string, number>();
    const course = new Map<string, { total: number; aiq: number; deemed: number; dnb: number }>();
    for (const x of mine) {
      byMatrix.set(x.seat_matrix, (byMatrix.get(x.seat_matrix) ?? 0) + x.total);
      const c = course.get(x.course) ?? { total: 0, aiq: 0, deemed: 0, dnb: 0 };
      c.total += x.total;
      if (x.seat_matrix === "AIQ") c.aiq += x.total;
      if (x.seat_matrix === "Deemed") c.deemed += x.total;
      if (x.seat_matrix === "DNB") c.dnb += x.total;
      course.set(x.course, c);
    }
    return {
      year: mine[0].year,
      total: mine.reduce((a, x) => a + x.total, 0),
      byMatrix: [...byMatrix]
        .map(([seatMatrix, seats]) => ({ seatMatrix, seats }))
        .sort((a, b) => matrixRank(a.seatMatrix) - matrixRank(b.seatMatrix)),
      courses: [...course]
        .map(([name, v]) => ({ course: name, slug: branchSlug(name), ...v }))
        .sort((a, b) => b.total - a.total || a.course.localeCompare(b.course)),
    };
  } catch (error) {
    logError(error, { route: `pgSeatData:state:${state}` });
    return null;
  }
}

/** One state's seats in MCC's counselling, course by course (for a PG state page). */
export const getStateSeatMatrix = (state: string) =>
  unstable_cache(() => loadStateMatrix(state), ["mcc-state-v1", state], { revalidate: DAY, tags: ["mcc"] })();

export interface RoundCount {
  year: number;
  round: string;
  allotted: number;
  fresh: number;
  upgraded: number;
}

export interface MatrixOverview {
  year: number;
  total: number;
  /**
   * Colleges per matrix only. No all-matrix total: our PG data lists many hospitals twice (an
   * MD/MS entry and a DNB entry), so a count across matrices would count them twice.
   */
  byMatrix: { seatMatrix: string; seats: number; colleges: number }[];
  byProgramme: { programme: string; seats: number }[];
  /** All India Quota only — the matrix whose reservation the categories describe. */
  aiqCategories: Categories;
  branches: { course: string; slug: string; programme: string; seats: number; aiq: number; deemed: number; dnb: number; colleges: number }[];
  states: { state: string; seats: number; aiq: number; dnb: number }[];
  rounds: RoundCount[];
}

const ROUND_ORDER = (round: string) =>
  /^round 1/i.test(round) ? 1 : /^round 2/i.test(round) ? 2 : /^round 3/i.test(round) ? 3 : /^stray/i.test(round) ? 4 : 5;

async function loadOverview(): Promise<MatrixOverview | null> {
  try {
    const base = rows<Categories & { year: number; seat_matrix: string; programme: string; course: string | null; our_state: string | null; mcc_state: string | null; inst: string; total: number }>(
      await db.execute(sql`
        SELECT m.year, m.seat_matrix, m.programme, c.name AS course,
               s.name AS our_state, m.state AS mcc_state,
               COALESCE(m.institute_id::text, m.mcc_college_name) AS inst,
               m.open_seats AS open, m.ews, m.obc, m.sc, m.st,
               (m.open_pwd + m.ews_pwd + m.obc_pwd + m.sc_pwd + m.st_pwd) AS pwd, m.total_seats AS total
          FROM mcc_seat_matrix m
          LEFT JOIN courses c ON c.id = m.course_id
          LEFT JOIN institutes i ON i.id = m.institute_id
          LEFT JOIN states s ON s.id = i.state_id`),
    );
    if (!base.length) return null;
    const ourState = await stateNames();
    const cat: Categories = { open: 0, ews: 0, obc: 0, sc: 0, st: 0, pwd: 0 };
    const matrix = new Map<string, { seats: number; colleges: Set<string> }>();
    const programme = new Map<string, number>();
    const branch = new Map<string, { programme: string; seats: number; aiq: number; deemed: number; dnb: number; colleges: Set<string> }>();
    const state = new Map<string, { seats: number; aiq: number; dnb: number }>();
    for (const x of base) {
      if (x.seat_matrix === "AIQ") for (const k of Object.keys(cat) as (keyof Categories)[]) cat[k] += x[k];
      const m = matrix.get(x.seat_matrix) ?? { seats: 0, colleges: new Set<string>() };
      m.seats += x.total;
      m.colleges.add(x.inst);
      matrix.set(x.seat_matrix, m);
      programme.set(x.programme, (programme.get(x.programme) ?? 0) + x.total);
      if (x.course) {
        const b = branch.get(x.course) ?? { programme: x.programme, seats: 0, aiq: 0, deemed: 0, dnb: 0, colleges: new Set<string>() };
        b.seats += x.total;
        if (x.seat_matrix === "AIQ") b.aiq += x.total;
        if (x.seat_matrix === "Deemed") b.deemed += x.total;
        if (x.seat_matrix === "DNB") b.dnb += x.total;
        b.colleges.add(x.inst);
        branch.set(x.course, b);
      }
      const st = x.our_state ?? ourState(x.mcc_state);
      if (st) {
        const s = state.get(st) ?? { seats: 0, aiq: 0, dnb: 0 };
        s.seats += x.total;
        if (x.seat_matrix === "AIQ") s.aiq += x.total;
        if (x.seat_matrix === "DNB") s.dnb += x.total;
        state.set(st, s);
      }
    }
    // A round's list holds its fresh allotments and its upgrades; round 1 is all fresh.
    const rounds = rows<{ year: number; round: string; allotted: number; upgraded: number }>(
      await db.execute(sql`
        SELECT year, round, COUNT(*)::int AS allotted,
               COUNT(*) FILTER (WHERE status ILIKE 'Upgraded%')::int AS upgraded
          FROM mcc_allotments GROUP BY 1, 2`),
    )
      .map((r) => ({ ...r, fresh: r.allotted - r.upgraded }))
      .sort((a, b) => b.year - a.year || ROUND_ORDER(a.round) - ROUND_ORDER(b.round));
    return {
      year: base[0].year,
      total: base.reduce((a, x) => a + x.total, 0),
      byMatrix: [...matrix]
        .map(([seatMatrix, v]) => ({ seatMatrix, seats: v.seats, colleges: v.colleges.size }))
        .sort((a, b) => matrixRank(a.seatMatrix) - matrixRank(b.seatMatrix)),
      byProgramme: [...programme].map(([p, seats]) => ({ programme: p, seats })).sort((a, b) => b.seats - a.seats),
      aiqCategories: cat,
      branches: [...branch]
        .map(([course, v]) => ({
          course,
          slug: branchSlug(course),
          programme: v.programme,
          seats: v.seats,
          aiq: v.aiq,
          deemed: v.deemed,
          dnb: v.dnb,
          colleges: v.colleges.size,
        }))
        .sort((a, b) => b.seats - a.seats || a.course.localeCompare(b.course)),
      states: [...state]
        .map(([st, v]) => ({ state: st, ...v }))
        .sort((a, b) => b.seats - a.seats),
      rounds,
    };
  } catch (error) {
    logError(error, { route: "pgSeatData:overview" });
    return null;
  }
}

/** The whole matrix, for /neet-pg-seat-matrix — plus round-by-round counts from MCC's results. */
export const getSeatMatrixOverview = unstable_cache(loadOverview, ["mcc-overview-v2"], { revalidate: DAY, tags: ["mcc"] });

/* ---------------------------------------------------- bond, stipend, exit */

export type SeatFamily = "aiq" | "state" | "management" | "nri" | "dnb";

export const seatFamily = (seatType: string, degree: string | null): SeatFamily => {
  if (/^(DNB|Diploma \(NBE\))/i.test(degree ?? "") || /^(DNB|NBE)/i.test(seatType)) return "dnb";
  if (seatType === "AIQ") return "aiq";
  if (/NRI/i.test(seatType)) return "nri";
  // "Institutional Preference" is a merit quota for a university's own graduates; Karnataka's
  // "Institutional Quota" and Telangana's "C Cat-Institutional" are management seats.
  if (/institutional preference/i.test(seatType)) return "state";
  if (/manag|^MNG$|paid|self.?financ|institutional/i.test(seatType)) return "management";
  return "state";
};
const FAMILY_ORDER: Record<SeatFamily, number> = { aiq: 0, state: 1, management: 2, nri: 3, dnb: 4 };

export interface SeatTerms {
  counselling: string | null;
  seatType: string;
  family: SeatFamily;
  courses: number;
  /** ₹ a month, years 1–3. */
  stipend: [number | null, number | null, number | null];
  bondYears: number | null;
  bondUnknown: boolean;
  bondPenalty: number | null;
  bondVaryBy: string | null;
  /** The branches here under this seat type do not all list the same bond. */
  bondVaries: boolean;
  exitPenalty: number | null;
  exitNoPenalty: boolean;
  exitDebarYears: number | null;
  exitRefundStipend: boolean;
  exitFullCourseFee: boolean;
  hostelMin: number | null;
  hostelMax: number | null;
  hostelPeriod: "year" | "month" | null;
  hostelMess: boolean;
  session: string | null;
}

/** The most common value in a list (nulls ignored); null when the list is empty. */
function mode<T>(xs: (T | null | undefined)[]): T | null {
  const m = new Map<T, number>();
  for (const x of xs) if (x != null) m.set(x, (m.get(x) ?? 0) + 1);
  let best: T | null = null;
  let n = 0;
  for (const [k, v] of m) if (v > n) [best, n] = [k, v];
  return best;
}

interface TermRow {
  counselling: string | null;
  seat_type: string | null;
  degree: string | null;
  fee_session: string | null;
  stipend_y1: number | null;
  stipend_y2: number | null;
  stipend_y3: number | null;
  bond_years: number | null;
  bond_unknown: boolean;
  bond_penalty_inr: string | number | null;
  bond_terms_vary_by: string | null;
  hostel_fee_min_inr: number | null;
  hostel_fee_max_inr: number | null;
  hostel_fee_period: string | null;
  hostel_includes_mess: boolean | null;
  seat_leaving_penalty_inr: string | number | null;
  seat_leaving_no_penalty: boolean | null;
  seat_leaving_debarment_years: number | null;
  seat_leaving_refund_stipend: boolean | null;
  seat_leaving_full_course_fee: boolean | null;
}
const TERM_COLS = sql`t.counselling, t.seat_type, t.degree, t.fee_session, t.stipend_y1, t.stipend_y2, t.stipend_y3,
  t.bond_years, t.bond_unknown, t.bond_penalty_inr, t.bond_terms_vary_by,
  t.hostel_fee_min_inr, t.hostel_fee_max_inr, t.hostel_fee_period, t.hostel_includes_mess,
  t.seat_leaving_penalty_inr, t.seat_leaving_no_penalty, t.seat_leaving_debarment_years,
  t.seat_leaving_refund_stipend, t.seat_leaving_full_course_fee`;
const num = (v: string | number | null | undefined) => (v == null ? null : Number(v));
const positive = (v: number | null) => (v != null && v > 0 ? v : null);

function summarise(list: TermRow[]): SeatTerms {
  const first = list[0];
  const known = list.filter((r) => !r.bond_unknown);
  const bondTuples = new Set(known.map((r) => `${r.bond_years}|${num(r.bond_penalty_inr) ?? ""}`));
  const bondYears = mode(known.map((r) => r.bond_years));
  // Hostel only where the period is stated: a bare figure could be a month, a year or the course.
  const hostel = list.filter((r) => r.hostel_fee_period === "year" || r.hostel_fee_period === "month");
  const hostelPeriod = mode(hostel.map((r) => r.hostel_fee_period)) as SeatTerms["hostelPeriod"];
  const sameHostel = hostel.filter((r) => r.hostel_fee_period === hostelPeriod);
  return {
    counselling: first.counselling,
    seatType: first.seat_type ?? "",
    family: seatFamily(first.seat_type ?? "", first.degree),
    courses: list.length,
    stipend: [
      positive(mode(list.map((r) => r.stipend_y1))),
      positive(mode(list.map((r) => r.stipend_y2))),
      positive(mode(list.map((r) => r.stipend_y3))),
    ],
    bondYears,
    bondUnknown: known.length === 0,
    bondPenalty: bondYears ? positive(mode(known.filter((r) => r.bond_years === bondYears).map((r) => num(r.bond_penalty_inr)))) : null,
    bondVaryBy: mode(list.map((r) => r.bond_terms_vary_by)),
    bondVaries: bondTuples.size > 1,
    exitPenalty: positive(mode(list.map((r) => num(r.seat_leaving_penalty_inr)))),
    exitNoPenalty: list.every((r) => r.seat_leaving_no_penalty),
    exitDebarYears: mode(list.map((r) => r.seat_leaving_debarment_years)),
    exitRefundStipend: list.some((r) => r.seat_leaving_refund_stipend),
    exitFullCourseFee: list.some((r) => r.seat_leaving_full_course_fee),
    hostelMin: positive(mode(sameHostel.map((r) => r.hostel_fee_min_inr))),
    hostelMax: positive(mode(sameHostel.map((r) => r.hostel_fee_max_inr))),
    hostelPeriod: sameHostel.length ? hostelPeriod : null,
    hostelMess: sameHostel.some((r) => r.hostel_includes_mess),
    session: mode(list.map((r) => r.fee_session)),
  };
}

async function loadCollegeTerms(slug: string): Promise<SeatTerms[]> {
  try {
    const r = rows<TermRow>(
      await db.execute(sql`
        SELECT ${TERM_COLS}
          FROM pg_seat_terms t JOIN institutes i ON i.id = t.institute_id
         WHERE i.slug = ${slug} AND i.level = 'pg'`),
    );
    const groups = new Map<string, TermRow[]>();
    for (const x of r) {
      const k = `${x.counselling ?? ""}|${x.seat_type ?? ""}`;
      const g = groups.get(k);
      if (g) g.push(x);
      else groups.set(k, [x]);
    }
    return [...groups.values()]
      .map(summarise)
      .sort((a, b) => FAMILY_ORDER[a.family] - FAMILY_ORDER[b.family] || b.courses - a.courses || a.seatType.localeCompare(b.seatType));
  } catch (error) {
    logError(error, { route: `pgSeatData:terms:${slug}` });
    return [];
  }
}

/** The counselling year most of a college's terms were listed for ("2026", sometimes "2025"). */
export const termsSession = (terms: SeatTerms[]) => mode(terms.map((t) => t.session));

/** One college's terms, one entry per counselling × seat type. */
export const getCollegeSeatTerms = (slug: string) =>
  unstable_cache(() => loadCollegeTerms(slug), ["seat-terms-college-v1", slug], { revalidate: DAY, tags: ["seat-terms"] })();

export interface BondCollege {
  name: string;
  slug: string;
  bondYears: number | null;
  bondPenalty: number | null;
  exitPenalty: number | null;
  exitDebarYears: number | null;
  stipendY1: number | null;
}
export interface BondState {
  state: string;
  anchor: string;
  govt: {
    colleges: number;
    withBond: number;
    typicalYears: number | null;
    penaltyMedian: number | null;
    penaltyLow: number | null;
    penaltyHigh: number | null;
    exitMedian: number | null;
    debarYears: number | null;
    list: BondCollege[];
  };
  other: { colleges: number; withBond: number; exitMedian: number | null; fullFee: number };
}
export interface BondOverview {
  year: string | null;
  states: BondState[];
  govtColleges: number;
  govtBonded: number;
  byYears: Record<1 | 2 | 3, number>;
  penaltyMedian: number | null;
  penaltyLow: number | null;
  penaltyHigh: number | null;
  exitMedian: number | null;
  /** Every college read, and those of them listing a seat-leaving penalty. */
  allColleges: number;
  exitColleges: number;
  otherColleges: number;
  otherBonded: number;
  /** States with three or more private/deemed colleges that list a bond, most first. */
  otherBondStates: string[];
}

const quantile = (xs: number[], q: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) * q)];
};
const median = (xs: number[]) => quantile(xs, 0.5);
const enough = (xs: number[]) => xs.length >= MIN_GROUP;
const anchorOf = (state: string) => state.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Service bond and seat-leaving terms by state, for /md-ms-india/bond. Government colleges are
 * read on their All India and state-quota MD/MS seats; private, deemed and society-run ones on
 * any seat but DNB (whose terms are the National Board's).
 */
async function loadBond(): Promise<BondOverview | null> {
  try {
    const r = rows<TermRow & { institute_id: number; name: string; slug: string; state: string; institute_type: string | null }>(
      await db.execute(sql`
        SELECT t.institute_id, i.name, i.slug, s.name AS state, t.institute_type, ${TERM_COLS}
          FROM pg_seat_terms t
          JOIN institutes i ON i.id = t.institute_id
          JOIN states s ON s.id = i.state_id
         WHERE i.level = 'pg'`),
    );
    if (!r.length) return null;
    const isGovt = (t: string | null) => /^(government institute|afms)$/i.test(t ?? "");
    const byCollege = new Map<number, typeof r>();
    for (const x of r) {
      if (seatFamily(x.seat_type ?? "", x.degree) === "dnb") continue;
      const g = byCollege.get(x.institute_id);
      if (g) g.push(x);
      else byCollege.set(x.institute_id, [x]);
    }
    type C = { state: string; govt: boolean; c: BondCollege; fullFee: boolean };
    const colleges: C[] = [];
    for (const list of byCollege.values()) {
      const govt = isGovt(list[0].institute_type);
      const pool = govt ? list.filter((x) => ["aiq", "state"].includes(seatFamily(x.seat_type ?? "", x.degree))) : list;
      if (!pool.length || pool.every((x) => x.bond_unknown)) continue;
      const t = summarise(pool);
      // A college has a bond when any of these seats lists one: a mode over every seat would call
      // a college unbonded wherever its in-service or unbonded seats happen to outnumber the rest.
      const bonded = pool.filter((x) => !x.bond_unknown && (x.bond_years ?? 0) > 0);
      const bondYears = bonded.length ? mode(bonded.map((x) => x.bond_years)) : 0;
      const bondPenalty = bonded.length ? positive(mode(bonded.filter((x) => x.bond_years === bondYears).map((x) => num(x.bond_penalty_inr)))) : null;
      colleges.push({
        state: list[0].state,
        govt,
        fullFee: t.exitFullCourseFee,
        c: {
          name: list[0].name,
          slug: list[0].slug,
          bondYears,
          bondPenalty,
          exitPenalty: t.exitPenalty,
          exitDebarYears: t.exitDebarYears,
          stipendY1: t.stipend[0],
        },
      });
    }
    const byState = new Map<string, C[]>();
    for (const c of colleges) {
      const g = byState.get(c.state);
      if (g) g.push(c);
      else byState.set(c.state, [c]);
    }
    const states: BondState[] = [];
    for (const [state, list] of byState) {
      const g = list.filter((x) => x.govt).map((x) => x.c);
      const o = list.filter((x) => !x.govt);
      const bonded = g.filter((c) => (c.bondYears ?? 0) > 0);
      const pens = bonded.map((c) => c.bondPenalty).filter((v): v is number => v != null);
      const exits = g.map((c) => c.exitPenalty).filter((v): v is number => v != null);
      const oExits = o.map((x) => x.c.exitPenalty).filter((v): v is number => v != null);
      states.push({
        state,
        anchor: anchorOf(state),
        govt: {
          colleges: g.length,
          withBond: bonded.length,
          typicalYears: mode(bonded.map((c) => c.bondYears)),
          penaltyMedian: enough(pens) ? median(pens) : null,
          penaltyLow: enough(pens) ? quantile(pens, 0.1) : null,
          penaltyHigh: enough(pens) ? quantile(pens, 0.9) : null,
          exitMedian: enough(exits) ? median(exits) : null,
          debarYears: mode(g.map((c) => c.exitDebarYears)),
          list: g.sort((a, b) => a.name.localeCompare(b.name)),
        },
        other: {
          colleges: o.length,
          withBond: o.filter((x) => (x.c.bondYears ?? 0) > 0).length,
          exitMedian: enough(oExits) ? median(oExits) : null,
          fullFee: o.filter((x) => x.fullFee).length,
        },
      });
    }
    const govt = colleges.filter((c) => c.govt).map((c) => c.c);
    const other = colleges.filter((c) => !c.govt);
    const govtBonded = govt.filter((c) => (c.bondYears ?? 0) > 0);
    const pens = govtBonded.map((c) => c.bondPenalty).filter((v): v is number => v != null);
    const exits = colleges.map((c) => c.c.exitPenalty).filter((v): v is number => v != null);
    const [y] = rows<{ year: string | null }>(await db.execute(sql`SELECT MAX(fee_session) AS year FROM pg_seat_terms WHERE fee_session ~ '^[0-9]{4}$'`));
    return {
      year: y?.year ?? null,
      states: states.sort((a, b) => b.govt.colleges - a.govt.colleges || b.other.colleges - a.other.colleges || a.state.localeCompare(b.state)),
      govtColleges: govt.length,
      govtBonded: govtBonded.length,
      byYears: {
        1: govt.filter((c) => c.bondYears === 1).length,
        2: govt.filter((c) => c.bondYears === 2).length,
        3: govt.filter((c) => c.bondYears === 3).length,
      },
      penaltyMedian: median(pens),
      penaltyLow: quantile(pens, 0.1),
      penaltyHigh: quantile(pens, 0.9),
      exitMedian: median(exits),
      allColleges: colleges.length,
      exitColleges: exits.length,
      otherColleges: other.length,
      otherBonded: other.filter((x) => (x.c.bondYears ?? 0) > 0).length,
      otherBondStates: states
        .filter((s) => s.other.withBond >= MIN_GROUP)
        .sort((a, b) => b.other.withBond - a.other.withBond)
        .map((s) => s.state),
    };
  } catch (error) {
    logError(error, { route: "pgSeatData:bond" });
    return null;
  }
}

export const getBondByState = unstable_cache(loadBond, ["bond-by-state-v2"], { revalidate: DAY, tags: ["seat-terms"] });
