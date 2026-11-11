/**
 * Search research (2026-11-11, owner: "bot ya agent banao jo hamare tavily api se websearches kare alag alag aise
 * keywords se sab research save karke ek report banake de usse hum target kar paye"; same day, second version: "hourly
 * review lagao… real searches keywords, combinations etc ko search kar paye aur accurate data de… save kare aur
 * analyse bhi kar paye sahi se").
 *
 * Hourly (POST /api/cron/serp-research):
 *  1. Real searches: autocomplete for a few seeds (lib/serpSuggest.ts — entity × intent combinations and Hinglish
 *     phrasings), free.
 *  2. What to study this hour, within the Tavily budget (`allowance()` — what is left this month after the daily hunt's
 *     share, spread over the hours left, front-loaded): half Search Console queries we are shown for at position 3–20
 *     (biggest first), half autocomplete searches we are not shown for at all or only past position 20.
 *  3. For each: one Tavily search from India with its short answer, then the analysis — our landing page (Search
 *     Console's own, or the closest page in our sitemap, or none), our title and the searched words it lacks, every
 *     figure in the answer and the result snippets with the sites that state it (official = gov.in / nic.in / NMC /
 *     NBEMS / MCC; "agreed" = two or more sites), the figures our page does not print, where we stand in the results,
 *     the advice in words and a priority.
 *  4. The hour's top findings go to the owner on Telegram (08:00–23:00 IST; the night's wait for the morning), or only
 *     Monday's summary once `serp.digest` is set to "weekly".
 * Figures found are leads to check against the official source before anything goes on a page — the advice says which
 * are already official. Read by Admin → Search research. Server only.
 */
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { googleToken } from "@/lib/google";
import { webSearchAnswer, webSearchUsage, type WebResult } from "@/lib/webSearch";
import { collectSuggestions } from "@/lib/serpSuggest";
import { sitemapGroups } from "@/lib/sitemapData";
import { getIntegration, setIntegration } from "@/lib/integrations";
import { offerSearchFaq, PER_RUN as FAQ_PER_RUN } from "@/lib/searchFaq";
import { pgFocus, ugOnly } from "@/lib/researchFocus";

export const PER_RUN = 15;
const SITE = "sc-domain:admissionhands.com";
const OURS = /(^|\.)admissionhands\.com$/i;
const OFFICIAL = /(\.gov\.in|\.nic\.in|^nmc\.org\.in|^natboard\.edu\.in|^nbe\.edu\.in|^mcc\.nic\.in|^nirfindia\.org)$/i;
const BASE = `http://127.0.0.1:${process.env.PORT ?? 8150}`;
const JUNK = /^(yes|no|ok|hi|hello|fees\??|stipend\??|round \d\??)$/i;
/** Searches a month the daily hunt and new-site discovery need (lib/hunt.ts: 24 a day, plus ~20 twice a week). */
const HUNT_PER_DAY = 30;

interface GscRow {
  query: string;
  page: string;
  impressions: number;
  position: number;
}

/** Every query Search Console shows us for in the last 4 weeks, with the page it is shown for most. */
async function gscQueries(): Promise<Map<string, GscRow>> {
  const token = await googleToken(["https://www.googleapis.com/auth/webmasters.readonly"]);
  if (!token) throw new Error("No Google service account is configured.");
  const day = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
  const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ startDate: day(30), endDate: day(2), dimensions: ["query", "page"], type: "web", rowLimit: 25_000 }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  const j = (await r.json()) as { rows?: { keys: string[]; impressions: number; position: number }[]; error?: { message?: string } };
  if (!r.ok) throw new Error(`Search Console: ${j.error?.message ?? r.status}`);
  const best = new Map<string, GscRow>();
  for (const x of j.rows ?? []) {
    const [query, page] = x.keys;
    const k = query.toLowerCase();
    const had = best.get(k);
    if (!had || x.impressions > had.impressions)
      best.set(k, { query, page: page.replace(/^https:\/\/www\.admissionhands\.com/, "") || "/", impressions: x.impressions, position: x.position });
  }
  return best;
}

const isOpportunity = (r: GscRow) =>
  r.position >= 3 && r.position <= 20 && r.impressions >= 20 && r.query.split(/\s+/).length >= 3 && !JUNK.test(r.query.trim()) && !/admission ?hands/i.test(r.query);

/* ------------------------------------------------------------------ facts */

/** The figures a text states: rupee amounts, lakh/crore sums, years of bond, counts of seats or colleges, percentages. */
export function factsOf(text: string): string[] {
  const out = new Set<string>();
  const pats = [
    /₹\s?[\d,]+(?:\.\d+)?(?:\s?(?:lakh|lakhs|crore|cr|l))?/gi,
    /\b(?:rs\.?|inr)\s?[\d,]+(?:\.\d+)?(?:\s?(?:lakh|lakhs|crore|cr))?/gi,
    /\b\d+(?:\.\d+)?\s?(?:lakh|lakhs|crore|cr)\b/gi,
    /\b\d+(?:\.\d+)?[- ]years?\b/gi,
    /\b[\d,]{2,}\s(?:[a-z/.-]+\s){0,2}(?:seats|colleges|candidates|students|courses|beds)\b/gi,
    /\b(?:established|founded|since|started)\s(?:in\s)?(?:18|19|20)\d{2}\b/gi,
    /\b\d+(?:\.\d+)?\s?%/g,
    /\b(?:air|rank)\s?[\d,]{3,}\b/gi,
  ];
  for (const p of pats) for (const m of text.matchAll(p)) out.add(m[0].replace(/\s+/g, " ").trim());
  return [...out].slice(0, 30);
}

/** The digits of a figure ("₹87,216" → "87216", "2-year" → "2 year"), to look for it in our page's text. */
function needle(f: string): string {
  const yrs = f.match(/^(\d+(?:\.\d+)?)[- ]years?$/i);
  if (yrs) return `${yrs[1]} year`;
  const est = f.match(/^(?:established|founded|since|started)\b.*?((?:18|19|20)\d{2})$/i);
  if (est) return est[1];
  const count = f.match(/^([\d,]+)\s.*(?:seats|colleges|candidates|students|courses|beds)$/i);
  if (count) return count[1].replace(/,/g, "");
  return f.replace(/[^\d.]/g, "");
}

export interface Fact {
  fact: string;
  sources: string[];
  official: boolean;
  /** "official" (a government or regulator site states it), "agreed" (two or more sites), "single". */
  confidence: "official" | "agreed" | "single";
  onOurPage: boolean;
}

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

function gatherFacts(answer: string, results: WebResult[], pageText: string | null): Fact[] {
  const by = new Map<string, { fact: string; sources: Set<string> }>();
  const add = (text: string, src: string) => {
    for (const f of factsOf(text)) {
      const n = needle(f);
      if (!n || n.length < 2) continue;
      const e = by.get(n) ?? { fact: f, sources: new Set<string>() };
      e.sources.add(src);
      by.set(n, e);
    }
  };
  for (const r of results) if (!OURS.test(host(r.url)) && !/(^|\.)tavily\.com$/i.test(host(r.url))) add(`${r.title} ${r.content}`, host(r.url));
  add(answer, "answer");
  const flat = pageText?.replace(/[,\s]/g, "") ?? "";
  return [...by.entries()]
    .map(([n, e]) => {
      const sites = [...e.sources].filter((s) => s !== "answer");
      const official = sites.some((s) => OFFICIAL.test(s));
      return {
        fact: e.fact,
        sources: [...e.sources],
        official,
        confidence: official ? "official" : sites.length >= 2 ? "agreed" : "single",
        onOurPage: pageText ? (/year/.test(n) ? pageText.includes(n) : flat.includes(n)) : false,
      } satisfies Fact;
    })
    .sort((a, b) => Number(b.official) - Number(a.official) || b.sources.length - a.sources.length)
    .slice(0, 20);
}

/* ------------------------------------------------------------------ our side */

async function ourPage(path: string): Promise<{ text: string; title: string } | null> {
  try {
    const r = await fetch(BASE + path, { headers: { "user-agent": "AdmissionHands-serp-research", accept: "text/html" }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!r.ok) return null;
    const html = await r.text();
    const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'");
    const text = html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase();
    return { text, title };
  } catch {
    return null;
  }
}

const STOP = new Set(
  "a an the of in on for to and or is are was be by with at from vs v best list top all near me my i what which how why when where who whom kya hai hota hoti hain ke ki ka me mai mein se par kitne kitni kitna kaise kare karna milega milta chahiye neet 2024 2025 2026 2027 india indian latest new full details students student doctors candidates".split(" "),
);
/** Words people type for what our pages name otherwise. */
const FOLD: Record<string, string> = {
  radiology: "radio",
  radiodiagnosis: "radio",
  cutoff: "cut",
  "cut-off": "cut",
  obg: "obstetrics",
  gynaecology: "obstetrics",
  gynecology: "obstetrics",
  paediatrics: "pediatrics",
  paediatric: "pediatrics",
  anaesthesia: "anaesthesiology",
  anesthesia: "anaesthesiology",
  ortho: "orthopaedics",
  orthopedics: "orthopaedics",
  derma: "dermatology",
  bangalore: "bengaluru",
  stipends: "stipend",
  fee: "fees",
  colleges: "college",
};
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/cut[\s-]off/g, "cutoff")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => FOLD[w] ?? w);

/** The closest page in our sitemap for a search we are not shown for — a guess, labelled as one. */
async function closestPage(query: string, paths: string[]): Promise<string | null> {
  // A PG search lands only on a PG page, an MBBS search only on an MBBS page.
  // A search that names neither level is a NEET PG one while that is the season (lib/researchFocus.ts) — "fees of
  // private medical colleges in india" had landed on an MBBS college whose name says "Private Limited".
  const ug = /\b(mbbs|ug|bds|neet ug)\b/i.test(query);
  const pg = /\b(pg|md|ms|dnb|mds|post ?graduate|stipend|bond)\b/i.test(query) || (!ug && (await pgFocus()));
  const PG_PATH = /^\/(md-ms-india|neet-pg|counselling\/neet-pg|md-vs-dnb|management-quota|nri-quota|neet-ss|neet-mds)/;
  const UG_PATH = /^\/(mbbs-india|neet-ug|bds-india|counselling\/mbbs|ayush)/;
  paths = paths.filter((p) => (pg && !ug ? !UG_PATH.test(p) : ug && !pg ? !PG_PATH.test(p) : true));
  // Words that say what is asked or what kind of college, never which page: a college's slug can hold any of them.
  const GENERIC = ["cut", "fees", "seats", "rank", "marks", "pg", "md", "ms", "mbbs", "college", "private", "government", "govt",
    "deemed", "medical", "institute", "hospital", "sciences", "university", "admission", "counselling", "counseling", "quota"];
  // A search about the journey (documents, a counsellor, open states, a refund…) that no page names goes to the page for
  // that stage, not to whichever college or state shares one word with it.
  const stage = JOURNEY_HUBS.find(([re]) => re.test(query));
  const q = words(query).filter((w) => !GENERIC.includes(w));
  if (!q.length) return stage && (pg || !ug) ? stage[1] : null;
  let best: { path: string; score: number } | null = null;
  for (const p of paths) {
    const pw = words(p.replace(/-/g, " "));
    const hit = q.filter((w) => pw.some((x) => x === w || (w.length >= 5 && x.startsWith(w.slice(0, 5))))).length;
    const score = hit / q.length - p.length / 10_000;
    if (hit && (!best || score > best.score)) best = { path: p, score };
  }
  if (best && best.score >= 0.6) return best.path;
  if (stage && (pg || !ug)) return stage[1];
  // No page names the search's own words: the hub that answers its kind of question, if one does.
  const hub = HUBS.find(([re, level]) => re.test(query) && (level === "any" || (level === "pg" ? pg || !ug : ug)));
  return hub ? hub[2] : null;
}

/**
 * The page for each stage a NEET PG candidate and the family go through (2026-11-12, owner: "candidates unke guardians kin
 * conditions se gujarte honge kaise searches karte honge… un sab keywords ko hunt karo target set karo"). Built from 90
 * days of Search Console and ~3,000 Google/Bing autocomplete searches grouped by stage (scripts/tmp/harness/journey*.ts):
 * the stages where families look for help — a counsellor, documents, which counselling they may sit, a refund, DNB's
 * standing, seats added, what next after a low rank — had almost no impressions. Used when no page names the search.
 */
const JOURNEY_HUBS: [RegExp, string][] = [
  [/\bnri\b.*\bdocuments?\b|\bdocuments?\b.*\bnri\b/i, "/nri-quota/documents"],
  [/\b(counsell?or|counsell?ors|consultan\w*|guidance|agent|agents|direct admission|seat booking|donation|fraud|scam)\b/i, "/counselling"],
  [/\b(documents?|certificates?|allotment letter|document verification|reporting|joining)\b|kagaz/i, "/neet-pg-documents"],
  [/\b(in ?service|service quota|sponsored seats?|govt doctors?)\b/i, "/neet-pg-in-service-quota"],
  [/\b(open states?|domicile|other state|outside state|non.?domicile)\b/i, "/neet-pg-open-states"],
  [/\b(state quota|aiq vs|eligibility|eligible|fmge?|foreign medical)\b/i, "/neet-pg-counselling-kaise-hoti-hai"],
  [/\b(security deposit|refund|registration fee)/i, "/neet-pg-choice-filling"],
  [/\b(equivalent|equal to md|dnb kya|what is dnb|dnb degree|difference between dnb|dnb vs|vs dnb|dnb or md|md or dnb|dnb quota)\b/i, "/md-vs-dnb"],
  [/\b(seat increase|seats increase|increase in (pg|neet pg)? ?seats|new pg seats|nmc (approved|recogni[sz]ed)|newly added|added seats)\b/i, "/neet-pg-seat-increase"],
  [/\b(predictor|predict)\b/i, "/neet-college-predictor"],
  [/\b(loan|loans|scholarship|emi|kitna paisa|paisa lagta)\b/i, "/md-ms-india/fees"],
  [/\b(drop|dropper|repeat|not qualified|without (neet )?pg|after mbbs|what next|ke baad kya|low (rank|score|marks)|just qualified)\b/i, "/neet-pg-low-score-clinical-branches"],
  [/\b(rank vs branch|branch(es)? list|list of (pg )?branches|top branch|best branch|which branch|branches after mbbs|scope)\b/i, "/md-ms-india/branches"],
  [/\b(salary|kitna stipend|stipend kitna)\b/i, "/md-ms-india/stipend"],
  [/\b(qualifying|percentile|score ?card|answer key|marks vs rank|rank vs marks)\b/i, "/neet-pg-marks-vs-rank"],
];

/** The hub for a kind of question, when no page carries the search's own words ("neet pg cutoff reduction"). */
const HUBS: [RegExp, "pg" | "ug" | "any", string][] = [
  [/\b(choice filling|upgrad|free exit|freeze|float|resign|forfeit|security deposit)/i, "pg", "/neet-pg-choice-filling"],
  [/\b(marks?|score)\b.*\brank\b|\brank\b.*\b(marks?|score)\b|\bpercentile\b/i, "pg", "/neet-pg-marks-vs-rank"],
  [/\b(cut ?off|closing rank)\b/i, "pg", "/neet-pg-cutoff"],
  [/\b(cut ?off|closing rank)\b/i, "ug", "/neet-ug-cutoff"],
  [/\bstipend\b/i, "any", "/md-ms-india/stipend"],
  [/\bbond\b|seat leaving/i, "any", "/md-ms-india/bond"],
  // "jk neet pg website": the answer names the state's own site and goes on its counselling page (lib/searchFaq.ts).
  [/\b(website|portal|official site|login)\b/i, "any", "/neet-counselling-updates"],
  [/\b(registration|schedule|notice|date|dates|result)\b/i, "any", "/neet-counselling-updates"],
  [/\bfees?\b/i, "pg", "/md-ms-india/fees"],
  [/\bseat matrix|seats\b/i, "pg", "/neet-pg-seat-matrix"],
  [/\bdnb\b/i, "pg", "/md-vs-dnb"],
];

/** A search that is only a name ("malabar institute of medical sciences kannur") — no question to answer in an H2. */
const ASKS = /\b(fees?|stipend|cut ?off|seats?|rank|marks?|score|bond|admission|counsell?ing|round|result|quota|salary|hostel|ranking|review|how|what|which|why|when|kya|kaise|kitn[aie]|list|vs|best|top|website|portal)\b/i;

/* ------------------------------------------------------------------ budget */

/** How many searches this hour may use: what is left this month after the hunt's share, front-loaded over the hours left. */
export async function allowance(): Promise<number> {
  const u = await webSearchUsage();
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const hoursLeft = Math.max(1, (end.getTime() - now.getTime()) / 3_600_000);
  const reserve = Math.ceil((hoursLeft / 24) * HUNT_PER_DAY);
  const free = u.budget - u.used - reserve;
  if (free <= 0) return 0;
  // Front-loaded (the owner wants research now): spread over a third of the hours left, at most 6 an hour.
  return Math.max(1, Math.min(6, Math.floor(free / Math.max(24, hoursLeft / 3))));
}

/* ------------------------------------------------------------------ the run */

export interface Advice {
  kind: "no_page" | "title" | "facts" | "rank" | "section" | "done";
  text: string;
}

export async function runResearch(limit?: number): Promise<{ researched: number; ours: number; suggested?: number; published?: number; skipped?: string }> {
  const sug = await collectSuggestions(16).catch(() => ({ seeds: 0, found: 0, added: 0 }));
  const budget = limit ?? (await allowance());
  if (budget <= 0) return { researched: 0, ours: 0, suggested: sug.added, skipped: "web search budget kept for the daily hunt" };

  const recent = new Set(
    ((await db.execute(sql`SELECT DISTINCT lower(query) AS q FROM serp_research WHERE run_on > current_date - 21`)) as unknown as { q: string }[]).map((r) => r.q),
  );
  const gsc = await gscQueries();
  // NEET PG only while that is the season (lib/researchFocus.ts).
  const focus = await pgFocus();
  const opps = [...gsc.values()]
    .filter((r) => isOpportunity(r) && !recent.has(r.query.toLowerCase()) && !(focus && ugOnly(r.query)))
    .sort((a, b) => b.impressions - a.impressions);
  // Real searches we are not shown for, or only past page 2: the most recurring first.
  const sugRows = (await db.execute(sql`
    SELECT query, times_seen FROM serp_suggest
     WHERE researched_on IS NULL OR researched_on < current_date - 21
     ORDER BY times_seen DESC, last_seen DESC LIMIT 200`)) as unknown as { query: string; times_seen: number }[];
  const gaps = sugRows.filter((s) => !recent.has(s.query) && !((gsc.get(s.query)?.position ?? 99) <= 20) && !(focus && ugOnly(s.query)));

  const nGsc = Math.min(opps.length, Math.ceil(budget / 2));
  const nSug = Math.min(gaps.length, budget - nGsc);
  const plan: { query: string; kind: "gsc" | "suggest"; gsc?: GscRow; seen?: number }[] = [
    ...opps.slice(0, nGsc + Math.max(0, budget - nGsc - nSug)).map((g) => ({ query: g.query, kind: "gsc" as const, gsc: g })),
    ...gaps.slice(0, nSug).map((s) => ({ query: s.query, kind: "suggest" as const, gsc: gsc.get(s.query), seen: s.times_seen })),
  ].slice(0, budget);

  const paths = plan.some((p) => p.kind === "suggest" && !p.gsc)
    ? Object.values(await sitemapGroups())
        .flat()
        .map((e) => e.url.replace(/^https:\/\/www\.admissionhands\.com/, "") || "/")
    : [];
  const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  let researched = 0;
  let published = 0;
  let officialTried = 0;
  const OFFICIAL_PER_RUN = 2;
  let ours = 0;
  for (const item of plan) {
    const found = await webSearchAnswer(item.query, 10);
    if (!found) return { researched, ours, suggested: sug.added, published, skipped: "web search budget used up for the month" };
    const results = found.results.map((x, i) => ({ rank: i + 1, url: x.url, domain: host(x.url), title: x.title, snippet: x.content.slice(0, 300) }));
    const mine = results.find((x) => OURS.test(x.domain));
    if (mine) ours++;
    const competitors = [...new Set(results.filter((x) => !OURS.test(x.domain)).map((x) => x.domain))].slice(0, 8);

    const landing = item.gsc?.page ?? (await closestPage(item.query, paths));
    const page = landing ? await ourPage(landing) : null;
    const facts = gatherFacts(found.answer, found.results, page?.text ?? null);
    const titleWords = new Set(words(page?.title ?? ""));
    const titleGap = page ? [...new Set(words(item.query))].filter((w) => !titleWords.has(w) && w.length > 2 && !/^\d+$/.test(w)) : [];

    const advice: Advice[] = [];
    if (!landing)
      advice.push({ kind: "no_page", text: `No page of ours answers "${item.query}"${item.seen ? ` (autocomplete, seen ${item.seen}×)` : ""} — a new page or a section on the nearest one.` });
    // The title's gap only where Google already shows that page for the search; a search we are not shown for, whose
    // nearest page is a guess, gets "answer it there or give it a page" instead.
    if (item.gsc && page && titleGap.length) advice.push({ kind: "title", text: `${landing}: the title lacks ${titleGap.map((w) => `"${w}"`).join(", ")}.` });
    if (!item.gsc && landing && page && !page.text.includes(item.query.toLowerCase()))
      advice.push({
        kind: "section",
        text: `"${item.query}"${item.seen ? ` (autocomplete, seen ${item.seen}×)` : ""} — nearest page ${landing}: answer it there under its own words, or give it a page of its own.`,
      });
    const missingStrong = facts.filter((f) => !f.onOurPage && f.confidence !== "single");
    if (missingStrong.length)
      advice.push({
        kind: "facts",
        text: `Figures others print that ${landing ?? "we"} do${landing ? "es" : ""} not: ${missingStrong
          .slice(0, 5)
          .map((f) => `${f.fact} (${f.confidence === "official" ? "official: " : ""}${f.sources.filter((s) => s !== "answer").slice(0, 2).join(", ")})`)
          .join("; ")} — check against the official source first.`,
      });
    // A long, specific search (five words or more, often a question — the kind AI answers are built from) on a page that
    // is not yet in the top 3: answer it under its own words (owner's reels, 2026-11-11: an H2 with the exact search, the
    // answer in its first sentence). Only when the page does not already carry the words as a heading-sized phrase.
    const long = item.query.trim().split(/\s+/).length >= 5;
    if (item.gsc && long && ASKS.test(item.query) && landing && page && item.gsc.position >= 3 && !page.text.includes(item.query.toLowerCase()))
      advice.push({ kind: "section", text: `${landing}: add an H2 "${item.query}" with the answer in its first sentence (a long search, #${item.gsc.position.toFixed(1)}).` });
    if (!mine && competitors.length) advice.push({ kind: "rank", text: `Not in the web's top 10; first: ${competitors.slice(0, 3).join(", ")}.` });

    // Implementation, not only advice (owner, same day): when a data builder answers the search, the landing page carries
    // it as a heading with the answer under it (lib/searchFaq.ts) — the H2 advice done by the site itself.
    if (landing && published < FAQ_PER_RUN) {
      // When our data has no answer, an official page may: at most OFFICIAL_PER_RUN tries an hour (a Tavily credit and a
      // Gemini call each), and only where Google shows the page or a search recurs.
      const live = await offerSearchFaq(
        { query: item.query, page: landing, impressions: item.gsc?.impressions, position: item.gsc?.position },
        { official: officialTried < OFFICIAL_PER_RUN },
      ).catch(() => false as const);
      if (live === "official" || (!live && officialTried < OFFICIAL_PER_RUN)) officialTried++;
      if (live) {
        published++;
        // The H2 advice is now done: replace it rather than ask for it.
        for (let i = advice.length - 1; i >= 0; i--) if (advice[i].kind === "section") advice.splice(i, 1);
        advice.unshift({
          kind: "done",
          text: `Done: "${item.query}" is now answered on ${landing}, ${live === "official" ? "from an official page, every figure checked against it" : "from live data"}.`,
        });
      }
    }
    // Priority: Search Console's impressions where we have them (more for page 1–2 positions), otherwise how often
    // autocomplete offers it; more when there is no page at all, or official figures we lack.
    const base = item.gsc ? item.gsc.impressions * (item.gsc.position <= 10 ? 1.5 : 1) : (item.seen ?? 1) * 40;
    const priority = Math.round(base * (landing ? 1 : 1.6) * (missingStrong.some((f) => f.official) ? 1.3 : 1) * (mine ? 0.8 : 1));

    await db.execute(sql`
      INSERT INTO serp_research (run_on, query, page, impressions, position, answer, results, our_rank, missing, competitors,
                                 kind, facts, our_title, title_gap, advice, priority)
      VALUES (${today}, ${item.query}, ${landing}, ${item.gsc?.impressions ?? null}, ${item.gsc?.position ?? null}, ${found.answer},
              ${JSON.stringify(results)}::jsonb, ${mine?.rank ?? null},
              ${JSON.stringify(facts.filter((f) => !f.onOurPage).map((f) => f.fact))}::jsonb,
              ${`{${competitors.map((c) => `"${c.replace(/"/g, "")}"`).join(",")}}`}::text[],
              ${item.kind}, ${JSON.stringify(facts)}::jsonb, ${page?.title ?? null},
              ${`{${titleGap.map((w) => `"${w}"`).join(",")}}`}::text[], ${JSON.stringify(advice)}::jsonb, ${priority})
      ON CONFLICT (run_on, query) DO NOTHING`);
    if (item.kind === "suggest") await db.execute(sql`UPDATE serp_suggest SET researched_on = ${today} WHERE query = ${item.query}`);
    researched++;
  }
  // Searches not studied this hour can still be answered where Google already shows us — Search Console names the page,
  // and our data answers it; no web search needed, so this costs no Tavily credit.
  // Up to 300 searches, 25 answers, and two minutes — the cron call waits at most five (2026-11-11: 12,983 searches of
  // four words or more in 28 days; five answers an hour had covered 9).
  const deadline = Date.now() + 120_000;
  for (const o of opps.slice(0, 300)) {
    if (published >= FAQ_PER_RUN || Date.now() > deadline) break;
    if (await offerSearchFaq({ query: o.query, page: o.page, impressions: o.impressions, position: o.position }).catch(() => false)) published++;
  }
  return { researched, ours, suggested: sug.added, published };
}

/* ------------------------------------------------------------------ reading it back */

export interface ResearchRow {
  run_on: string;
  created_at: string;
  query: string;
  kind: "gsc" | "suggest";
  page: string | null;
  impressions: number | null;
  position: number | null;
  answer: string | null;
  our_rank: number | null;
  our_title: string | null;
  title_gap: string[];
  missing: string[];
  facts: Fact[];
  advice: Advice[];
  priority: number;
  competitors: string[];
  results: { rank: number; url: string; domain: string; title: string }[];
}

const parse = <T,>(v: unknown, d: T): T => (typeof v === "string" ? (JSON.parse(v) as T) : ((v as T) ?? d));

async function rowsSince(cond: SQL): Promise<ResearchRow[]> {
  const rows = (await db.execute(sql`
    SELECT DISTINCT ON (lower(query)) run_on::text, created_at::text, query, kind, page, impressions, position, answer, our_rank, our_title,
           title_gap, missing, facts, advice, priority, competitors, results
      FROM serp_research WHERE ${cond}
     ORDER BY lower(query), created_at DESC`)) as unknown as (ResearchRow & Record<string, unknown>)[];
  return rows
    .map((r) => ({
      ...r,
      missing: parse<string[]>(r.missing, []),
      facts: parse<Fact[]>(r.facts, []),
      advice: parse<Advice[]>(r.advice, []),
      results: parse<ResearchRow["results"]>(r.results, []),
      title_gap: r.title_gap ?? [],
      priority: Number(r.priority) || 0,
    }))
    .sort((a, b) => b.priority - a.priority || (b.impressions ?? 0) - (a.impressions ?? 0));
}

export async function researchReport(days = 30): Promise<{
  rows: ResearchRow[];
  domains: { domain: string; n: number }[];
  pages: { page: string; queries: number; impressions: number; noTitle: string[]; facts: number }[];
  suggest: { total: number; today: number; noPage: number };
}> {
  const rows = await rowsSince(sql`run_on > current_date - ${days}::int`);
  const count = new Map<string, number>();
  for (const r of rows) for (const d of r.competitors ?? []) count.set(d, (count.get(d) ?? 0) + 1);
  // By page: which pages the searches land on, and what they keep asking that the page lacks.
  const byPage = new Map<string, { page: string; queries: number; impressions: number; gap: Map<string, number>; facts: number }>();
  for (const r of rows) {
    if (!r.page) continue;
    const e = byPage.get(r.page) ?? { page: r.page, queries: 0, impressions: 0, gap: new Map(), facts: 0 };
    e.queries++;
    e.impressions += r.impressions ?? 0;
    for (const w of r.title_gap) e.gap.set(w, (e.gap.get(w) ?? 0) + 1);
    e.facts += r.facts.filter((f) => !f.onOurPage && f.confidence !== "single").length;
    byPage.set(r.page, e);
  }
  const s = (await db.execute(sql`
    SELECT count(*)::int AS total, count(*) FILTER (WHERE first_seen > now() - interval '24 hours')::int AS today FROM serp_suggest`)) as unknown as {
    total: number;
    today: number;
  }[];
  return {
    rows,
    domains: [...count].map(([domain, n]) => ({ domain, n })).sort((a, b) => b.n - a.n).slice(0, 15),
    pages: [...byPage.values()]
      .map((e) => ({ page: e.page, queries: e.queries, impressions: e.impressions, facts: e.facts, noTitle: [...e.gap].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w, n]) => `${w} ×${n}`) }))
      .sort((a, b) => b.queries - a.queries || b.impressions - a.impressions)
      .slice(0, 25),
    suggest: { total: s[0]?.total ?? 0, today: s[0]?.today ?? 0, noPage: rows.filter((r) => r.advice.some((a) => a.kind === "no_page")).length },
  };
}

/** The review for the owner's Telegram: what was found since the last one, best first. Empty when nothing new. */
export async function digest(): Promise<string> {
  const since = (await getIntegration("serp.digest.at")) ?? new Date(Date.now() - 3_600_000).toISOString();
  const rows = (await rowsSince(sql`created_at > ${since}::timestamptz`)).filter((r) => r.advice.length);
  // What went on the site since the last review, studied or not (lib/searchFaq.ts).
  const done = (await db.execute(sql`
    SELECT question, page FROM search_faqs WHERE status = 'live' AND created_at > ${since}::timestamptz ORDER BY created_at`)) as unknown as {
    question: string;
    page: string;
  }[];
  await setIntegration("serp.digest.at", new Date().toISOString());
  if (!rows.length && !done.length) return "";
  const top = rows.slice(0, 4);
  const line = (r: ResearchRow, i: number) =>
    [
      `${i + 1}. "${r.query}"${r.kind === "suggest" ? " (autocomplete)" : r.impressions ? ` — ${r.impressions} imp, #${r.position?.toFixed(1)}` : ""}`,
      ...r.advice.slice(0, 3).map((a) => `   • ${a.text}`),
    ].join("\n");
  return [
    ...(done.length ? [`Done on the site: ${done.length} search${done.length === 1 ? "" : "es"} now answered on our pages:`, ...done.map((r) => `   ✓ "${r.question}" → ${r.page}`), ""] : []),
    ...(rows.length ? [`Search research: ${rows.length} searches studied since the last review. Top ${top.length}:`] : []),
    ...top.map(line),
    `All of it: Admin → Search research.`,
  ].join("\n");
}

/** Monday's line, once the owner moves the review to weekly (`serp.digest` = "weekly"). */
export async function weeklySummary(): Promise<string> {
  const { rows, domains } = await researchReport(7);
  if (!rows.length) return "";
  const inTop = rows.filter((r) => r.our_rank != null).length;
  return [
    `Search research, last 7 days: ${rows.length} searches studied; admissionhands.com among the top 10 results in ${inTop}.`,
    `Who shows up most: ${domains.slice(0, 5).map((d) => `${d.domain} (${d.n})`).join(", ")}.`,
    ...rows.slice(0, 5).map((r) => `• "${r.query}": ${r.advice[0]?.text ?? "—"}`),
    `Full report: Admin → Search research.`,
  ].join("\n");
}
