/**
 * Search answers on our own pages (2026-11-11, owner: "review to ara hai lekin usko hum website mai kese implement +
 * target karenge… implementation bhi to chaiye"). The research bot (lib/serpResearch.ts) hands over a real search — one
 * Search Console shows a page of ours for, or an autocomplete search whose nearest page is ours — and if one of our data
 * builders (lib/huntAnswers.ts `draftFor`: stipend, fees, bond, marks → rank, branch cut off, low score, seats, choice
 * filling) can answer it, the page carries it: the search itself as a heading, the answer in its first sentence, the
 * points, what to check and the source (components/seo/SearchFaqs.tsx, every page via the root layout). This is the
 * reels' method (an H2 with the exact search, answered at once) done by the site itself.
 *
 * Only the question is stored (search_faqs, migration 0059); the answer is rebuilt from live data when the page renders,
 * so no figure goes stale, and a question whose builder stops answering simply disappears. No builder, no answer: a
 * page's first line is never re-served as an "answer". At most `PER_PAGE` per page, `PER_RUN` new ones an hour. A staff
 * member removes one from Admin → Search research. Server only.
 */
import { unstable_cache, revalidateTag } from "next/cache";
import { notOurs } from "@/lib/searchIntent";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { draftFor, type Draft } from "@/lib/huntAnswers";
import { getPgStates } from "@/lib/pgStateQueries";
import { officialAnswer } from "@/lib/officialAnswer";
import { branchWord } from "@/lib/huntBranch";

/** An official page's answer is shown this many days after it was checked, then the hourly run checks it again. */
const OFFICIAL_DAYS = 45;
/** A question as people type one ("free exit kya hai", "how to fill choices"), for the official-page answers. */
const QUESTION = /^(what|which|how|why|when|where|who|is|are|can|does|do)\b|\b(kya|kaise|kab|kitn[aie]|kaun)\b|\?$/i;

export const PER_PAGE = 6;
export const PER_RUN = 25;

/** "stipend for pg medical students state wise" → "Stipend for PG medical students state wise". */
export function asHeading(q: string): string {
  const up: Record<string, string> = { pg: "PG", ug: "UG", neet: "NEET", md: "MD", ms: "MS", mbbs: "MBBS", bds: "BDS", dnb: "DNB", aiq: "AIQ", mcc: "MCC", nmc: "NMC", nri: "NRI", obc: "OBC", ews: "EWS", sc: "SC", st: "ST", air: "AIR", mds: "MDS", ss: "SS", aiims: "AIIMS", jipmer: "JIPMER", obg: "OBG", ent: "ENT", kgmu: "KGMU", bhu: "BHU", amu: "AMU", cmc: "CMC", kmc: "KMC", kem: "KEM", mgm: "MGM", pgimer: "PGIMER", esic: "ESIC", gmers: "GMERS" };
  const t = q
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    // Initials as searched ("sms jaipur", "kd medical college"): a short word with no vowel is an acronym.
    .map((w) => up[w.toLowerCase()] ?? (/^[b-df-hj-np-tv-xz]{2,5}$/i.test(w) ? w.toUpperCase() : w))
    .join(" ");
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /^(what|which|how|why|when|where|who|is|are|can|does|do|kya|kitn|kaise)\b/i.test(s) && !s.endsWith("?") ? `${s}?` : s;
}

/** A search that names a branch ("md radiology", "ms obg", "dnb pediatrics"), not just the degree. */
const BRANCH_NAMED = /\b(md|ms|dnb|dm|m\.?ch|diploma)\s+(?!seats?\b|fees?\b|stipend\b|cut|counsel|admission|in\b|vs\b|or\b|and\b|course|college|rank|marks)[a-z]{3,}/i;

/** A speciality named on its own. "medicine" alone counts: "general medicine", "nuclear medicine", "emergency medicine". */
const SPECIALTY = /\b(radiology|radio ?diagnosis|medicine|surgery|nuclear|patholog|dermatolog|derma|p(a)?ediatric|orthop|obstetric|gyn(a)?ecolog|obg|an(a)?esth|psychiatr|ophthalm|ent|pulmonar|respiratory|microbiolog|pharmacolog|anatomy|physiolog|biochem|forensic|community medicine|emergency|palliative|geriatric|tropical|aerospace|genetic|cardio|neuro|nephro|gastro|onco|urolog|endocrin|radiotherapy|immunohematolog|transfusion)\w*/i;

/** Builders whose answer is about the state or college the search names (lib/huntAnswers.ts kinds). */
/** Compared on the kind before its first ":" ("branch-state:rajasthan" → "branch-state"). */
const STATE_AWARE = new Set([
  "state-stipend", "bond-state", "college", "authority", "branch-state", "college-branch", "college-round",
  // A branch's fees, stipend or bond in a state, a city or one college, and a city's own figures (lib/branchMoney.ts).
  "branch-fees-state", "branch-fees-city", "branch-fees-college",
  "branch-stipend-state", "branch-stipend-city", "branch-stipend-college",
  "branch-bond-state", "branch-bond-city", "branch-bond-college",
  "city-fees", "city-stipend", "city-bond",
]);

async function namesState(q: string): Promise<boolean> {
  const states = await getPgStates().catch(() => []);
  const flat = ` ${q.toLowerCase().replace(/[^a-z]+/g, " ")} `;
  const names = [...states.map((s) => s.name.toLowerCase()), "tamilnadu", "up", "mp", "ap", "jk", "j&k", "bengal", "bangalore", "mumbai", "delhi", "kolkata", "chennai", "hyderabad", "pune", "jaipur", "lucknow"];
  return names.some((n) => flat.includes(` ${n.replace(/[^a-z]+/g, " ").trim()} `));
}

/** A search worth answering on a page: it asks something a builder knows about, not only a name. */
const ASKS = /\b(fees?|stipend|salary|cut ?off|seats?|rank|marks?|score|bond|penalt|upgrad|freeze|float|free exit|choice|resign|clinical|how many|statistic|website|portal|official site|login|documents?|certificates?|eligib\w*|domicile|open states?|in ?service|refund|security deposit|equivalent|reporting|registration)\b/i;

/** Room on a page for one more answer: how many are live, whether this search is there, which builders answer. */
async function roomOn(page: string, q: string) {
  const r = (await db.execute(sql`
    SELECT count(*) FILTER (WHERE status = 'live')::int AS live,
           count(*) FILTER (WHERE lower(question) = ${q}
             -- an official answer past its days, or a miss over a month old, is looked at again
             AND NOT (kind = 'official' AND status IN ('live', 'none') AND checked_on <= current_date - (CASE WHEN status = 'none' THEN 30 ELSE ${OFFICIAL_DAYS} END)))::int AS same,
           array_agg(kind) FILTER (WHERE status = 'live') AS kinds
      FROM search_faqs WHERE page = ${page}`)) as unknown as { live: number; same: number; kinds: string[] | null }[];
  return { live: r[0]?.live ?? 0, same: r[0]?.same ?? 0, kinds: r[0]?.kinds ?? [] };
}
const lastPart = (p: string) => p.split("/").filter(Boolean).pop() ?? "";
/** Pages about one branch, state or college: an answer about another one moves to its own page. NEET SS and MDS pages
 *  are their own courses: an MD answer there ("md radiology fees" on DM Neuro Radiology) moves too (2026-11-13 audit). */
const SPECIFIC = /^\/(md-ms-india\/(branches|states|colleges|stipend|fees|bond)|mbbs-india\/colleges|counselling\/(neet-pg|mbbs)|medical-colleges|neet-ss|neet-mds)\//;
/**
 * True when an answer shown on `page`, a hub, has a specific page of its own (a state's bond or stipend page, a branch,
 * a college). An authority answer stays on any page of the state it names ("haryana neet pg website" on Haryana's round
 * page), as the offer rule below keeps it.
 */
function belongsElsewhere(page: string, d: Draft): boolean {
  const target = d.page.split("#")[0];
  if (!SPECIFIC.test(target) || target === page) return false;
  // A state's stipend, bond and fee pages are each the page for their own money: "karnataka pg bond" sat on Karnataka's
  // stipend page as well as its bond page (2026-11-28).
  if (SPECIFIC.test(page)) return moneyOf(page) !== null && moneyOf(target) !== null && moneyOf(page) !== moneyOf(target);
  return !(d.kind === "authority" && lastPart(page) === lastPart(target));
}
const moneyOf = (p: string) => /^\/md-ms-india\/(stipend|bond|fees)\//.exec(p)?.[1] ?? null;
function pageFits(page: string, d: Draft, q: string): boolean {
  if (!SPECIFIC.test(page)) return true; // a hub (cutoff, marks vs rank, a round page) takes any of its searches
  if (belongsElsewhere(page, d)) return false;
  if (lastPart(page) === lastPart(d.page) || d.page.startsWith(`${page}/`)) return true;
  // A branch page keeps a round answer about the same branch…
  const m = /^\/md-ms-india\/branches\/([^/]+)$/.exec(page);
  const bw = branchWord(q);
  // …of the same degree: "anesthesia cut off marks" (MD) is not the Diploma in Anaesthesia page's (2026-11-13 audit).
  const deg = m ? (/^(diploma|drnb|dnb)\b/.exec(m[1].replace(/-/g, " ")) ?? [])[1] : undefined;
  if (deg && !new RegExp(`\\b${deg}\\b`, "i").test(q)) return false;
  return Boolean(m && bw && d.kind.startsWith("branch:") && bw.course.test(m[1].replace(/-/g, " ")));
}


/**
 * Called by the research bot for each search it studied. Adds the search to `page` when a builder answers it, the page
 * has room and the search is not there already. Returns true when it went live.
 */
export async function offerSearchFaq(
  item: { query: string; page: string | null; impressions?: number | null; position?: number | null },
  opts: { official?: boolean } = {},
): Promise<false | "data" | "official"> {
  const q = item.query.trim().toLowerCase();
  if (!item.page || q.split(/\s+/).length < 3 || notOurs(q)) return false;
  // A page is stored without its "#section": the page renders its answers by path, so "/md-ms-india/bond#karnataka"
  // never showed (four bond answers sat unseen, 2026-11-15 audit).
  const bare = (p: string) => p.split("#")[0];
  let page = bare(item.page);
  let room = await roomOn(page, q);
  if (room.same > 0 || room.live >= PER_PAGE) return false;
  const d = ASKS.test(q) ? await draftFor(q) : null;
  // "jk neet pg website" belongs on that state's own page: kept where Google shows it when that page is the state's
  // (any of its pages ends in the state's slug), else moved to the answer's page — the state's counselling page.
  // A hub (the stipend, fees or cut-off page) never keeps an answer whose own page is a specific one — a state's stipend,
  // a college, a branch: two of our pages would then compete for one search ("rajasthan pg stipend" showed the national
  // stipend page at 6.2 and the Rajasthan page at 3.6 — 2026-11-15, from the owner's cannibalisation reel).
  const target = d ? bare(d.page) : "";
  if (
    d &&
    page !== target &&
    (d.kind === "authority"
      ? lastPart(page) !== lastPart(target)
      : !SPECIFIC.test(page)
        ? SPECIFIC.test(target)
        : !pageFits(page, { ...d, page: target }, q))
  ) {
    page = bare(d.page);
    room = await roomOn(page, q);
    if (room.same > 0 || room.live >= PER_PAGE) return false;
  }
  if (!d) {
    // Our data has no answer: an official page may (lib/officialAnswer.ts) — found, copied by Gemini, every figure
    // checked against that page's text. Only for a search that asks something, never a bare name.
    if (!opts.official || !(ASKS.test(q) || QUESTION.test(q))) return false;
    const o = await officialAnswer(q).catch(() => null);
    if (!o) {
      // Remember the miss, so the same search is not paid for again every hour.
      await db.execute(sql`
        INSERT INTO search_faqs (page, question, kind, status, impressions, position, checked_on)
        VALUES (${page}, ${q}, 'official', 'none', ${item.impressions ?? null}, ${item.position ?? null}, current_date)
        ON CONFLICT (page, lower(question)) DO UPDATE
          SET status = CASE WHEN search_faqs.status = 'removed' THEN 'removed' ELSE 'none' END, checked_on = current_date, updated_at = now()`);
      return false;
    }
    // A staff member's "Remove" stays removed even when the page is found again.
    await db.execute(sql`
      INSERT INTO search_faqs (page, question, kind, impressions, position, answer, source_url, as_of, checked_on)
      VALUES (${page}, ${q}, 'official', ${item.impressions ?? null}, ${item.position ?? null},
              ${JSON.stringify({ lead: o.lead, points: o.points, title: o.sourceTitle })}::jsonb, ${o.sourceUrl}, ${o.asOf}, current_date)
      ON CONFLICT (page, lower(question)) DO UPDATE
        SET answer = EXCLUDED.answer, source_url = EXCLUDED.source_url, as_of = EXCLUDED.as_of, checked_on = current_date,
            status = CASE WHEN search_faqs.status = 'removed' THEN 'removed' ELSE 'live' END, updated_at = now()`);
    revalidateTag("search-faqs");
    return "official";
  }
  // One answer per builder on a page: three searches answered by the same national stipend figures would print the
  // same text three times.
  // "college" and "college-fee-listed" are one builder (a college without a 2026-27 notice falls back to its listing),
  // so two searches about one college's fees printed the same answer twice (Rama Kanpur, 2026-11-12 audit).
  const family = (k: string) => (k === "college-fee-listed" ? "college" : k);
  if (room.kinds.some((k) => family(k) === family(d.kind))) return false;
  // A search that names a state is answered only by a builder that reads that state: the national figures under
  // "md radiology cutoff rajasthan" would answer a different question.
  const base = d.kind.split(":")[0];
  if (!STATE_AWARE.has(base) && (await namesState(q))) return false;
  // A DNB search is answered only by a DNB figure or the hospital's own page ("dnb stipend in west bengal" had the
  // state's MD/MS stipend), and a college named is not answered by its city's spread ("madras medical college pg
  // stipend" had Chennai's) — the 2026-11-13 audit.
  if (/\bdnb\b/.test(q) && !d.kind.includes("dnb") && !base.startsWith("college")) return false;
  if (base.startsWith("city-") && /\b(medical college|institute|university)\b/.test(q)) return false;
  // Likewise a branch: "md nuclear medicine seats in india" is not answered by India's total PG seats.
  const branchy = base.startsWith("branch") || base.startsWith("college");
  if (!branchy && BRANCH_NAMED.test(q)) return false;
  // …also when it names the speciality without the degree ("nuclear medicine pg seats in india"), or the page is a
  // branch page: only the branch builder answers there. A college's own name may hold such a word ("Institute of
  // Aerospace Medicine"), so the college builder is let through.
  if (!branchy && (SPECIALTY.test(q) || /^\/md-ms-india\/branches\//.test(page))) return false;
  await db.execute(sql`
    INSERT INTO search_faqs (page, question, kind, impressions, position)
    VALUES (${page}, ${q}, ${d.kind}, ${item.impressions ?? null}, ${item.position ?? null})
    ON CONFLICT DO NOTHING`);
  revalidateTag("search-faqs");
  return "data";
}

export interface SearchFaq {
  id: number;
  question: string;
  heading: string;
  draft: Draft;
  /** An official page's answer (lib/officialAnswer.ts): its link and the date it prints. */
  official?: { url: string; title: string; asOf: string | null; checkedOn: string };
}

type LiveRow = {
  id: number;
  question: string;
  kind: string | null;
  answer: { lead: string; points: string[]; title: string } | null;
  source_url: string | null;
  as_of: string | null;
  checked_on: string | null;
};

const livePages = unstable_cache(
  async (): Promise<Record<string, LiveRow[]>> => {
    try {
      const r = (await db.execute(sql`
        SELECT id, page, question, kind, answer, source_url, as_of, checked_on::text
          FROM search_faqs
         WHERE status = 'live' AND (kind IS DISTINCT FROM 'official' OR checked_on > current_date - ${OFFICIAL_DAYS}::int)
         ORDER BY impressions DESC NULLS LAST, id`)) as unknown as (LiveRow & { page: string; answer: unknown })[];
      const out: Record<string, LiveRow[]> = {};
      for (const x of r)
        (out[x.page.split("#")[0]] ??= []).push({ ...x, answer: typeof x.answer === "string" ? (JSON.parse(x.answer) as LiveRow["answer"]) : (x.answer as LiveRow["answer"]) });
      return out;
    } catch {
      return {};
    }
  },
  ["search-faqs-v2"],
  { revalidate: 600, tags: ["search-faqs"] },
);

/** One answer, rebuilt from live data and cached an hour (the builders read cached data themselves). */
const answer = unstable_cache(async (question: string) => draftFor(question), ["search-faq-answer-v1"], { revalidate: 3600, tags: ["search-faqs", "seat-data"] });

export async function getSearchFaqs(path: string | null): Promise<SearchFaq[]> {
  if (!path) return [];
  const list = (await livePages())[path] ?? [];
  if (!list.length) return [];
  const out = await Promise.all(
    list.slice(0, PER_PAGE).map(async (x): Promise<SearchFaq | null> => {
      if (x.kind === "official") {
        if (!x.answer?.lead || !x.source_url) return null;
        return {
          id: x.id,
          question: x.question,
          heading: asHeading(x.question),
          draft: { page: path, kind: "official", lead: x.answer.lead, points: x.answer.points ?? [], what: "" },
          official: { url: x.source_url, title: x.answer.title, asOf: x.as_of, checkedOn: x.checked_on ?? "" },
        };
      }
      // A search the guards now refuse is not shown even if it was placed before them.
      if (notOurs(x.question)) return null;
      const d = await answer(x.question).catch(() => null);
      // A hub never shows an answer whose own page is a specific one (a state's bond or stipend page, a branch, a
      // college): "karnataka pg bond" on the national bond page made two of our pages compete for one search
      // (cannibalisation check, 2026-11-28). `rehomeSearchFaqs` moves such a row to its own page.
      if (d && belongsElsewhere(path, d)) return null;
      return d ? { id: x.id, question: x.question, heading: asHeading(x.question), draft: d } : null;
    }),
  );
  // Two searches can come to the same answer once a builder changes ("delhi pg stipend" was stored as the city answer,
  // "pg stipend in delhi" as the state's, and both read the state's after the 2026-11-15 fix): print each answer once.
  const seen = new Set<string>();
  return out.filter((x): x is SearchFaq => {
    if (!x) return false;
    const key = x.draft.lead.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function listSearchFaqs(): Promise<{ id: number; page: string; question: string; kind: string | null; status: string; created_at: string }[]> {
  try {
    return (await db.execute(sql`
      SELECT id, page, question, kind, status, created_at::text, source_url FROM search_faqs WHERE status <> 'none' ORDER BY created_at DESC LIMIT 200`)) as unknown as {
      id: number;
      page: string;
      question: string;
      kind: string | null;
      status: string;
      created_at: string;
    }[];
  } catch {
    return [];
  }
}

/**
 * Moves a hub's answers to their own page (2026-11-28). An answer placed on a hub before its specific page existed (the
 * state bond pages came on 16 Nov; four bond-state answers sat on /md-ms-india/bond) or before the 15 Nov move rule
 * stays there for good otherwise. Each live data answer on a hub whose builder now names a specific page goes to that
 * page when it has room and no answer from the same builder; else it is deleted (the hourly offer never puts it back on
 * the hub, so nothing regrows). Official answers and staff removals are left alone. Called by the hourly research run.
 */
export async function rehomeSearchFaqs(): Promise<{ moved: number; dropped: number }> {
  const rows = (await db.execute(sql`
    SELECT id, page, question, kind FROM search_faqs
     WHERE status = 'live' AND kind IS DISTINCT FROM 'official'`)) as unknown as { id: number; page: string; question: string; kind: string | null }[];
  let moved = 0, dropped = 0;
  const touched = new Set<string>();
  for (const r of rows) {
    const page = r.page.split("#")[0];
    if (SPECIFIC.test(page) && !moneyOf(page)) continue;
    const d = await draftFor(r.question).catch(() => null);
    if (!d || !belongsElsewhere(page, d)) continue;
    const target = d.page.split("#")[0];
    const room = await roomOn(target, r.question.toLowerCase());
    const family = (k: string) => (k === "college-fee-listed" ? "college" : k);
    let ok = false;
    if (room.same === 0 && room.live < PER_PAGE && !room.kinds.some((k) => family(k) === family(d.kind))) {
      // (page, lower(question)) is unique: a stale official miss of the same search on the target refuses the move.
      ok = await db
        .execute(sql`UPDATE search_faqs SET page = ${target}, kind = ${d.kind}, updated_at = now() WHERE id = ${r.id}`)
        .then(() => true, () => false);
    }
    if (ok) {
      moved++;
      touched.add(target);
    } else {
      await db.execute(sql`DELETE FROM search_faqs WHERE id = ${r.id}`);
      dropped++;
    }
    touched.add(page);
  }
  if (moved || dropped) {
    revalidateTag("search-faqs");
    void import("@/lib/pageWatch").then((m) => m.checkPaths([...touched], "search answers moved to their own page")).catch(() => undefined);
  }
  return { moved, dropped };
}

export async function setSearchFaqStatus(id: number, status: "live" | "removed") {
  const rows = (await db.execute(sql`UPDATE search_faqs SET status = ${status}, updated_at = now() WHERE id = ${id} RETURNING page`)) as unknown as { page: string }[];
  revalidateTag("search-faqs");
  // The page's words changed: re-read it now (lib/pageWatch.ts), not on its tier's next sweep. Not awaited.
  if (rows[0]?.page)
    void import("@/lib/pageWatch").then((m) => m.checkPaths([rows[0].page], "search answer " + status)).catch(() => undefined);
}
