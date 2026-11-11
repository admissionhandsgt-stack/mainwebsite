/**
 * The title test on MD/MS college pages (2026-11-11, the competitive review's top lever: CTR at page-1 positions).
 * Half the pages — chosen by a hash of the slug, so a page is always in the same half — lead their <title> with the
 * figure people search for (the stipend a month, the 2026-27 fee, the NIRF rank or the seat count); the other half
 * keep the title they had, unchanged, as the control. Search Console then compares the halves over the same weeks
 * (lib/titleTestReport.ts, Admin → Search research), so a change in CTR that both halves share — a Google update, the
 * season — cancels out.
 *
 * Import-free: the page's title code and the report both read it. Ending the test: set `on` false (every page goes
 * back to the control title), or adopt the winner in collegeTitle and delete this file.
 */
export const TITLE_TEST = {
  id: "pg-college-figures",
  on: true,
  /** The day the test titles went live; the report's "after" window starts a week later, once Google has recrawled. */
  started: "2026-11-11",
  /** Search Console's data before this day is the "before" window, the same length as the after one (max 28 days). */
  settleDays: 7,
} as const;

/** FNV-1a over the test id and the slug: a stable half for every page, independent of any other test. */
export function titleGroup(slug: string): "control" | "figures" {
  let h = 0x811c9dc5;
  const key = `${TITLE_TEST.id}|${slug}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h & 1 ? "figures" : "control";
}
