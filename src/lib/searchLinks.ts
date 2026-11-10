import { unstable_cache, revalidateTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { googleToken } from "@/lib/google";
import { sitemapGroups, SITEMAP_GROUPS } from "@/lib/sitemapData";

/**
 * "Related searches": internal links chosen from Search Console (owner, 2026-11-10, from an SEO reel: find the pages
 * Google already shows for a keyword and link them to the page that should rank for it, with the keyword as anchor).
 *
 * Weekly (`POST /api/cron/search-links`): for every (page A, query) pair of the last 28 days with a few impressions,
 * find the sitemap page B whose URL matches the query's words best. When B matches clearly better than A, A should
 * link to B with the query as its words — unless A's HTML already links B. Up to five per page, kept in
 * `integrations` as `seo.search_links` (JSON: { builtAt, links: { "<A path>": [{ to, anchor }] } }), rendered by
 * `components/seo/SearchLinks` above the footer.
 *
 * What never becomes an anchor: search operators and quoted queries, contact/phone/address searches, queries asking
 * one college's "closing rank" (no copy may promise a college's closing ranks), and anything longer than 60 chars.
 */

const KEY = "seo.search_links";
const SITE = "sc-domain:admissionhands.com";
const ORIGIN = "https://www.admissionhands.com";
const MAX_PER_PAGE = 5;
const MIN_IMPRESSIONS = 5;

export type SearchLink = { to: string; anchor: string };
type Stored = { builtAt: string; links: Record<string, SearchLink[]> };

/* ------------------------------------------------------------------ words ---- */

const STOP = new Set(
  "a an the in of for and or to at on by with from is are was be what which who how when where why does do can list best top new near me vs india indian state wise statewise 2023 2024 2025 2026 2027 details full complete".split(" "),
);
/** Words that say what a page is about rather than which one; they count, but a query of only these matches nothing. */
const SOFT = new Set("pg ug neet md ms mbbs bds college colleges medical government govt private institute hospital sciences".split(" "));
/** What the searcher wants from the page, not which page: never part of a name. */
const INTENT = new Set(
  "stipend fee cut seats bond penalty rank ranks closing last marks score admission admissions cost structure quota management nri counselling result round hostel ranking rankings course courses intake eligibility per month year package".split(" "),
);
/** State words: a college query must name the college by something more than its state. */
const STATES = new Set(
  "andhra pradesh arunachal assam bihar chhattisgarh goa gujarat haryana himachal jharkhand karnataka kerala madhya maharashtra manipur meghalaya mizoram nagaland odisha orissa punjab rajasthan sikkim tamil nadu tamilnadu telangana tripura uttar uttarakhand west bengal delhi jammu kashmir puducherry pondicherry chandigarh ladakh mp up".split(" "),
);
/** A college's stream: a dental, AYUSH or nursing page is only the answer when the query says so. */
const STREAM = /^(dental|ayurved|homoeo|nursing|unani|siddha|physiotherapy|pharmacy|veterinary|yoga|naturopathy)$/;
/** Which counselling a page or a query is about: MBBS/BDS (ug) or MD/MS/DNB (pg). */
const pathLevel = (p: string) => (/^\/(mbbs-india|bds-india|neet-ug)/.test(p) ? "ug" : /^\/(md-ms-india|neet-pg|neet-ss)/.test(p) ? "pg" : null);
const queryLevel = (q: string[]) => (q.some((w) => w === "mbbs" || w === "bds") ? "ug" : q.some((w) => ["pg", "md", "ms", "dnb", "stipend"].includes(w)) ? "pg" : null);
/** The state a page is about, from its address: /md-ms-india/states/kerala, /md-ms-india/stipend/kerala, /mbbs-india/kerala. */
const stateOf = (p: string) => p.match(/^\/md-ms-india\/(?:states|stipend|fees)\/([^/]+)$/)?.[1] ?? p.match(/^\/mbbs-india\/([^/]+)$/)?.[1] ?? null;
const SYN: Record<string, string> = {
  fees: "fee", cutoff: "cut", salary: "stipend", stipends: "stipend", govt: "government", seat: "seats", branches: "branch",
  // One spelling per place and name, so "Bangalore" in a query meets "bengaluru" in an address.
  bengaluru: "bangalore", shri: "sri", shree: "sri", puducherry: "pondicherry", gurugram: "gurgaon", bombay: "mumbai",
  ayurveda: "ayurved", ayurvedic: "ayurved", homoeopathic: "homoeo", homeopathic: "homoeo", homoeopathy: "homoeo", homeopathy: "homoeo",
};

function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/cut[\s-]?off/g, "cut")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((w) => SYN[w] ?? w)
    .filter((w) => w.length >= 2 && !STOP.has(w));
}

/** A page's words: its path, plus "pg" for MD/MS pages and "mbbs ug" for MBBS ones, which their queries use. */
function pageWords(path: string): Set<string> {
  const w = new Set(words(path.replace(/-ug$/, "")));
  if (path.startsWith("/md-ms-india")) w.add("pg");
  if (path.startsWith("/mbbs-india")) { w.add("mbbs"); w.add("ug"); }
  if (path.startsWith("/neet-pg")) w.add("pg");
  if (path.startsWith("/neet-ug")) { w.add("ug"); w.add("mbbs"); }
  return w;
}

const BAD_QUERY = /site:|["'@]|\s-\w|https?:|\b(contact|phone|number|address|email|login|result pdf|near me|review|reviews|ragging|scam|fake)\b/i;
const ACRONYM = new Set("pg ug md ms mbbs bds mds neet dnb aiims aiq nri obc sc st ews ent obg dm mch esic gmc kmc rml nih sms llrm brd grmc ams ims jipmer pgimer cmc ss".split(" "));

/** "sms jaipur pg stipend" → "SMS Jaipur PG stipend": acronyms upper case, names capitalised, the intent words not. */
export function anchorText(q: string): string {
  const lower = new Set("stipend fee fees cut off cutoff seats seat rank marks round bond penalty structure quota counselling admission colleges college medical government private and in of for the a month year".split(" "));
  return q
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w, i) => {
      const l = w.toLowerCase();
      if (ACRONYM.has(l) || (/^[a-z]{2,5}$/.test(l) && !/[aeiouy]/.test(l))) return l.toUpperCase();
      if (lower.has(l) && i > 0) return l;
      return l.charAt(0).toUpperCase() + l.slice(1);
    })
    .join(" ");
}

/**
 * The page a query should send a reader to from `from`, or null. Pure, so a script can run the same choice offline.
 * `pw` is every sitemap page with its words, `index` word → pages (distinctive words only).
 */
export function suggestTarget(query: string, from: string, pw: Map<string, Set<string>>, index: Map<string, string[]>): string | null {
  if (BAD_QUERY.test(query) || query.length > 60) return null;
  const score = (q: string[], p: string) => {
    const ws = pw.get(p);
    if (!ws) return { cov: 0, prec: 0 };
    const hit = q.filter((w) => ws.has(w)).length;
    return { cov: hit / q.length, prec: hit / ws.size };
  };
  const q = [...new Set(words(query))];
  if (q.length < 2 || q.every((w) => SOFT.has(w))) return null;
  // The words that name a thing (a college, a place, a branch): every one must be in the target's address. A first
  // version scored by overlap alone and, tried on 28 days of data (2026-11-10), sent "government ayurvedic college
  // banda" to Varanasi's ayurvedic college, "dy patil mbbs cutoff" to a dental college and "kerala neet pg stipend" to
  // the national report — 122 new links, many of them wrong.
  const name = q.filter((w) => !SOFT.has(w) && !INTENT.has(w));
  if (!name.length) return null;
  const fromIsCollege = from.includes("/colleges/");
  const fromState = stateOf(from);
  const qLevel = queryLevel(q);
  const fits = (p: string) => {
    const ws = pw.get(p);
    if (!ws || !name.every((w) => ws.has(w))) return false;
    if (p.includes("/colleges/")) {
      if (!name.some((w) => !STATES.has(w))) return false; // "stipend in rajasthan medical college" names no college
      if ([...ws].some((w) => STREAM.test(w) && !q.includes(w))) return false;
      // College to college only across levels, when the query asks for the other one ("<college> mbbs fees" seen on
      // its MD/MS page). Same-level pairs were mostly a different hospital sharing a word (MGM, KMC, Jayanagar).
      if (fromIsCollege && (pathLevel(from) === pathLevel(p) || qLevel !== pathLevel(p))) return false;
      // From a state's page, only that state's colleges: "kims hospitals" on Kerala's page is not KIMS Nagpur.
      if (fromState && !words(fromState).every((w) => ws.has(w))) return false;
    } else if (!q.some((w) => INTENT.has(w) || SOFT.has(w))) return false; // a bare place name is no anchor
    // MD/MS and DNB are different courses with different pages.
    const branch = p.match(/^\/md-ms-india\/branches\/([a-z]+)-/)?.[1];
    if (branch && q.includes("dnb") !== (branch === "dnb")) return false;
    return true;
  };
  const cands = [...new Set(name.flatMap((w) => index.get(w) ?? []))].filter((p) => p !== from && fits(p));
  if (!cands.length) return null;
  const scored = cands.map((p) => ({ p, ...score(q, p) })).sort((x, y) => y.cov - x.cov || y.prec - x.prec);
  const best = scored[0];
  if (best.cov < 0.75) return null;
  // Two colleges that fit equally ("dy patil medical college cut off": Pune, Kolhapur, Navi Mumbai) — no link.
  if (best.p.includes("/colleges/") && scored.filter((s) => s.cov === best.cov && s.p.includes("/colleges/")).length > 1) return null;
  // A page that already names everything the query names is an answer itself (except a college asked about at its
  // other level, which fits() allows): only a clearly fuller match is linked.
  const fw = pw.get(from);
  const crossLevel = fromIsCollege && best.p.includes("/colleges/");
  if (!crossLevel && fw && name.every((w) => fw.has(w))) return null;
  const a = score(q, from);
  if (!crossLevel && best.cov <= a.cov) return null;
  // One college's closing rank is not something any page here promises.
  if (best.p.includes("/colleges/") && /closing|last rank/i.test(query)) return null;
  return best.p;
}

export { pageWords, SOFT };

/* --------------------------------------------------------------- building ---- */

async function gscRows(): Promise<{ page: string; query: string; impressions: number }[]> {
  const token = await googleToken(["https://www.googleapis.com/auth/webmasters.readonly"]);
  if (!token) throw new Error("No Google service account is configured.");
  const day = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
  const rows: { page: string; query: string; impressions: number }[] = [];
  for (let startRow = 0; startRow < 100_000; startRow += 25_000) {
    const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ startDate: day(30), endDate: day(3), dimensions: ["page", "query"], type: "web", rowLimit: 25_000, startRow, dataState: "final" }),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    const j = (await r.json()) as { rows?: { keys: string[]; impressions: number }[]; error?: { message?: string } };
    if (!r.ok) throw new Error(`Search Console: ${j.error?.message ?? r.status}`);
    for (const x of j.rows ?? []) rows.push({ page: x.keys[0], query: x.keys[1], impressions: x.impressions });
    if ((j.rows ?? []).length < 25_000) break;
  }
  return rows;
}

/** Paths A already links to, from its own HTML — minus our own "Related searches" block, or a rebuild would drop it. */
async function linkedFrom(path: string, base: string): Promise<Set<string> | null> {
  try {
    const r = await fetch(base + path, { headers: { "user-agent": "AdmissionHands-search-links" }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!r.ok) return null;
    const html = (await r.text()).replace(/<section[^>]*data-search-links[\s\S]*?<\/section>/g, "");
    const out = new Set<string>();
    for (const m of html.matchAll(/href="((?:https:\/\/www\.admissionhands\.com)?\/[^"#?]*)/g)) out.add(m[1].replace(ORIGIN, "").replace(/\/$/, "") || "/");
    return out;
  } catch {
    return null;
  }
}

export async function rebuildSearchLinks(base = `http://127.0.0.1:${process.env.PORT ?? 8150}`): Promise<{ pairs: number; pages: number; links: number; skippedLinked: number }> {
  const groups = await sitemapGroups();
  const pages = SITEMAP_GROUPS.flatMap((g) => groups[g].map((e) => e.url.replace(ORIGIN, "") || "/"));
  const known = new Set(pages);
  const pw = new Map(pages.map((p) => [p, pageWords(p)]));
  const index = new Map<string, string[]>();
  for (const [p, ws] of pw) for (const w of ws) if (!SOFT.has(w)) (index.get(w) ?? index.set(w, []).get(w)!).push(p);

  const want = new Map<string, Map<string, { anchor: string; imp: number }>>();
  let pairs = 0;
  for (const row of await gscRows()) {
    const from = row.page.replace(ORIGIN, "").replace(/\/$/, "") || "/";
    if (!known.has(from) || row.impressions < MIN_IMPRESSIONS) continue;
    const to = suggestTarget(row.query, from, pw, index);
    if (!to) continue;
    pairs++;
    const m = want.get(from) ?? want.set(from, new Map()).get(from)!;
    const prev = m.get(to);
    if (!prev || row.impressions > prev.imp) m.set(to, { anchor: anchorText(row.query), imp: row.impressions });
  }

  const links: Record<string, SearchLink[]> = {};
  let skippedLinked = 0;
  for (const [from, targets] of want) {
    const have = await linkedFrom(from, base);
    const list = [...targets.entries()]
      .filter(([to]) => {
        const linked = have?.has(to) ?? false;
        if (linked) skippedLinked++;
        return !linked;
      })
      .sort((x, y) => y[1].imp - x[1].imp)
      .slice(0, MAX_PER_PAGE)
      .map(([to, v]) => ({ to, anchor: v.anchor }));
    if (list.length) links[from] = list;
  }

  const value: Stored = { builtAt: new Date().toISOString(), links };
  await db.execute(sql`
    INSERT INTO integrations (key, value, is_secret, updated_at)
    VALUES (${KEY}, ${JSON.stringify(value)}, false, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `);
  revalidateTag("search-links");
  return { pairs, pages: Object.keys(links).length, links: Object.values(links).reduce((n, l) => n + l.length, 0), skippedLinked };
}

/* ---------------------------------------------------------------- reading ---- */

const readAll = unstable_cache(
  async (): Promise<Record<string, SearchLink[]>> => {
    const rows = (await db.execute(sql`SELECT value FROM integrations WHERE key = ${KEY}`)) as unknown as Array<{ value: string | null }>;
    try {
      return (JSON.parse(rows[0]?.value ?? "{}") as Partial<Stored>).links ?? {};
    } catch {
      return {};
    }
  },
  ["search-links-v1"],
  { revalidate: 3600, tags: ["search-links"] },
);

export async function getSearchLinks(path: string | null): Promise<SearchLink[]> {
  if (!path) return [];
  try {
    return (await readAll())[path.replace(/\/$/, "") || "/"] ?? [];
  } catch {
    return [];
  }
}
