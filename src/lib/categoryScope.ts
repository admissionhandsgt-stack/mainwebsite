/**
 * Which seats a candidate of one category can take (2026-10-27).
 *
 * The tools used to match the category code exactly, which broke three ways:
 *
 * - **Every counselling spells its open category its own way.** A general candidate
 *   who picked GEN (PG) or UR (UG) never saw Karnataka's GM, Gujarat's GQ-OP,
 *   Kerala's SM, Tamil Nadu's "OC Open" / OC, J&K's OM, Maharashtra's and Gujarat's
 *   MBBS OPEN, AP and Telangana's OPEN-GEN, or the deemed universities' OPEN seats.
 * - **An open seat is open to everybody.** A reserved-category candidate takes an
 *   unreserved seat on merit wherever the rank clears it; matching OBC alone hid
 *   every open seat from an OBC candidate.
 * - **The code was upper-cased before the match**, so "GEN-PwD", "UR PwD",
 *   "OBC-PwD" and every other mixed-case code matched nothing (or a different
 *   counselling's capitalised spelling). Codes are now compared by `categoryKey` —
 *   upper-cased, spaces and hyphens dropped — on both sides, so "UR PwD", "UR - PwD",
 *   "UR PWD" and "UR-PwD" are one category.
 *
 * And seats a candidate cannot take without a status we do not ask about — in-service
 * and sponsored seats, minority seats, NRI seats — stopped being shown to everybody:
 * each opens only to the category (or seat type) that names it.
 *
 * Import-free, so the picker and the routes read the same lists.
 */

export type ScopeLevel = "ug" | "pg";
export type ScopeSeatType = "all" | "nri" | "management";

/** The general code each level publishes, which the picker offers for all of the open codes. */
export const GENERAL_DEFAULT: Record<ScopeLevel, string> = { ug: "UR", pg: "GEN" };

/**
 * Each counselling's open (unreserved) merit category, as it spells it. Checked against each
 * code's quota labels and closing ranks on 2026-10-27. Left out on purpose: female, rural,
 * regional and other horizontal lists (OPEN-FEM, GMR, GMH, GMK, UR-GL), and institutional-
 * preference and in-service lists (UQ-OP, IQ-OP, GEN-IP, IP-GEN, IP-UR), which are open only
 * to a college's own graduates or to serving doctors.
 */
export const OPEN_CODES: Record<ScopeLevel, readonly string[]> = {
  pg: [
    "GEN", "GM", "GMP", "OPN", "OM", "OC Open", "SM", "GQ-OP", "Group 1 - GEN",
    "North East Open Quota", "CMC-General Merit", "UGE", "UT-GEN",
  ],
  ug: [
    "UR", "OPEN", "OPEN-GEN", "GEN", "GM", "GMP", "OPN", "SM", "All India Merit", "OC", "OM",
    "OP", "GQ-GEN", "OPEN GEN", "Open", "All India OPEN", "All India GEN-MERIT", "UGE",
  ],
};

/** A category that is the paid seat itself — management, "B category" — open to anyone who pays. */
export const PAID_CODES: Record<ScopeLevel, readonly string[]> = {
  pg: ["MNG", "MGT", "MQ", "MQ1", "MQ2", "MQ3", "MQ-MQ", "S1A", "S1B", "UR-MNG", "AGE"],
  ug: ["Management", "MQ-GEN", "CAT B1", "CAT B2", "CAT B-GEN", "OPEN MERIT"],
};

/** How codes are compared: "UR - PwD" and "UR PwD" are one category. Mirrored in SQL by categoryScopeSql. */
export const categoryKey = (s: string) => s.toUpperCase().replace(/[\s-]+/g, "");
const UP = categoryKey;
const OPEN_UP: Record<ScopeLevel, Set<string>> = {
  pg: new Set(OPEN_CODES.pg.map(UP)),
  ug: new Set(OPEN_CODES.ug.map(UP)),
};
const PAID_UP: Record<ScopeLevel, Set<string>> = {
  pg: new Set(PAID_CODES.pg.map(UP)),
  ug: new Set(PAID_CODES.ug.map(UP)),
};

export const isOpenCode = (level: ScopeLevel, code: string) => OPEN_UP[level].has(UP(code));
export const isPaidCode = (level: ScopeLevel, code: string) => PAID_UP[level].has(UP(code));
/** An NRI category — the NRI seat type, not a category to pick. */
export const isNriCode = (code: string) => /NRI|^NR$|^NQ\b/i.test(code.trim());

/** Selected categories that open the seats which need that status. */
export const isServiceCategory = (code: string) => /serv|govt.?doctor|sponsor/i.test(code);
export const isMinorityCategory = (code: string) => /minority/i.test(code);

/** Quota labels (Postgres regex, case-insensitive) whose seats need a status. */
export const SERVICE_QUOTA_RE = "(in.?service|\\mservice\\M|sponsor|govt\\.? ?doctor)";
/**
 * …except Chhattisgarh's main PG quota, "MBBS or Inservice": a Chhattisgarh MBBS graduate is in it
 * without serving anywhere. ("NonService" is one word, so `\mservice\M` leaves AP's and Telangana's
 * non-service quotas alone and takes their "- Service" ones.)
 */
export const SERVICE_EXCEPT_RE = "MBBS or";
/** "Min" / "MIN" is how Karnataka, TN and AP shorten it; JM and MM are the deemed universities' Jain and Muslim minority quotas. */
export const MINORITY_QUOTA_RE = "(minority|\\mmin\\M|^JM$|^MM$)";
export const NRI_QUOTA_RE = "NRI";

/*
 * Domicile (2026-10-27). A state's own quota is for its own candidates; a seat the state opens to
 * all of India is not. Hidden only where the data says a seat is the state's own — when in doubt the
 * seat stays, because a seat wrongly hidden is an option the student never hears of:
 *
 * - **Open to everybody:** the national counsellings (MCC's All India, deemed, central, ESI, Open
 *   Seat Quota); every quota the PG source itself files under "Open States (Private Institute seats
 *   available for all candidates)" — matched by label, so Karnataka's private Open Quota counts at
 *   both levels; a quota or category that says all India, non-domicile, other state, outside or North
 *   East; and management / B-category / institutional-quota seats unless the label says Local or LOC
 *   or that they are a government college's seats ("Rajasthan Govt Seats - Management Quota", which
 *   the source does not open). NRI seats only show for the NRI seat type, where domicile is moot.
 * - **A university's own quota inside the national counselling** (DU, IP, BHU, AMU, Jamia) goes with
 *   its state — the nearest the data comes to "its own graduates".
 * - **Everything else in a state counselling** — government quota, a private college's state-quota
 *   seats, AP's "unreserved" and Telangana's local seats, institutional preference — shows only when the
 *   college is in a home state: the domicile, and for MD/MS the state of the MBBS too (Karnataka,
 *   Gujarat and Tamil Nadu decide PG eligibility by where the MBBS was done).
 */
export const NATIONAL_COUNSELLING_RE = "^(All India|Open Seat|Deemed|Central|ESI|Delhi Children|Open States|DNB Sponsored)";
export const OPEN_STATES_COUNSELLING = "Open States%";
export const UNIVERSITY_QUOTA_RE = "^(DU|IP|BHU|AMU|Delhi University Quota|IP University Quota|AMU Quota|Jamia Internal)$";
export const OPEN_TO_ALL_RE = "(all india|non.?domicile|other state|outside|north east|NRI|mgmt.*\\mUNR\\M)";
export const PAID_QUOTA_RE = "(manag|mgmt|\\mmgt\\M|^MNG$|institutional quota|others \\(q\\)|other seats|\\mcat ?b|private mq|\\mMQ\\M)";
export const LOCAL_QUOTA_RE = "(\\mlocal\\M|\\mLOC\\M|govt seats)";

/** A state name compared across spellings ("Pondicherry" / "Puducherry", "Dadra Nagar Havelli"). Mirrored in SQL. */
export const stateKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/\band\b|&/g, "")
    .replace(/[^a-z]/g, "")
    .replace("islands", "island")
    .replace("havelli", "haveli")
    .replace("pondicherry", "puducherry");

/**
 * The category keys (`categoryKey`) whose seats a candidate of `category` can take:
 * their own, every counselling's open category, and the paid categories.
 */
export function eligibleCodes(level: ScopeLevel, category: string): string[] {
  const own = UP(category || GENERAL_DEFAULT[level]);
  return Array.from(new Set([own, ...OPEN_UP[level], ...PAID_UP[level]]));
}

/**
 * Whether the picker lists this code. The open codes fold into the level's general code,
 * the paid and NRI ones are seat types — offering "GM" or "OPEN" beside UR was offering the
 * same seats under a name only one state uses.
 */
export function pickerOffers(level: ScopeLevel, code: string): boolean {
  if (UP(code) === GENERAL_DEFAULT[level]) return true;
  return !isOpenCode(level, code) && !isPaidCode(level, code) && !isNriCode(code);
}
