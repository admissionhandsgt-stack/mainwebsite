/**
 * Search research (2026-11-11, owner: "bot ya agent banao jo hamare tavily api se websearches kare alag alag aise
 * keywords se sab research save karke ek report banake de usse hum target kar paye"). Google's AI answer for "Jaipur neet
 * pg colleges stipend" quoted our stipend figures and took the bond, the NMC PDF and NIMS's fee from other sites; this
 * finds, query by query, what the web answers that our page does not say.
 *
 * Daily (POST /api/cron/serp-research): the Search Console queries we are shown for at position 3–20 with real
 * impressions, the biggest first, not researched in the last 21 days — `PER_RUN` of them. For each: one Tavily search
 * from India with its short answer (lib/webSearch.ts, the shared monthly budget), where admissionhands.com stands among
 * the results, who else does, and the figures in the answer (₹ amounts, years, seats, percentages) that our landing page
 * does not print. Stored in serp_research; read by Admin → Search research; a Monday summary goes to the owner on
 * Telegram. Server only. Figures found are leads to check against official sources, never copied as they are.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { googleToken } from "@/lib/google";
import { webSearchAnswer } from "@/lib/webSearch";

export const PER_RUN = 15;
const SITE = "sc-domain:admissionhands.com";
const OURS = /(^|\.)admissionhands\.com$/i;
const BASE = `http://127.0.0.1:${process.env.PORT ?? 8150}`;
const JUNK = /^(yes|no|ok|hi|hello|fees\??|stipend\??|round \d\??)$/i;

interface GscRow {
  query: string;
  page: string;
  impressions: number;
  position: number;
}

async function gscOpportunities(): Promise<GscRow[]> {
  const token = await googleToken(["https://www.googleapis.com/auth/webmasters.readonly"]);
  if (!token) throw new Error("No Google service account is configured.");
  const day = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
  const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ startDate: day(30), endDate: day(3), dimensions: ["query", "page"], type: "web", rowLimit: 25_000 }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  const j = (await r.json()) as { rows?: { keys: string[]; impressions: number; position: number }[]; error?: { message?: string } };
  if (!r.ok) throw new Error(`Search Console: ${j.error?.message ?? r.status}`);
  // One row per query: the page it is shown for most.
  const best = new Map<string, GscRow>();
  for (const x of j.rows ?? []) {
    const [query, page] = x.keys;
    const had = best.get(query);
    if (!had || x.impressions > had.impressions) best.set(query, { query, page: page.replace(/^https:\/\/www\.admissionhands\.com/, "") || "/", impressions: x.impressions, position: x.position });
  }
  return [...best.values()].filter(
    (r) => r.position >= 3 && r.position <= 20 && r.impressions >= 20 && r.query.split(/\s+/).length >= 3 && !JUNK.test(r.query.trim()) && !/admission ?hands/i.test(r.query),
  );
}

/** The figures an answer states: rupee amounts, lakh/crore sums, years of bond, counts of seats or colleges, percentages. */
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
  ];
  for (const p of pats) for (const m of text.matchAll(p)) out.add(m[0].replace(/\s+/g, " ").trim());
  return [...out].slice(0, 25);
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

async function pageText(path: string): Promise<string | null> {
  try {
    const r = await fetch(BASE + path, { headers: { "user-agent": "AdmissionHands-serp-research" }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!r.ok) return null;
    return (await r.text())
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase();
  } catch {
    return null;
  }
}

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

export async function runResearch(limit = PER_RUN): Promise<{ researched: number; ours: number; skipped?: string }> {
  const recent = new Set(
    ((await db.execute(sql`SELECT DISTINCT lower(query) AS q FROM serp_research WHERE run_on > current_date - 21`)) as unknown as { q: string }[]).map((r) => r.q),
  );
  const due = (await gscOpportunities())
    .filter((r) => !recent.has(r.query.toLowerCase()))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, limit);
  const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  let researched = 0;
  let ours = 0;
  for (const row of due) {
    const found = await webSearchAnswer(row.query, 10);
    if (!found) return { researched, ours, skipped: "web search budget used up for the month" };
    const results = found.results.map((x, i) => ({ rank: i + 1, url: x.url, domain: host(x.url), title: x.title, snippet: x.content.slice(0, 300) }));
    const mine = results.find((x) => OURS.test(x.domain));
    if (mine) ours++;
    const competitors = [...new Set(results.filter((x) => !OURS.test(x.domain)).map((x) => x.domain))].slice(0, 8);
    // Figures the answer states that our page for the query does not print.
    const text = await pageText(row.page);
    const missing = text
      ? factsOf(found.answer).filter((f) => {
          const n = needle(f);
          if (!n || n.length < 2) return false;
          const digitsOnly = text.replace(/[,\s]/g, "");
          return /year/.test(n) ? !text.includes(n) : !digitsOnly.includes(n);
        })
      : [];
    await db.execute(sql`
      INSERT INTO serp_research (run_on, query, page, impressions, position, answer, results, our_rank, missing, competitors)
      VALUES (${today}, ${row.query}, ${row.page}, ${row.impressions}, ${row.position}, ${found.answer},
              ${JSON.stringify(results)}::jsonb, ${mine?.rank ?? null}, ${JSON.stringify(missing)}::jsonb,
              ${`{${competitors.map((c) => `"${c.replace(/"/g, "")}"`).join(",")}}`}::text[])
      ON CONFLICT (run_on, query) DO NOTHING`);
    researched++;
  }
  return { researched, ours };
}

export interface ResearchRow {
  run_on: string;
  query: string;
  page: string | null;
  impressions: number | null;
  position: number | null;
  answer: string | null;
  our_rank: number | null;
  missing: string[];
  competitors: string[];
  results: { rank: number; url: string; domain: string; title: string }[];
}

export async function researchReport(days = 30): Promise<{ rows: ResearchRow[]; domains: { domain: string; n: number }[] }> {
  const rows = (await db.execute(sql`
    SELECT DISTINCT ON (lower(query)) run_on::text, query, page, impressions, position, answer, our_rank, missing, competitors, results
      FROM serp_research WHERE run_on > current_date - ${days}::int
     ORDER BY lower(query), run_on DESC`)) as unknown as (ResearchRow & { missing: unknown; results: unknown })[];
  const parse = <T,>(v: unknown, d: T): T => (typeof v === "string" ? (JSON.parse(v) as T) : ((v as T) ?? d));
  const clean = rows
    .map((r) => ({ ...r, missing: parse<string[]>(r.missing, []), results: parse<ResearchRow["results"]>(r.results, []) }))
    .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0));
  const count = new Map<string, number>();
  for (const r of clean) for (const d of r.competitors ?? []) count.set(d, (count.get(d) ?? 0) + 1);
  return { rows: clean, domains: [...count].map(([domain, n]) => ({ domain, n })).sort((a, b) => b.n - a.n).slice(0, 15) };
}

/** The Monday line for the owner's Telegram. */
export async function weeklySummary(): Promise<string> {
  const { rows, domains } = await researchReport(7);
  if (!rows.length) return "";
  const inTop = rows.filter((r) => r.our_rank != null).length;
  const gaps = rows.filter((r) => r.missing.length).slice(0, 5);
  return [
    `Search research, last 7 days: ${rows.length} searches studied; admissionhands.com among the top 10 results in ${inTop}.`,
    `Who shows up most: ${domains.slice(0, 5).map((d) => `${d.domain} (${d.n})`).join(", ")}.`,
    gaps.length ? `Figures the web answers that our page does not print:` : "",
    ...gaps.map((g) => `• "${g.query}" → ${g.page}: ${g.missing.slice(0, 4).join(", ")}`),
    `Full report: Admin → Search research.`,
  ]
    .filter(Boolean)
    .join("\n");
}
