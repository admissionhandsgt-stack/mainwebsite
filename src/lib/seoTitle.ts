/**
 * Titles and descriptions built from data — a college, a state, a course —
 * vary in length, and the long ones ran past what search results show. The
 * site crawl of 2026-10-09 (scripts/seo_crawl.mjs) found 329 titles over 65
 * characters, 2,639 descriptions over 160, and 99 pairs of identical titles:
 * a college's MBBS and MD/MS pages both falling back to its bare name. Each
 * page passes its text from richest to plainest; the first that fits is used,
 * and the last candidate must itself fit — clip() a name rather than drop the
 * words that make two pages different.
 */
export const TITLE_MAX = 65;
export const DESCRIPTION_MAX = 160;

/** Cut at a word boundary and mark the cut. */
export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, Math.max(1, max - 1)).replace(/[\s,—:;-]+\S*$/, "") + "…";
}

function fit(max: number, candidates: string[]): string {
  const clean = candidates.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean);
  return clean.find((c) => c.length <= max) ?? clip(clean[clean.length - 1] ?? "", max);
}

export const fitTitle = (...candidates: string[]) => fit(TITLE_MAX, candidates);
export const fitDescription = (...candidates: string[]) => fit(DESCRIPTION_MAX, candidates);

/** "<name><suffix>" within the title limit, the name clipped if it must be — the suffix always survives. */
export const nameWith = (name: string, suffix: string) => `${clip(name, TITLE_MAX - suffix.length)}${suffix}`;

/** "1 College", "73 Colleges". */
export const count = (n: number, one: string, many: string) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;

/**
 * The undergraduate course a college's page is about, from its own name — the
 * same evidence getUgColleges() trusts over the source's misfiled cutoffs. A
 * dental college's page said "MBBS Cutoff" in its title until 2026-10-09.
 */
export function ugCourseOf(name: string): string {
  if (/dental/i.test(name)) return "BDS";
  if (/ayurved/i.test(name)) return "BAMS";
  if (/homoeo|homeopath/i.test(name)) return "BHMS";
  if (/unani|tibbi/i.test(name)) return "BUMS";
  if (/siddha/i.test(name)) return "BSMS";
  if (/nursing/i.test(name)) return "B.Sc Nursing";
  if (/veterinar/i.test(name)) return "BVSc";
  return "MBBS";
}
