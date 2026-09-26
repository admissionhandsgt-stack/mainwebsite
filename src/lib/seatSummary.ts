/**
 * The answer a visitor gets without signing in.
 *
 * The rows are the product, so they are gated — but a gate that shows nothing
 * earns no trust and ranks for nothing. This builds the other kind of answer
 * from the same rows: how many seats, in how many colleges and states, and
 * **per quota**, what ranks they closed at and what they cost.
 *
 * Why per quota and not one overall range: a college's government seat closing
 * at 2,130 and its management seat closing at 2,20,761 are not two points on one
 * scale, and a single "2,130 to 2,20,761 · from ₹7.83 lakh" line is the exact
 * bug the user caught on 2026-09-25. Grouping by quota first means every range
 * describes seats that are genuinely comparable.
 *
 * **Nothing here can be turned back into a row.** A count, and two ranges over a
 * group of colleges, do not say which college sits where — that is the whole
 * point. Someone reading this knows NRI seats in this branch run from ₹18 lakh
 * to ₹1.2 crore and stay open past rank 90,000, which is a real and useful
 * thing to know, and still has to ask us *which ones*.
 *
 * The rank and fee ranges are deliberately **kept apart**. Within a quota they
 * are still minima and maxima over different colleges, so the cheapest fee does
 * not belong to the widest rank. The UI labels them as two separate ranges and
 * never prints one beside the other as though they described one seat.
 */

export interface SummarisableSeat {
  college: string;
  state: string | null;
  quota: string;
  seats: number;
  r1: number | null;
  widest: number | null;
  feeInr: number | null;
  feeMaxInr?: number | null;
}

export interface QuotaSlice {
  quota: string;
  seats: number;
  colleges: number;
  /** The tightest round-1 close in this quota, and the furthest any round reached. */
  rankFrom: number | null;
  rankTo: number | null;
  /** Fees across the same group of colleges — not the same seat as the ranks. */
  feeFrom: number | null;
  feeTo: number | null;
}

export interface SeatSummary {
  seats: number;
  colleges: number;
  states: number;
  rows: number;
  quotas: QuotaSlice[];
  topStates: { state: string; seats: number }[];
}

/** Only zero means "not published". See the fee note in CLAUDE.md. */
const fee = (v: number | null | undefined): number | null => (v == null || v === 0 ? null : v);

const minOf = (values: (number | null)[]): number | null => {
  const real = values.filter((v): v is number => v != null);
  return real.length ? Math.min(...real) : null;
};

const maxOf = (values: (number | null)[]): number | null => {
  const real = values.filter((v): v is number => v != null);
  return real.length ? Math.max(...real) : null;
};

export function summariseSeats(rows: SummarisableSeat[]): SeatSummary {
  const byQuota = new Map<string, SummarisableSeat[]>();
  const byState = new Map<string, number>();
  const colleges = new Set<string>();

  for (const row of rows) {
    colleges.add(row.college);
    const quota = row.quota || "Other";
    const bucket = byQuota.get(quota);
    if (bucket) bucket.push(row);
    else byQuota.set(quota, [row]);

    if (row.state) byState.set(row.state, (byState.get(row.state) ?? 0) + row.seats);
  }

  const quotas: QuotaSlice[] = Array.from(byQuota.entries())
    .map(([quota, group]) => ({
      quota,
      seats: group.reduce((sum, r) => sum + r.seats, 0),
      colleges: new Set(group.map((r) => r.college)).size,
      rankFrom: minOf(group.map((r) => r.r1 ?? r.widest)),
      rankTo: maxOf(group.map((r) => r.widest ?? r.r1)),
      feeFrom: minOf(group.map((r) => fee(r.feeInr))),
      feeTo: maxOf(group.map((r) => fee(r.feeMaxInr) ?? fee(r.feeInr))),
    }))
    // Biggest quota first: it is the one most readers are asking about.
    .sort((a, b) => b.seats - a.seats);

  const topStates = Array.from(byState.entries())
    .map(([state, seats]) => ({ state, seats }))
    .sort((a, b) => b.seats - a.seats)
    .slice(0, 6);

  return {
    seats: rows.reduce((sum, r) => sum + r.seats, 0),
    colleges: colleges.size,
    states: byState.size,
    rows: rows.length,
    quotas,
    topStates,
  };
}

/** The cutoff-row shape a college page holds. */
export interface CutoffLike {
  course: string;
  quota: string;
  r1Latest: number | null;
  widestLatest: number | null;
  furthestEver?: number | null;
  seats: number | null;
  feeInr: number | null;
  latestYear: number | null;
}

/**
 * The same summary, for one college's own rows.
 *
 * The grain here is the branch rather than the college, so `colleges` counts
 * **branches** — the caller labels it accordingly (`unitLabel="branches"`). A
 * second field would have been clearer than a reused one; one summary shape that
 * both pages share is worth more than the name, and the label lives with the UI.
 */
export function summariseCollegeCutoffs(rows: CutoffLike[]): {
  summary: SeatSummary;
  years: string;
} {
  const summary = summariseSeats(
    rows.map((r) => ({
      college: r.course,
      state: null,
      quota: r.quota,
      seats: r.seats ?? 0,
      r1: r.r1Latest,
      widest: r.widestLatest ?? r.furthestEver ?? null,
      feeInr: r.feeInr,
    })),
  );

  const years = Array.from(
    new Set(rows.map((r) => r.latestYear).filter((y): y is number => y != null)),
  ).sort();

  return {
    summary,
    years:
      years.length === 0
        ? "—"
        : years.length === 1
          ? String(years[0])
          : `${years[0]}–${years[years.length - 1]}`,
  };
}
