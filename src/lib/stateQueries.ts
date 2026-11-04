/**
 * What a state page (`/mbbs-india/[state]`) is built from.
 *
 * These 33 pages used to be a client component that fetched two CMS lists from
 * `/api/content/*` after load — which robots.txt keeps crawlers out of, so
 * Google saw a hero reading "Study MBBS in" and nothing else. They were also
 * linked from nowhere, and any slug at all rendered a 200. Everything here is
 * read on the server, from the same counselling data the predictor uses.
 *
 * **What is deliberately not here: a state-wide cutoff.** Category codes differ
 * by counselling (UR, OPEN, OPEN-GEN, GM, BCA-GEN …), so "the general cutoff in
 * Karnataka" would mean mapping each one — a guess presented as a figure. Each
 * college's own page carries its ranks, with the quota beside every one.
 * Fees are left out for the same reason: the UG fee rows include values like
 * ₹5 a year, and a plausibility floor would be inventing a number.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getMbbsStates, getUgColleges, type MbbsState, type UgCollege } from "@/lib/content";
import { logError } from "@/lib/logger";
import { stateKey } from "@/lib/nmcSync";
import { getPgStates } from "@/lib/pgStateQueries";

/**
 * The CMS (`mbbs_states`) and the counselling extract (`states`) spell some
 * states differently. Keyed by the CMS slug; the value is the extract's name.
 */
const EXTRACT_NAME: Record<string, string> = {
  "andaman-and-nicobar-islands": "Andaman Nicobar Island",
  "dadra-and-nagar-haveli": "Dadra Nagar Havelli",
  "jammu-and-kashmir": "Jammu and Kashmir",
  pondicherry: "Puducherry",
};

export const extractStateName = (s: Pick<MbbsState, "slug" | "name">) => EXTRACT_NAME[s.slug] ?? s.name;

export interface StateCounselling {
  name: string;
  authority: string | null;
  colleges: number;
}

export interface StatePage {
  state: MbbsState;
  colleges: UgCollege[];
  counsellings: StateCounselling[];
  /** MBBS seat options with published closing ranks — (college, quota, category) tuples, not intake. */
  seatOptions: number;
  years: number[];
  others: { name: string; slug: string }[];
  /** NMC's register for the state: every permitted MBBS college and its approved seats. */
  nmc: NmcStateMbbs | null;
  /** The same state's MD/MS page, when it has one. */
  pgSlug: string | null;
}

export interface NmcStateMbbs {
  colleges: number;
  seats: number;
  govtColleges: number;
  govtSeats: number;
}

/**
 * "mbbs seats in karnataka 2026" is how a state is searched (2026-11-04 keyword
 * study). The regulator's register answers it for every state; our own college
 * list does not, because it holds only colleges a counselling has allotted.
 * NMC files deemed universities as Private, so "private" below includes them.
 */
const loadNmcByState = unstable_cache(
  async (): Promise<Record<string, NmcStateMbbs>> => {
    const r = (await db.execute(sql`
      SELECT state_name AS state, COUNT(DISTINCT college_code)::int AS colleges,
             COALESCE(SUM(approved_seat), 0)::int AS seats,
             COUNT(DISTINCT college_code) FILTER (WHERE management_type = 'Government')::int AS govt_colleges,
             COALESCE(SUM(approved_seat) FILTER (WHERE management_type = 'Government'), 0)::int AS govt_seats
        FROM nmc_courses WHERE course_type = 'M.B.B.S.' GROUP BY state_name
    `)) as unknown as { state: string; colleges: number; seats: number; govt_colleges: number; govt_seats: number }[];
    const out: Record<string, NmcStateMbbs> = {};
    for (const x of r) {
      out[stateKey(x.state)] = {
        colleges: Number(x.colleges),
        seats: Number(x.seats),
        govtColleges: Number(x.govt_colleges),
        govtSeats: Number(x.govt_seats),
      };
    }
    return out;
  },
  ["state-page-nmc-mbbs-v1"],
  { revalidate: 86400, tags: ["nmc"] },
);

const loadCounsellings = unstable_cache(
  async (stateName: string) => {
    const [byCounselling, totals] = await Promise.all([
      db.execute(sql`
        SELECT c.name, c.authority, COUNT(DISTINCT so.institute_id)::int AS colleges
          FROM seat_options so
          JOIN institutes i   ON i.id = so.institute_id
          JOIN states st      ON st.id = i.state_id
          JOIN courses co     ON co.id = so.course_id
          JOIN counsellings c ON c.id = so.counselling_id
         WHERE so.level = 'ug' AND co.name ILIKE 'MBBS' AND st.name = ${stateName}
         GROUP BY c.name, c.authority
         ORDER BY colleges DESC, c.name
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS options,
               COALESCE(array_agg(DISTINCT so.latest_year ORDER BY so.latest_year), '{}') AS years
          FROM seat_options so
          JOIN institutes i ON i.id = so.institute_id
          JOIN states st    ON st.id = i.state_id
          JOIN courses co   ON co.id = so.course_id
         WHERE so.level = 'ug' AND co.name ILIKE 'MBBS' AND st.name = ${stateName}
      `),
    ]);
    const t = (totals as unknown as { options: number; years: number[] | string }[])[0];
    // A raw SELECT can hand an array back as its text form, "{2025,2026}".
    const years = Array.isArray(t?.years)
      ? t.years.map(Number)
      : String(t?.years ?? "").replace(/[{}]/g, "").split(",").filter(Boolean).map(Number);
    return {
      counsellings: (byCounselling as unknown as StateCounselling[]).map((r) => ({
        name: r.name,
        authority: r.authority ?? null,
        colleges: Number(r.colleges),
      })),
      seatOptions: Number(t?.options ?? 0),
      years,
    };
  },
  ["state-page-counsellings-v1"],
  { revalidate: 3600, tags: ["seat-data"] },
);

/** null means there is no such state — the page should 404, not render an empty shell. */
export async function getStatePage(slug: string): Promise<StatePage | null> {
  const states = await getMbbsStates();
  const state = states.find((s) => s.slug === slug);
  if (!state) return null;

  const name = extractStateName(state);
  const colleges = (await getUgColleges()).filter((c) => c.state === name);

  let counsellings: StateCounselling[] = [];
  let seatOptions = 0;
  let years: number[] = [];
  try {
    ({ counsellings, seatOptions, years } = await loadCounsellings(name));
  } catch (error) {
    logError(error, { route: "stateQueries" });
  }

  const keys = [stateKey(name), stateKey(state.name)];
  let nmc: NmcStateMbbs | null = null;
  let pgSlug: string | null = null;
  try {
    const [byState, pgStates] = await Promise.all([loadNmcByState(), getPgStates()]);
    nmc = keys.map((k) => byState[k]).find(Boolean) ?? null;
    pgSlug = pgStates.find((s) => s.mdms > 0 && keys.includes(stateKey(s.name)))?.slug ?? null;
  } catch (error) {
    logError(error, { route: "stateQueries:nmc" });
  }

  return {
    state,
    colleges,
    counsellings,
    seatOptions,
    years,
    others: states.filter((s) => s.slug !== slug).map((s) => ({ name: s.name, slug: s.slug })),
    nmc,
    pgSlug,
  };
}
