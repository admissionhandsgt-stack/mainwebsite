/**
 * The round-result shapes the browser also needs (components/mcc/RoundCuts). No imports, so a client
 * component can take them without pulling lib/mccResults — and the database driver — into its bundle.
 */

/**
 * The three seat families a round's branch table is read in. MCC renames them between years
 * ("Management/Paid Seats Quota" in 2024, "Self-Financed Merit Seat" in 2025), so they are matched
 * by family, never by the exact label.
 */
export type CutQuota = "aiq" | "deemed" | "dnb";
export const CUT_QUOTAS: { key: CutQuota; label: string }[] = [
  { key: "aiq", label: "All India Quota" },
  { key: "deemed", label: "Deemed (paid seats)" },
  { key: "dnb", label: "DNB" },
];
export const quotaFamily = (q: string | null): CutQuota | null =>
  !q ? null : q === "All India" ? "aiq" : /^DNB/i.test(q) ? "dnb" : /self.?financed|paid|management/i.test(q) ? "deemed" : null;

export const CUT_CATS = ["Open", "EWS", "OBC", "SC", "ST"] as const;
export type CutCat = (typeof CUT_CATS)[number];

export interface BranchCut {
  course: string;
  slug: string;
  seats: number;
  colleges: number;
  /** The last (highest) rank admitted per category — only where three or more colleges admitted. */
  last: Partial<Record<CutCat, number>>;
}
