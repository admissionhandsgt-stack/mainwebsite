/**
 * A PG branch's seats, state by state (2026-11-12) — the section that answers "dnb dermatology seats in kerala",
 * "md radiology seats in maharashtra", "md general medicine seats in karnataka" on the branch page itself.
 *
 * Why a section and not more pages (owner: "itne pages banana sahi hai? … sub section … easy tarika"): Search Console
 * and autocomplete over 90 days showed a few hundred impressions across every branch × state pair, mostly "<branch>
 * seats in <state>" and "dnb <branch> seats in <state>"; 68 of the 143 branch × state pages were not even indexed. One
 * table on the page Google already ranks, each state with its own anchor, answers the same searches without 300 thin
 * pages. Branch × state pages stay where they are (BRANCH_STATE_COURSES).
 *
 * Figures, both counts of seats — never a rank:
 *  - NMC's approved MD/MS seats in the state and how many colleges hold them, government vs the rest (NMC's register,
 *    lib/nmcSync.ts). NMC files deemed universities as private.
 *  - MCC's seat matrix for the running counselling: the MD/MS seats MCC itself allots in the state (All India quota,
 *    deemed, central institutes) and the DNB seats of the same specialty (MCC's DNB matrix). A state's own quota seats
 *    are not in MCC's matrix — the NMC column is the whole state.
 *
 * Server only.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { stateKey } from "@/lib/nmcSync";
import { logError } from "@/lib/logger";

const rows = <T,>(r: unknown) => r as unknown as T[];
const letters = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");

/** DNB and NMC spell some specialties their own way; folded onto the MD/MS name's key. */
const SPEC_ALIAS: Record<string, string> = {
  dermatologyandvenereology: "dermatologyvenereologyandleprosy",
  dermatology: "dermatologyvenereologyandleprosy",
  orthopedicssurgery: "orthopaedics",
  orthopedics: "orthopaedics",
  geriatricmedicine: "geriatrics",
  radiotherapy: "radiationoncology",
  radiology: "radiodiagnosis",
  immunohematologyandtransfusionmedicine: "immunohaematologyandbloodtransfusion",
  labmedicine: "laboratorymedicine",
  respiratorymedicine: "respiratorymedicine",
};

/** "MD Radio Diagnosis", "DNB Radio Diagnosis", NMC's "Radio-diagnosis" → one key. Diplomas never match. */
export function specialtyKey(name: string): string | null {
  if (/^diploma/i.test(name.trim())) return null;
  const k = letters(name.replace(/^(MD|MS|DNB|DrNB|M\.\s?[DS]\.?)\s*-?\s*/i, "").replace(/\(.*?\)/g, ""));
  return SPEC_ALIAS[k] ?? k;
}

export interface BranchStateSeats {
  state: string;
  /** NMC's approved MD/MS seats in the state, and the colleges holding them. */
  nmcSeats: number;
  nmcColleges: number;
  nmcGovt: number;
  /** MCC's matrix, the running counselling: MD/MS seats it allots in the state, and DNB seats of the specialty. */
  mccMdms: number;
  mccDnb: number;
}

export interface BranchSeatsByState {
  year: number | null;
  rows: BranchStateSeats[];
}

type NmcRow = { type: string; name: string; state: string; mgmt: string | null; seats: number; college: string };
type MccRow = { name: string; matrix: string; our_state: string | null; mcc_state: string | null; seats: number; year: number };

const loadAll = unstable_cache(
  async (): Promise<{ nmc: NmcRow[]; mcc: MccRow[] }> => {
    try {
      const [nmc, mcc] = await Promise.all([
        db.execute(sql`
          SELECT course_type AS type, course_name AS name, state_name AS state, management_type AS mgmt,
                 approved_seat::int AS seats, college_code AS college
            FROM nmc_courses WHERE course_type IN ('MD', 'MS') AND approved_seat > 0`),
        db.execute(sql`
          SELECT c.name, m.seat_matrix AS matrix, s.name AS our_state, m.state AS mcc_state,
                 SUM(m.total_seats)::int AS seats, m.year
            FROM mcc_seat_matrix m
            JOIN courses c ON c.id = m.course_id
            LEFT JOIN institutes i ON i.id = m.institute_id
            LEFT JOIN states s ON s.id = i.state_id
           WHERE m.year = (SELECT MAX(year) FROM mcc_seat_matrix)
           GROUP BY c.name, m.seat_matrix, s.name, m.state, m.year`),
      ]);
      return { nmc: rows<NmcRow>(nmc), mcc: rows<MccRow>(mcc) };
    } catch (error) {
      logError(error, { route: "branchSeatsByState" });
      return { nmc: [], mcc: [] };
    }
  },
  ["branch-seats-by-state-v1"],
  { revalidate: 86400, tags: ["nmc", "mcc"] },
);

/**
 * The branch's seats in every state that has any, most seats first. `stateNames` are our state names (the PG state
 * pages'), used to fold NMC's and MCC's spellings onto ours; a state we do not list keeps its own spelling.
 */
export async function getBranchSeatsByState(course: string, stateNames: string[]): Promise<BranchSeatsByState | null> {
  const key = specialtyKey(course);
  if (!key) return null;
  const { nmc, mcc } = await loadAll();
  const ours = new Map(stateNames.map((n) => [stateKey(n), n]));
  const name = (s: string | null | undefined) => (s ? ours.get(stateKey(s)) ?? s.trim() : null);
  const by = new Map<string, BranchStateSeats & { colleges: Set<string> }>();
  const cell = (state: string) => {
    let c = by.get(state);
    if (!c) by.set(state, (c = { state, nmcSeats: 0, nmcColleges: 0, nmcGovt: 0, mccMdms: 0, mccDnb: 0, colleges: new Set() }));
    return c;
  };

  for (const r of nmc) {
    // NMC lists alternates in one name ("Radio-diagnosis /Radiology"); any part may be the specialty.
    const parts = String(r.name).replace(/^M\.\s?[DS]\.?\s*-?\s*/i, "").split("/").map((p) => p.trim()).filter(Boolean);
    if (!parts.some((p) => specialtyKey(p) === key)) continue;
    const st = name(r.state);
    if (!st) continue;
    const c = cell(st);
    c.nmcSeats += Number(r.seats);
    c.colleges.add(String(r.college));
    if (/govern/i.test(r.mgmt ?? "")) c.nmcGovt += Number(r.seats);
  }
  let year: number | null = null;
  for (const r of mcc) {
    if (specialtyKey(r.name) !== key) continue;
    const st = name(r.our_state) ?? name(r.mcc_state);
    if (!st) continue;
    year = Number(r.year);
    const c = cell(st);
    if (/^dnb$/i.test(r.matrix) || /^(DNB|DrNB)\b/i.test(r.name)) c.mccDnb += Number(r.seats);
    else c.mccMdms += Number(r.seats);
  }
  const out = [...by.values()]
    .map(({ colleges, ...c }) => ({ ...c, nmcColleges: colleges.size }))
    .filter((c) => c.nmcSeats + c.mccMdms + c.mccDnb > 0)
    .sort((a, b) => b.nmcSeats + b.mccDnb - (a.nmcSeats + a.mccDnb) || a.state.localeCompare(b.state));
  return out.length >= 3 ? { year, rows: out } : null;
}
