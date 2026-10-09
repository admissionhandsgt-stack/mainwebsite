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

/**
 * Shorten a name from the middle, keeping its end — the city that tells two
 * colleges apart. "Employees State Insurance Corporation Medical College,
 * Bangalore" and "…, Faridabad" clipped from the end were the same title
 * (34 such pairs in the second crawl).
 */
const STATE_TAIL =
  /[\s,(-]+(andhra pradesh|arunachal pradesh|assam|bihar|chhattisgarh|goa|gujarat|haryana|himachal pradesh|jharkhand|karn?a?taka|karantaka|kerala|madhya pradesh|maharashtra|manipur|meghalaya|mizoram|nagaland|odisha|orissa|punjab|rajasthan|sikkim|tamil ?nadu|telangana|tripura|uttar pradesh|uttarakhand|west bengal|delhi|new delhi|jammu (and|&) kashmir|ladakh|puducherry|pondicherry|chandigarh|india)\.?$/i;

export function clipMiddle(text: string, max: number): string {
  // A trailing PIN code is not a place anyone searches: "…, Meghalaya, 793018".
  let t = text.replace(/\s+/g, " ").trim().replace(/[\s,-]*\b\d{6}$/, "");
  if (t.length <= max) return t;
  // Nor, once the name has to be shortened, is the state: three colleges ending
  // "…, Maharashtra" shared one title. The city before it is what tells them apart.
  for (let prev = ""; prev !== t; ) {
    prev = t;
    t = t.replace(/[\s,-]*\b\d{6}$/, "").replace(STATE_TAIL, "").trim();
  }
  if (t.length <= max) return t;
  // The last segment after a comma or a dash: "…, Bangalore", "… – North Kolkata (NEW CAMPUS)".
  const cut = Math.max(t.lastIndexOf(","), t.lastIndexOf(" – "), t.lastIndexOf(" - "));
  const segment = cut > 0 ? t.slice(cut + 1).replace(/^[\s–-]+/, "").trim() : "";
  const tail = segment && segment.length < max / 2 ? segment : t.split(" ").slice(-1)[0];
  const head = t.slice(0, t.length - tail.length).replace(/[\s,–-]+$/, "");
  const room = max - tail.length - 2;
  return room > 8 ? `${clip(head, room)} ${tail}` : clip(t, max);
}

/** "<name><suffix>" within the title limit, the name shortened if it must be — the suffix always survives. */
export const nameWith = (name: string, suffix: string) => `${clipMiddle(name, TITLE_MAX - suffix.length)}${suffix}`;

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
