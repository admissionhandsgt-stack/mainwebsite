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
import { ATTEMPTS, BUDGET_BANDS, type CounsellingProfile } from "@/lib/counsellingOptions";

// Re-exported so server callers have one import. The definitions live in
// counsellingOptions.ts, which has no imports, because the client components
// need them too — see the note there.
export { ATTEMPTS, BUDGET_BANDS, completeness, missingFields } from "@/lib/counsellingOptions";
export type { Attempt, BudgetBandId, CounsellingProfile } from "@/lib/counsellingOptions";

const text = (v: unknown, max = 120): string | null => {
  const s = String(v ?? "").trim().slice(0, max);
  return s.length ? s : null;
};

/** Parse whatever the client sent into the shape the database takes. */
export function parseProfile(body: Record<string, unknown>): CounsellingProfile {
  const rankRaw = Number(String(body.rank ?? "").replace(/[^\d]/g, ""));
  const rank = Number.isFinite(rankRaw) && rankRaw > 0 && rankRaw <= 2_000_000 ? rankRaw : null;

  // The band id is what the UI sends; the number is ours, so a client cannot
  // invent a ceiling that the seat query would then trust.
  const band = BUDGET_BANDS.find((b) => b.id === body.budget);
  const budgetMax = band ? band.max : null;

  const attempt = ATTEMPTS.includes(String(body.attempt ?? "") as (typeof ATTEMPTS)[number])
    ? String(body.attempt)
    : null;

  return {
    name: text(body.name),
    rank,
    category: text(body.category, 48),
    preferredBranch: text(body.preferredBranch, 120),
    preferredState: text(body.preferredState, 120),
    budgetMax,
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
      preferred_branch     = COALESCE(${p.preferredBranch}, preferred_branch),
      preferred_state      = COALESCE(${p.preferredState}, preferred_state),
      budget_max           = COALESCE(${p.budgetMax}, budget_max),
      attempt              = COALESCE(${p.attempt}, attempt),
      mbbs_college         = COALESCE(${p.mbbsCollege}, mbbs_college),
      profile_completed_at = now()
    WHERE id = ${userId}
  `);
}

/** Read it back, so the tools open where the visitor left off. */
export async function getProfile(userId: number): Promise<CounsellingProfile | null> {
  const rows = (await db.execute(sql`
    SELECT name, rank, category, preferred_branch, preferred_state,
           budget_max, attempt, mbbs_college
      FROM users WHERE id = ${userId} LIMIT 1
  `)) as unknown as Record<string, unknown>[];

  const r = rows[0];
  if (!r) return null;

  return {
    name: (r.name as string) ?? null,
    rank: (r.rank as number) ?? null,
    category: (r.category as string) ?? null,
    preferredBranch: (r.preferred_branch as string) ?? null,
    preferredState: (r.preferred_state as string) ?? null,
    budgetMax: r.budget_max == null ? null : Number(r.budget_max),
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
      preferred_branch = COALESCE(preferred_branch, ${p.preferredBranch}),
      preferred_state  = COALESCE(preferred_state, ${p.preferredState}),
      budget_max       = COALESCE(budget_max, ${p.budgetMax}),
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
