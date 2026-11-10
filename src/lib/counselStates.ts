/**
 * The counselling-guidance pages by state (2026-11-11): /counselling/neet-pg/<state>, /counselling/mbbs/<state> and the
 * index /counselling. Which states get a page, and the counselling year their titles name. Server only.
 *
 * A state gets a page only when it has data of its own to show: for NEET PG, three or more MD/MS colleges in our
 * results (the PG state pages' list); for MBBS, colleges on NMC's register (the MBBS state pages' list). A page is a
 * service page with the state's real counselling, seats, fees and notices — never a name swapped into one text.
 */

import { getPgStates } from "@/lib/pgStateQueries";
import { getMbbsStateSeats } from "@/lib/stateQueries";
import { stateKey } from "@/lib/stateNotices";

export const COUNSEL_PG_MIN_COLLEGES = 3;

/**
 * The counselling year a title names: NEET PG and NEET UG counselling run from about June to the following spring, so
 * from June it is this year's, before June still last year's.
 */
export function counsellingYear(now = new Date()): number {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.getUTCMonth() >= 5 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
}

export async function getCounselPgStates(): Promise<{ name: string; slug: string; mdms: number }[]> {
  const list = await getPgStates();
  return list.filter((s) => s.mdms >= COUNSEL_PG_MIN_COLLEGES).map((s) => ({ name: s.name, slug: s.slug, mdms: s.mdms }));
}

export async function getCounselUgStates(): Promise<{ name: string; slug: string; seats: number; colleges: number }[]> {
  const list = await getMbbsStateSeats();
  return list
    .filter((s) => s.nmc && s.nmc.colleges > 0 && !s.slug.includes("&"))
    .map((s) => ({ name: s.name, slug: s.slug, seats: s.nmc!.seats, colleges: s.nmc!.colleges }))
    .sort((a, b) => b.seats - a.seats);
}

/** The other level's page for the same state, by name (the two lists spell a few states differently). */
export function sameState<T extends { name: string }>(list: T[], name: string): T | undefined {
  const k = stateKey(name);
  return list.find((s) => stateKey(s.name) === k);
}
