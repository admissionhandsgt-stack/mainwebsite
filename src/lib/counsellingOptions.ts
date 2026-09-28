/**
 * The choices the counselling profile offers, with no imports.
 *
 * Its own file because `ProfileTuner` and `CounsellingCTA` are client
 * components and `counsellingProfile.ts` reads the database. Importing the
 * constants from there pulls the `postgres` driver into the browser bundle and
 * the build fails with `Can't resolve 'net'` — the fourth time this codebase has
 * hit that, after `mediaService`, `documentCatalogue` and `branchSlug`.
 *
 * The rule it keeps proving: **anything a browser imports must have no server
 * dependency.** Constants and types live apart from the queries that use them.
 */

/** NEET PG attempt. A label, because the useful distinction is fresher vs repeater. */
export const ATTEMPTS = ["1st attempt", "2nd attempt", "3rd attempt", "4th or more"] as const;

export type Attempt = (typeof ATTEMPTS)[number];

/**
 * Budget bands, in rupees a year.
 *
 * Bands rather than a typed figure because nobody knows their exact ceiling, and
 * a number invites a false precision the seat list would then filter on.
 * `max: null` means no ceiling, which is a real answer on an NRI enquiry.
 */
export const BUDGET_BANDS = [
  { id: "under-5l", label: "Under ₹5 lakh", max: 500_000 },
  { id: "5-15l", label: "₹5–15 lakh", max: 1_500_000 },
  { id: "15-40l", label: "₹15–40 lakh", max: 4_000_000 },
  { id: "40l-1cr", label: "₹40 lakh – ₹1 crore", max: 10_000_000 },
  { id: "above-1cr", label: "Above ₹1 crore", max: null },
] as const;

export type BudgetBandId = (typeof BUDGET_BANDS)[number]["id"];

export interface CounsellingProfile {
  name?: string | null;
  rank?: number | null;
  category?: string | null;
  preferredBranch?: string | null;
  preferredState?: string | null;
  budgetMax?: number | null;
  attempt?: string | null;
  mbbsCollege?: string | null;
}

/** How much of the picture we hold, as a fraction — drives the nudge in the UI. */
export function completeness(p: CounsellingProfile): number {
  const fields = [
    p.name,
    p.rank,
    p.category,
    p.preferredBranch,
    p.preferredState,
    p.budgetMax,
    p.attempt,
    p.mbbsCollege,
  ];
  return (
    fields.filter((v) => v !== null && v !== undefined && String(v).trim() !== "").length /
    fields.length
  );
}

/** What is still unknown, in the words a counsellor would use on the call. */
export function missingFields(p: CounsellingProfile): string[] {
  const labels: [unknown, string][] = [
    [p.rank, "rank"],
    [p.category, "category"],
    [p.preferredBranch, "preferred branch"],
    [p.preferredState, "domicile state"],
    [p.budgetMax, "budget"],
    [p.attempt, "attempt"],
    [p.mbbsCollege, "MBBS college"],
  ];
  return labels
    .filter(([v]) => v === null || v === undefined || String(v).trim() === "")
    .map(([, label]) => label);
}
