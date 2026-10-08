/**
 * Titles built from data — a college, a state, a course — vary in length, and
 * the long ones (a 50-character college name plus "— MD/MS Cutoff & Fees 2026")
 * ran past 70 characters, where search results cut them off. Semrush's Site
 * Audit counted seven. Each page passes its title from richest to plainest;
 * the first that fits is used.
 */
export const TITLE_MAX = 65;

export function fitTitle(...candidates: string[]): string {
  const clean = candidates.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean);
  const fit = clean.find((c) => c.length <= TITLE_MAX);
  if (fit) return fit;
  const last = clean[clean.length - 1] ?? "";
  return last.length <= 70 ? last : last.slice(0, 67).replace(/[\s,—:-]+\S*$/, "") + "…";
}

/** "1 College", "73 Colleges". */
export const count = (n: number, one: string, many: string) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
