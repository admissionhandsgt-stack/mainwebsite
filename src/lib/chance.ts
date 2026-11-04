/**
 * How a seat is described to a student: words, never ranks.
 *
 * No server imports, so client components can use it (see the note at the top of
 * counsellingOptions.ts for why that matters in this codebase). Its one import,
 * categoryScope.ts, is import-free too.
 *
 * The bands themselves are decided on the server from the published closing
 * ranks (lib/predictor.ts). What leaves the server is only the word and an
 * approximate fee bracket — the rank behind the word is the counsellor's to
 * talk through, which is the product.
 */

import { OPEN_CODES } from "@/lib/categoryScope";

export type ChanceBand = "safe" | "likely" | "possible" | "stretch";

export const CHANCE_ORDER: ChanceBand[] = ["safe", "likely", "possible", "stretch"];

export const CHANCE: Record<ChanceBand, { label: string; short: string; hint: string }> = {
  safe: {
    label: "High chance",
    short: "High",
    hint: "Seats like this were within reach for a rank like yours in the first round.",
  },
  likely: {
    label: "Good chance",
    short: "Good",
    hint: "Reached a rank like yours as later rounds moved — worth placing high.",
  },
  possible: {
    label: "Possible",
    short: "Possible",
    hint: "Has reached a rank like yours before, though not every year.",
  },
  stretch: {
    label: "Reach",
    short: "Reach",
    hint: "Ambitious for this rank — keep it in the list, not at the top.",
  },
};

/**
 * Fee brackets, in rupees a year. A bracket, not a figure: the published fee
 * schedules carry slips, later-year changes and hostel splits, and a precise
 * number reads as a quote. The asterisk on every bracket says so.
 */
const FEE_STEPS = [
  0, 100_000, 300_000, 500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000,
];

function stepLabel(v: number): string {
  if (v >= 10_000_000) return `${v / 10_000_000} Cr`;
  return `${v / 100_000} L`;
}

/** The bracket a fee falls in: [lower, upper | null]. */
function bracket(fee: number): [number, number | null] {
  for (let i = FEE_STEPS.length - 1; i >= 0; i--) {
    if (fee >= FEE_STEPS[i]) return [FEE_STEPS[i], FEE_STEPS[i + 1] ?? null];
  }
  return [0, FEE_STEPS[1]];
}

/**
 * "≈ ₹10–20 L/yr*" from a low and a high published fee. Null when nothing is
 * published — and a fee of 0 counts as not published (see CLAUDE.md: 0 means
 * the authority left it blank, not that the seat is free).
 */
export function approxFee(min: number | null | undefined, max?: number | null): string | null {
  const lo = typeof min === "number" && min > 0 ? min : null;
  const hi = typeof max === "number" && max > 0 ? max : lo;
  if (lo == null || hi == null) return null;
  const [a] = bracket(Math.min(lo, hi));
  const [topLo, b] = bracket(Math.max(lo, hi));
  const top = b ?? topLo; // past the last step the bracket is open-ended
  const plus = b == null ? "+" : "";
  if (a === 0) {
    // From a near-free government seat up to a dear one: name both ends.
    if (top <= FEE_STEPS[1]) return `≈ under ₹${stepLabel(FEE_STEPS[1])} /yr*`;
    return `≈ under ₹${stepLabel(FEE_STEPS[1])} – ${stepLabel(top)}${plus} /yr*`;
  }
  if (a === top) return `≈ ₹${stepLabel(a)}${plus} /yr*`;
  const from = stepLabel(a);
  const to = stepLabel(top);
  // "₹5–10 L", but "₹50 L – 1 Cr" when the units differ.
  const sameUnit = from.split(" ")[1] === to.split(" ")[1];
  return sameUnit
    ? `≈ ₹${from.split(" ")[0]}–${to}${plus} /yr*`
    : `≈ ₹${from} – ${to}${plus} /yr*`;
}

export const FEE_FOOTNOTE =
  "*Approximate yearly fee bracket from published fee schedules — the tuition alone wherever the notice prints it. The exact fee, hostel, deposit and bond for your quota are confirmed with your counsellor.";

/**
 * A fee row's figure counts as a year's fee: per year, the first year, or as imported (no period).
 * A whole-course or period-not-stated figure is never a year's fee and never divided into one
 * (owner, 2026-11-04) — seat_options leaves it out of every per-year bracket (migration 0046).
 */
export const isYearlyFee = (period: string | null | undefined) =>
  !period || period === "per year" || period === "first year";

/** One figure's bracket, said for its own period: "/yr", "in year 1", "for the whole course", or no period at all. */
export function approxFeeFor(inr: number | null | undefined, period: string | null | undefined): string | null {
  const b = approxFee(inr);
  if (!b) return null;
  if (period === "first year") return b.replace(" /yr*", " in year 1*");
  if (period === "whole course") return b.replace(" /yr*", " for the whole course*");
  if (period === "not stated") return b.replace(" /yr*", "*");
  return b;
}

/**
 * What a labelled figure is (migration 0046). "Tuition fee" is the tuition alone; "Fee (as printed) - …" /
 * "Fee (as KEA lists it - …)" is the notice's own figure where it prints no tuition alone — never called tuition.
 */
export function feeKind(label: string | null | undefined): {
  kind: "tuition" | "printed" | null;
  /** "Tuition fee", "Fee as printed", "Fee as KEA lists it". */
  short: string | null;
  /** What the notice says the figure covers, when it says. */
  detail: string | null;
} {
  if (!label) return { kind: null, short: null, detail: null };
  // "Tuition fee - as printed in the board's 2026-27 fee sheet - confirm with the college before paying"
  const tuition = label.match(/^Tuition fee(?:\s+-\s+(.+))?$/i);
  if (tuition) return { kind: "tuition", short: "Tuition fee", detail: tuition[1]?.trim() ?? null };
  if (/^Tuition fee/i.test(label)) return { kind: "tuition", short: "Tuition fee", detail: null };
  const printed = label.match(/^Fee \(as printed\)\s*-\s*(.+)$/i);
  if (printed) return { kind: "printed", short: "Fee as printed", detail: printed[1].trim() };
  // "Fee (as KEA lists it - includes the university's registration / admission fees, not itemised)"
  const inner = label.match(/^Fee \(([^)]+?)(?:\s+-\s+(.+))?\)$/i);
  if (inner) return { kind: "printed", short: `Fee ${inner[1].trim()}`, detail: inner[2]?.trim() ?? null };
  return { kind: "printed", short: "Fee as printed", detail: null };
}

/** Under a college's fee table: what each kind of figure is. */
export const FEE_TABLE_NOTE =
  "*Approximate brackets. \"Tuition fee\" is the tuition alone — development, university and other charges are extra. " +
  "\"Fee as printed\" is the notice's own figure where it prints no tuition alone. A dollar fee is shown in rupees " +
  "at ₹95.98 a dollar, approximately. \"2025-26\" marks a fee the college has not yet published for 2026-27. " +
  "The exact fee, hostel, deposit and bond for your quota are confirmed with your counsellor.";

/**
 * A rank range is published only over a group of at least this many colleges.
 * A "range" over one college is that college's cut under another name — a
 * Karnataka quota that only CMC Vellore uses, a central MDS quota at one
 * institute — and over two it is still nearly so (2026-10-12, lib/depth.ts).
 */
export const MIN_GROUP = 3;

export function groupRank(value: number | null | undefined, colleges: number): number | null {
  return colleges >= MIN_GROUP && typeof value === "number" ? value : null;
}

/* ------------------------------------------------------------ rank bands
 *
 * The middle path for search (2026-10-12): a college page answers "what is the
 * cutoff" with a band, never the rank — "≈ 15K–20K*", the way a fee is a
 * bracket. Bands widen with the rank so the precision is proportional: a
 * band at 1K is 1K wide, at 1 lakh it is 50K wide. Only the general category
 * on merit quotas is shown publicly; every other category, NRI and management
 * is the chance view after sign-in.
 */
const RANK_STEPS = [
  0, 500, 1_000, 2_000, 3_500, 5_000, 7_500, 10_000, 15_000, 20_000, 30_000, 50_000, 75_000,
  100_000, 150_000, 200_000, 300_000, 500_000, 1_000_000,
];

function rankLabel(v: number): string {
  if (v >= 100_000) return `${+(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000) return `${+(v / 1_000).toFixed(1)}K`;
  return String(v);
}

/** "≈ 15K–20K*" for a closing rank. */
export function rankBand(rank: number | null | undefined): string | null {
  if (typeof rank !== "number" || rank <= 0) return null;
  for (let i = RANK_STEPS.length - 1; i >= 0; i--) {
    if (rank > RANK_STEPS[i]) {
      const hi = RANK_STEPS[i + 1];
      if (!hi) return `≈ ${rankLabel(RANK_STEPS[i])}+*`;
      return i === 0 ? `≈ under ${rankLabel(hi)}*` : `≈ ${rankLabel(RANK_STEPS[i])}–${rankLabel(hi)}*`;
    }
  }
  return null;
}

export const BAND_FOOTNOTE =
  "*A band, not the exact rank — where the last general-category seat on that quota was taken across all rounds of that year. Your counsellor has the round-by-round detail, and your own chance is shown after a free sign-in.";

/**
 * The open / general category, as each counselling spells it — the predictor's lists
 * (lib/categoryScope.ts) for both levels, plus Gujarat's institutional and in-service open
 * codes, whose quotas isMeritQuota judges. Not NRI or management, which are quotas.
 * TN's OC, Odisha's OP, Punjab's GQ-GEN, Delhi's Open and Karnataka's GMP joined on 2026-10-27,
 * which gave about 120 MBBS colleges their first general band.
 */
export const GENERAL_CODES = new Set([...OPEN_CODES.pg, ...OPEN_CODES.ug, "UQ-OP", "IQ-OP"]);

/** A merit quota — All India or a state's own — not a paid, NRI, management or institutional one. */
export function isMeritQuota(quota: string): boolean {
  // "Mgmt" and "Mgt" were let through until 2026-10-17 (TN Mgmt Quota, MAHA
  // Priv-Mgmt, APMgmt-CatB1…), so a college page could show a management
  // seat's band as its "general cutoff"; minority and sponsored seats are not
  // open merit seats either. Private colleges' state-merit seats ("Private",
  // "Pvt Govt Quota") are merit and stay.
  return !/NRI|manag|MNG|Mgmt|Mgt\b|minority|sponsor|paid|deemed|institut|Others|ESI|\bSF-|Open Seat|NQ|MQ/i.test(quota);
}
