/**
 * The NEET PG process page's lists as shipped (moved out of the page 2026-10-18) —
 * the fallbacks for the admin's `pg_process_rounds` and `pg_process_mistakes`
 * collections. The schedule's fallback stays in lib/neetPgSchedule.ts.
 * No imports — the seed script reads this file too.
 */

export interface PgRound {
  tag: string;
  title: string;
  summary: string;
  detail: string[];
  watch?: string;
}

export const PG_ROUNDS: PgRound[] = [
  {
    tag: "R1",
    title: "Round 1 — register, fill choices, lock",
    summary: "The only round where every seat is still on the table.",
    detail: [
      "Register separately for AIQ on mcc.nic.in and for your state on its own portal. They are different accounts, different fees and different deadlines — being registered for one does not register you for the other.",
      "Fill every college and branch you would genuinely accept, in true order of preference. Allotment walks your list from the top and stops at the first seat your rank reaches.",
      "Lock your choices before the deadline. An unlocked list is auto-locked as it stands, which is how people end up allotted to a choice they meant to delete.",
      "If allotted, report to the college within the reporting window with your originals. Miss it and the seat is gone — there is no extension.",
    ],
    watch:
      "Filling a short list. A list of ten choices means ten chances to be allotted; the candidates who go unallotted in round 1 are almost always the ones who filled only the colleges they wanted rather than every college they would accept.",
  },
  {
    tag: "R2",
    title: "Round 2 — upgrade, or hold what you have",
    summary: "The first point where a decision can cost you the seat in your hand.",
    detail: [
      "Candidates unallotted in round 1 get a fresh shot at everything still vacant.",
      "If you hold a round-1 seat you choose between keeping it and entering round 2 for something better. Entering means the round-1 seat goes back into the pool.",
      "Upgrades free seats further down, which is why a later round can reach much deeper than round 1 did.",
      "Fresh registration is normally open, so the competition is not only the people who were there in round 1.",
    ],
    watch: "Floating on the assumption that the cut always loosens. It usually does — but not everywhere, and a seat you give up is not held for you.",
  },
  {
    tag: "R3",
    title: "Round 3 / mop-up — the pool changes shape",
    summary: "Vacancies from every earlier round, opened up again.",
    detail: [
      "Seats surrendered, never reported to, or left vacant come back here.",
      "Deemed university seats in particular move a lot in this round, because candidates who were holding them for safety release them once they upgrade elsewhere.",
      "Rules on who may participate tighten as the rounds go on — read the current information bulletin rather than last year's advice.",
    ],
    watch:
      "Assuming mop-up is a formality for leftovers. Our data has round-3 cuts reaching far better ranks than round 2 in a meaningful slice of seats — for those, the best time to take the seat was earlier.",
  },
  {
    tag: "R4+",
    title: "Stray vacancy — the last call",
    // Corrected 2026-10-18: MCC runs its PG stray vacancy round itself, online; it was
    // described as "institute-level … by the institutes themselves".
    summary: "Fast, short and effectively final.",
    detail: [
      "Whatever is still unfilled is allotted here. MCC runs its stray vacancy round online; some states hand their last vacancies to the colleges.",
      "It moves quickly and the window is short. Decisions are made in days, not weeks.",
      "A seat accepted in a stray round is normally binding — the exits available earlier are not available now.",
    ],
    watch: "Treating this as a safety net for a whole strategy. By the time you reach it the choice is whatever nobody else took.",
  },
];

export const PG_MISTAKES: { title: string; body: string }[] = [
  {
    title: "Registering for only one counselling",
    body: "AIQ and state quota run in parallel on separate portals. Registering for both is allowed and costs you nothing but the fee — skipping one halves your chances for no reason.",
  },
  {
    title: "Filling a short choice list",
    body: "Allotment can only give you a seat you asked for. Every college you would accept belongs on the list, in honest order.",
  },
  {
    title: "Reading the last round as the widest cut",
    body: "A final round can close far tighter than round 2, because upgrades free seats to much better ranks. Judging a college by its last round understates what it actually reached.",
  },
  {
    title: "Missing the reporting window",
    body: "The allotment is not the seat. Reporting with originals inside the window is the seat, and the deadline does not move.",
  },
];
