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

/**
 * The CMS (`mbbs_states`) and the counselling extract (`states`) spell some
 * states differently. Keyed by the CMS slug; the value is the extract's name.
 */
const EXTRACT_NAME: Record<string, string> = {
  "andaman-and-nicobar-islands": "Andaman Nicobar Island",
  chattisgarh: "Chhattisgarh",
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
}

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

  return {
    state,
    colleges,
    counsellings,
    seatOptions,
    years,
    others: states.filter((s) => s.slug !== slug).map((s) => ({ name: s.name, slug: s.slug })),
  };
}
