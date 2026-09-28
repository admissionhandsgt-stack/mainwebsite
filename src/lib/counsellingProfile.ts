/**
 * What a counsellor needs to know before they can advise anybody.
 *
 * The team asks every enquiry for the same eight things. Until now the gate
 * collected two of them and often only one: of the six leads before this,
 * **four had no name and four had no rank**, so every call started by asking
 * questions the website could have asked while the person was still reading.
 *
 * ## Why it is not one form
 *
 * Eight fields at the gate would cost more leads than it gains detail. The split
 * is by what the visitor gets back for answering, not by what we would like:
 *
 * - **Name and phone** are the gate. Nothing else, and the name is now required
 *   rather than quietly recorded as "Not given".
 * - **Rank, category, branch, home state and budget** go in the tuner, shown the
 *   moment the seats appear. Every one of them visibly narrows the list in front
 *   of them, so answering is the fastest way to a better answer rather than a
 *   toll on the way to it.
 * - **Attempt and MBBS college** change nothing on screen; they only tell a
 *   counsellor who they are talking to. So they are asked in the counselling
 *   request, where the visitor is the one asking for something.
 *
 * Server-only: it writes to `users` and to `leads`.
 */

import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import {
  ATTEMPTS,
  BUDGET_BANDS,
  TOTAL_BUDGET_BANDS,
  MAX_BRANCHES,
  type CounsellingProfile,
} from "@/lib/counsellingOptions";

// Re-exported so server callers have one import. The definitions live in
// counsellingOptions.ts, which has no imports, because the client components
// need them too — see the note there.
export {
  ATTEMPTS,
  BUDGET_BANDS,
  TOTAL_BUDGET_BANDS,
  MAX_BRANCHES,
  completeness,
  missingFields,
} from "@/lib/counsellingOptions";
export type {
  Attempt,
  BudgetBandId,
  TotalBudgetBandId,
  CounsellingProfile,
} from "@/lib/counsellingOptions";

/**
 * A `text[]` literal the driver will not take apart.
 *
 * Drizzle expands a JS array inside a `sql` template into `$1, $2, …`, so
 * `COALESCE(${arr}, col)` compiles to `COALESCE($1, $2, col)` — which is not a
 * type error, just quietly the wrong statement, and the branches were silently
 * never stored. The same trap as `= ANY(${arr})` in the predictor; the fix is
 * the same, build the array in SQL.
 */
function textArray(values: string[] | null | undefined) {
  if (!values || values.length === 0) return sql`NULL::text[]`;
  return sql`ARRAY[${sql.join(
    values.map((v) => sql`${v}`),
    sql`, `,
  )}]::text[]`;
}

const text = (v: unknown, max = 120): string | null => {
  const s = String(v ?? "").trim().slice(0, max);
  return s.length ? s : null;
};

/**
 * Parse whatever the client sent into the shape the database takes.
 *
 * **Every field is checked here, not only in the browser.** The form validates
 * so somebody is told what is wrong while they are looking at it; this decides
 * what is stored, because a POST does not have to come from the form. A band id
 * is looked up rather than trusted, a rank outside the real range becomes null
 * rather than a number, and anything that is not a string in a string field is
 * dropped instead of being coerced into `"[object Object]"`.
 */
export function parseProfile(body: Record<string, unknown>): CounsellingProfile {
  const rankRaw = Number(String(body.rank ?? "").replace(/[^\d]/g, ""));
  const rank = Number.isFinite(rankRaw) && rankRaw > 0 && rankRaw <= 2_000_000 ? rankRaw : null;

  // The band id is what the UI sends; the number is ours, so a client cannot
  // invent a ceiling that the seat query would then trust.
  const band = BUDGET_BANDS.find((b) => b.id === body.budget);
  const budgetMax = band ? band.max : null;

  const totalBand = TOTAL_BUDGET_BANDS.find((b) => b.id === body.budgetTotal);
  const budgetTotalMax = totalBand ? totalBand.max : null;

  /**
   * Branches: an array of non-empty strings, deduplicated and capped.
   *
   * Not validated against the branch list. The names come from the CMS and the
   * counselling authorities rename them between years, so rejecting an unknown
   * one would silently drop a real preference. The length cap and the string
   * check are what stop this column being used as free storage.
   */
  const branchesRaw = Array.isArray(body.preferredBranches)
    ? body.preferredBranches
    : typeof body.preferredBranch === "string"
      ? [body.preferredBranch]
      : [];

  const preferredBranches = Array.from(
    new Set(
      branchesRaw
        .filter((b): b is string => typeof b === "string")
        .map((b) => b.trim().slice(0, 120))
        .filter(Boolean),
    ),
  ).slice(0, MAX_BRANCHES);

  const attempt = ATTEMPTS.includes(String(body.attempt ?? "") as (typeof ATTEMPTS)[number])
    ? String(body.attempt)
    : null;

  return {
    name: text(body.name),
    rank,
    category: text(body.category, 48),
    preferredBranches: preferredBranches.length ? preferredBranches : null,
    preferredState: text(body.preferredState, 120),
    budgetMax,
    budgetTotalMax,
    attempt,
    mbbsCollege: text(body.mbbsCollege, 180),
  };
}

/**
 * Save it to the visitor's account.
 *
 * Every field is `COALESCE`d over what is already there, so a partial answer
 * adds to the picture and never blanks a field the visitor filled in earlier.
 * Somebody who skips the budget question this time keeps the budget they gave
 * last time.
 */
export async function saveProfile(userId: number, p: CounsellingProfile): Promise<void> {
  await db.execute(sql`
    UPDATE users SET
      name                 = COALESCE(${p.name}, name),
      rank                 = COALESCE(${p.rank}, rank),
      category             = COALESCE(${p.category}, category),
      preferred_branches   = COALESCE(${textArray(p.preferredBranches)}, preferred_branches),
      -- Kept in step so anything still reading the single column sees the
      -- first choice rather than nothing.
      preferred_branch     = COALESCE(${p.preferredBranches?.[0] ?? null}, preferred_branch),
      preferred_state      = COALESCE(${p.preferredState}, preferred_state),
      budget_max           = COALESCE(${p.budgetMax}, budget_max),
      budget_total_max     = COALESCE(${p.budgetTotalMax}, budget_total_max),
      attempt              = COALESCE(${p.attempt}, attempt),
      mbbs_college         = COALESCE(${p.mbbsCollege}, mbbs_college),
      profile_completed_at = now()
    WHERE id = ${userId}
  `);
}

/** Read it back, so the tools open where the visitor left off. */
export async function getProfile(userId: number): Promise<CounsellingProfile | null> {
  const rows = (await db.execute(sql`
    SELECT name, rank, category, preferred_branches, preferred_branch, preferred_state,
           budget_max, budget_total_max, attempt, mbbs_college
      FROM users WHERE id = ${userId} LIMIT 1
  `)) as unknown as Record<string, unknown>[];

  const r = rows[0];
  if (!r) return null;

  return {
    name: (r.name as string) ?? null,
    rank: (r.rank as number) ?? null,
    category: (r.category as string) ?? null,
    preferredBranches:
      (r.preferred_branches as string[] | null) ??
      // Older rows only ever had the single column.
      (r.preferred_branch ? [r.preferred_branch as string] : null),
    preferredState: (r.preferred_state as string) ?? null,
    budgetMax: r.budget_max == null ? null : Number(r.budget_max),
    budgetTotalMax: r.budget_total_max == null ? null : Number(r.budget_total_max),
    attempt: (r.attempt as string) ?? null,
    mbbsCollege: (r.mbbs_college as string) ?? null,
  };
}

/**
 * Attach what we have learned to the enquiry this visitor already made.
 *
 * The lead was written when they unlocked; the detail arrives a minute later.
 * Rather than a second lead — which would have a counsellor ringing the same
 * person twice — the newest enquiry from that number in the last day is
 * enriched in place.
 *
 * `COALESCE` again, and in this direction on purpose: the enquiry keeps what it
 * said at the time, and only its blanks are filled.
 */
export async function enrichLead(phone: string, p: CounsellingProfile): Promise<boolean> {
  const rows = (await db.execute(sql`
    UPDATE leads SET
      name             = CASE WHEN name IS NULL OR name = 'Not given'
                              THEN COALESCE(${p.name}, name) ELSE name END,
      rank             = COALESCE(rank, ${p.rank}),
      category         = COALESCE(category, ${p.category}),
      -- Joined for a reader: the admin screen and the CSV both render this
      -- column, and a counsellor wants "Radiology, Dermatology", not an array.
      preferred_branch = COALESCE(preferred_branch, ${p.preferredBranches?.join(", ") ?? null}),
      preferred_state  = COALESCE(preferred_state, ${p.preferredState}),
      budget_max       = COALESCE(budget_max, ${p.budgetMax}),
      budget_total_max = COALESCE(budget_total_max, ${p.budgetTotalMax}),
      attempt          = COALESCE(attempt, ${p.attempt}),
      mbbs_college     = COALESCE(mbbs_college, ${p.mbbsCollege}),
      updated_at       = now()
    WHERE id = (
      SELECT id FROM leads
       WHERE phone = ${phone} AND created_at >= now() - interval '24 hours'
       ORDER BY created_at DESC LIMIT 1
    )
    RETURNING id
  `)) as unknown as { id: number }[];

  return rows.length > 0;
}
