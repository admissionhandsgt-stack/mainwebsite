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
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { draftFor, type Draft } from "@/lib/huntAnswers";
import { getPgStates } from "@/lib/pgStateQueries";
import { officialAnswer } from "@/lib/officialAnswer";

/** An official page's answer is shown this many days after it was checked, then the hourly run checks it again. */
const OFFICIAL_DAYS = 45;
/** A question as people type one ("free exit kya hai", "how to fill choices"), for the official-page answers. */
const QUESTION = /^(what|which|how|why|when|where|who|is|are|can|does|do)\b|\b(kya|kaise|kab|kitn[aie]|kaun)\b|\?$/i;

export const PER_PAGE = 6;
export const PER_RUN = 5;

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
const STATE_AWARE = new Set(["state-stipend", "bond-state", "college", "authority"]);

async function namesState(q: string): Promise<boolean> {
  const states = await getPgStates().catch(() => []);
  const flat = ` ${q.toLowerCase().replace(/[^a-z]+/g, " ")} `;
  const names = [...states.map((s) => s.name.toLowerCase()), "tamilnadu", "up", "mp", "ap", "jk", "j&k", "bengal", "bangalore", "mumbai", "delhi", "kolkata", "chennai", "hyderabad", "pune", "jaipur", "lucknow"];
  return names.some((n) => flat.includes(` ${n.replace(/[^a-z]+/g, " ").trim()} `));
}

/** A search worth answering on a page: it asks something a builder knows about, not only a name. */
const ASKS = /\b(fees?|stipend|salary|cut ?off|seats?|rank|marks?|score|bond|penalt|upgrad|freeze|float|free exit|choice|resign|clinical|how many|statistic|website|portal|official site|login)\b/i;

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

/**
 * Called by the research bot for each search it studied. Adds the search to `page` when a builder answers it, the page
 * has room and the search is not there already. Returns true when it went live.
 */
export async function offerSearchFaq(
  item: { query: string; page: string | null; impressions?: number | null; position?: number | null },
  opts: { official?: boolean } = {},
): Promise<false | "data" | "official"> {
  const q = item.query.trim().toLowerCase();
  if (!item.page || q.split(/\s+/).length < 3) return false;
  let page = item.page;
  let room = await roomOn(page, q);
  if (room.same > 0 || room.live >= PER_PAGE) return false;
  const d = ASKS.test(q) ? await draftFor(q) : null;
  // "jk neet pg website" belongs on that state's own page: kept where Google shows it when that page is the state's
  // (any of its pages ends in the state's slug), else moved to the answer's page — the state's counselling page.
  if (d?.kind === "authority" && page !== d.page && lastPart(page) !== lastPart(d.page)) {
    page = d.page;
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
        VALUES (${item.page}, ${q}, 'official', 'none', ${item.impressions ?? null}, ${item.position ?? null}, current_date)
        ON CONFLICT (page, lower(question)) DO UPDATE
          SET status = CASE WHEN search_faqs.status = 'removed' THEN 'removed' ELSE 'none' END, checked_on = current_date, updated_at = now()`);
      return false;
    }
    // A staff member's "Remove" stays removed even when the page is found again.
    await db.execute(sql`
      INSERT INTO search_faqs (page, question, kind, impressions, position, answer, source_url, as_of, checked_on)
      VALUES (${item.page}, ${q}, 'official', ${item.impressions ?? null}, ${item.position ?? null},
              ${JSON.stringify({ lead: o.lead, points: o.points, title: o.sourceTitle })}::jsonb, ${o.sourceUrl}, ${o.asOf}, current_date)
      ON CONFLICT (page, lower(question)) DO UPDATE
        SET answer = EXCLUDED.answer, source_url = EXCLUDED.source_url, as_of = EXCLUDED.as_of, checked_on = current_date,
            status = CASE WHEN search_faqs.status = 'removed' THEN 'removed' ELSE 'live' END, updated_at = now()`);
    revalidateTag("search-faqs");
    return "official";
  }
  // One answer per builder on a page: three searches answered by the same national stipend figures would print the
  // same text three times.
  if (room.kinds.includes(d.kind)) return false;
  // A search that names a state is answered only by a builder that reads that state: the national figures under
  // "md radiology cutoff rajasthan" would answer a different question.
  if (!STATE_AWARE.has(d.kind) && (await namesState(q))) return false;
  // Likewise a branch: "md nuclear medicine seats in india" is not answered by India's total PG seats.
  if (d.kind !== "branch" && BRANCH_NAMED.test(q)) return false;
  // …also when it names the speciality without the degree ("nuclear medicine pg seats in india"), or the page is a
  // branch page: only the branch builder answers there. A college's own name may hold such a word ("Institute of
  // Aerospace Medicine"), so the college builder is let through.
  if (d.kind !== "branch" && d.kind !== "college" && (SPECIALTY.test(q) || /^\/md-ms-india\/branches\//.test(page))) return false;
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
        (out[x.page] ??= []).push({ ...x, answer: typeof x.answer === "string" ? (JSON.parse(x.answer) as LiveRow["answer"]) : (x.answer as LiveRow["answer"]) });
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
      const d = await answer(x.question).catch(() => null);
      return d ? { id: x.id, question: x.question, heading: asHeading(x.question), draft: d } : null;
    }),
  );
  return out.filter((x): x is SearchFaq => Boolean(x));
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

export async function setSearchFaqStatus(id: number, status: "live" | "removed") {
  await db.execute(sql`UPDATE search_faqs SET status = ${status}, updated_at = now() WHERE id = ${id}`);
  revalidateTag("search-faqs");
}
