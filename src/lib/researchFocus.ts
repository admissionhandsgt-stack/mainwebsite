/**
 * What the research and the hunt chase (2026-11-11, owner: "keyword hunt and research usko bolo NEET PG ko target kare,
 * MBBS is almost over for this year now"). `serp.focus` in integrations: "pg" (the default — NEET PG only) or "all"
 * (next year's NEET UG season). Under "pg", a search or a seed that is about MBBS / NEET UG / BDS alone is skipped by
 * the autocomplete seeds (lib/serpSuggest.ts), the hourly research (lib/serpResearch.ts) and the daily hunt
 * (lib/hunt.ts); one that also names PG (MD/MS, DNB, stipend, bond) stays. Import-free apart from integrations.
 */
import { getIntegration } from "@/lib/integrations";

const UG_WORDS = /\b(mbbs|neet ?-?ug|bds|ugmac|acpugmec|ug|under ?grad\w*|neet 2026 counselling)\b/i;
const PG_WORDS = /\b(pg|md|ms|dnb|drnb|post ?grad\w*|neet ?-?pg|stipend|bond|residency|resident|mds|neet ss|super ?speciality)\b/i;

/** About MBBS / NEET UG / BDS alone — no PG word in it. */
export const ugOnly = (q: string): boolean => UG_WORDS.test(q) && !PG_WORDS.test(q);

export async function pgFocus(): Promise<boolean> {
  return ((await getIntegration("serp.focus").catch(() => null)) ?? "pg").trim().toLowerCase() !== "all";
}
