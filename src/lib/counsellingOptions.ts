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
 * What can be paid **each year**, in rupees.
 *
 * Bands rather than a typed figure because nobody knows their exact ceiling, and
 * a number invites a false precision the seat list would then filter on.
 * `max: null` means no ceiling, which is a real answer on an NRI enquiry.
 *
 * Every label says "a year". The fee tables on this site are all per year and
 * the difference between ₹15 lakh a year and ₹15 lakh in total is the whole
 * decision, so the unit is never left to be inferred.
 */
export const BUDGET_BANDS = [
  { id: "under-5l", label: "Under ₹5 lakh a year", max: 500_000 },
  { id: "5-15l", label: "₹5–15 lakh a year", max: 1_500_000 },
  { id: "15-40l", label: "₹15–40 lakh a year", max: 4_000_000 },
  { id: "40l-1cr", label: "₹40 lakh – ₹1 crore a year", max: 10_000_000 },
  { id: "above-1cr", label: "Above ₹1 crore a year", max: null },
] as const;

export type BudgetBandId = (typeof BUDGET_BANDS)[number]["id"];

/**
 * What can be raised over the **whole course**, in rupees.
 *
 * Asked rather than multiplied. Three years × the yearly figure is wrong often
 * enough to matter: a management seat carries a deposit and a bond, hostel and
 * city cost money, some states charge more in later years — and what a family
 * can raise across three years is simply not three times what it can find this
 * year. It is its own number, and it is the one that decides whether a seat is
 * real.
 */
export const TOTAL_BUDGET_BANDS = [
  { id: "t-under-15l", label: "Under ₹15 lakh in total", max: 1_500_000 },
  { id: "t-15-50l", label: "₹15–50 lakh in total", max: 5_000_000 },
  { id: "t-50l-1cr", label: "₹50 lakh – ₹1 crore in total", max: 10_000_000 },
  { id: "t-1-3cr", label: "₹1–3 crore in total", max: 30_000_000 },
  { id: "t-above-3cr", label: "Above ₹3 crore in total", max: null },
] as const;

export type TotalBudgetBandId = (typeof TOTAL_BUDGET_BANDS)[number]["id"];

export interface CounsellingProfile {
  name?: string | null;
  rank?: number | null;
  category?: string | null;
  /** Several: nobody aims at one branch. */
  preferredBranches?: string[] | null;
  preferredState?: string | null;
  /** Ceiling in rupees a year. */
  budgetMax?: number | null;
  /** Ceiling in rupees over the whole course. */
  budgetTotalMax?: number | null;
  attempt?: string | null;
  mbbsCollege?: string | null;
}

/** How many branches one person may name. More than this is not a preference. */
export const MAX_BRANCHES = 5;

/** How much of the picture we hold, as a fraction — drives the nudge in the UI. */
export function completeness(p: CounsellingProfile): number {
  const fields = [
    p.name,
    p.rank,
    p.category,
    p.preferredBranches?.length ? "y" : null,
    p.preferredState,
    p.budgetMax,
    p.budgetTotalMax,
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
    [p.preferredBranches?.length ? "y" : null, "preferred branches"],
    [p.preferredState, "domicile state"],
    [p.budgetMax, "yearly budget"],
    [p.budgetTotalMax, "total budget"],
    [p.attempt, "attempt"],
    [p.mbbsCollege, "MBBS college"],
  ];
  return labels
    .filter(([v]) => v === null || v === undefined || String(v).trim() === "")
    .map(([, label]) => label);
}
