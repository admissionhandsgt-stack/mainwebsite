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

export const PER_PAGE = 6;
export const PER_RUN = 5;

/** "stipend for pg medical students state wise" → "Stipend for PG medical students state wise". */
export function asHeading(q: string): string {
  const up: Record<string, string> = { pg: "PG", ug: "UG", neet: "NEET", md: "MD", ms: "MS", mbbs: "MBBS", bds: "BDS", dnb: "DNB", aiq: "AIQ", mcc: "MCC", nmc: "NMC", nri: "NRI", obc: "OBC", ews: "EWS", sc: "SC", st: "ST", air: "AIR", mds: "MDS", ss: "SS", aiims: "AIIMS", jipmer: "JIPMER", obg: "OBG", ent: "ENT" };
  const t = q
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => up[w.toLowerCase()] ?? w)
    .join(" ");
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /^(what|which|how|why|when|where|who|is|are|can|does|do|kya|kitn|kaise)\b/i.test(s) && !s.endsWith("?") ? `${s}?` : s;
}

/** A search that names a branch ("md radiology", "ms obg", "dnb pediatrics"), not just the degree. */
const BRANCH_NAMED = /\b(md|ms|dnb|dm|m\.?ch|diploma)\s+(?!seats?\b|fees?\b|stipend\b|cut|counsel|admission|in\b|vs\b|or\b|and\b|course|college|rank|marks)[a-z]{3,}/i;

/** Builders whose answer is about the state or college the search names (lib/huntAnswers.ts kinds). */
const STATE_AWARE = new Set(["state-stipend", "bond-state", "college"]);

async function namesState(q: string): Promise<boolean> {
  const states = await getPgStates().catch(() => []);
  const flat = ` ${q.toLowerCase().replace(/[^a-z]+/g, " ")} `;
  const names = [...states.map((s) => s.name.toLowerCase()), "tamilnadu", "up", "mp", "ap", "jk", "j&k", "bengal", "bangalore", "mumbai", "delhi", "kolkata", "chennai", "hyderabad", "pune", "jaipur", "lucknow"];
  return names.some((n) => flat.includes(` ${n.replace(/[^a-z]+/g, " ").trim()} `));
}

/** A search worth answering on a page: it asks something a builder knows about, not only a name. */
const ASKS = /\b(fees?|stipend|salary|cut ?off|seats?|rank|marks?|score|bond|penalt|upgrad|freeze|float|free exit|choice|resign|clinical|how many|statistic)\b/i;

/**
 * Called by the research bot for each search it studied. Adds the search to `page` when a builder answers it, the page
 * has room and the search is not there already. Returns true when it went live.
 */
export async function offerSearchFaq(item: { query: string; page: string | null; impressions?: number | null; position?: number | null }): Promise<boolean> {
  const q = item.query.trim().toLowerCase();
  if (!item.page || !ASKS.test(q) || q.split(/\s+/).length < 3) return false;
  const exists = (await db.execute(sql`
    SELECT count(*) FILTER (WHERE status = 'live')::int AS live,
           count(*) FILTER (WHERE lower(question) = ${q})::int AS same,
           array_agg(kind) FILTER (WHERE status = 'live') AS kinds
      FROM search_faqs WHERE page = ${item.page}`)) as unknown as { live: number; same: number; kinds: string[] | null }[];
  if ((exists[0]?.same ?? 0) > 0 || (exists[0]?.live ?? 0) >= PER_PAGE) return false;
  const d = await draftFor(q);
  if (!d) return false;
  // One answer per builder on a page: three searches answered by the same national stipend figures would print the
  // same text three times.
  if ((exists[0]?.kinds ?? []).includes(d.kind)) return false;
  // A search that names a state is answered only by a builder that reads that state: the national figures under
  // "md radiology cutoff rajasthan" would answer a different question.
  if (!STATE_AWARE.has(d.kind) && (await namesState(q))) return false;
  // Likewise a branch: "md nuclear medicine seats in india" is not answered by India's total PG seats.
  if (d.kind !== "branch" && BRANCH_NAMED.test(q)) return false;
  await db.execute(sql`
    INSERT INTO search_faqs (page, question, kind, impressions, position)
    VALUES (${item.page}, ${q}, ${d.kind}, ${item.impressions ?? null}, ${item.position ?? null})
    ON CONFLICT DO NOTHING`);
  revalidateTag("search-faqs");
  return true;
}

export interface SearchFaq {
  id: number;
  question: string;
  heading: string;
  draft: Draft;
}

const livePages = unstable_cache(
  async (): Promise<Record<string, { id: number; question: string }[]>> => {
    try {
      const r = (await db.execute(sql`
        SELECT id, page, question FROM search_faqs WHERE status = 'live' ORDER BY impressions DESC NULLS LAST, id`)) as unknown as {
        id: number;
        page: string;
        question: string;
      }[];
      const out: Record<string, { id: number; question: string }[]> = {};
      for (const x of r) (out[x.page] ??= []).push({ id: x.id, question: x.question });
      return out;
    } catch {
      return {};
    }
  },
  ["search-faqs-v1"],
  { revalidate: 600, tags: ["search-faqs"] },
);

/** One answer, rebuilt from live data and cached an hour (the builders read cached data themselves). */
const answer = unstable_cache(async (question: string) => draftFor(question), ["search-faq-answer-v1"], { revalidate: 3600, tags: ["search-faqs", "seat-data"] });

export async function getSearchFaqs(path: string | null): Promise<SearchFaq[]> {
  if (!path) return [];
  const list = (await livePages())[path] ?? [];
  if (!list.length) return [];
  const out = await Promise.all(
    list.slice(0, PER_PAGE).map(async (x) => {
      const d = await answer(x.question).catch(() => null);
      return d ? { id: x.id, question: x.question, heading: asHeading(x.question), draft: d } : null;
    }),
  );
  return out.filter((x): x is SearchFaq => Boolean(x));
}

export async function listSearchFaqs(): Promise<{ id: number; page: string; question: string; kind: string | null; status: string; created_at: string }[]> {
  try {
    return (await db.execute(sql`
      SELECT id, page, question, kind, status, created_at::text FROM search_faqs ORDER BY created_at DESC LIMIT 200`)) as unknown as {
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
