/**
 * An answer from an official page, for a search our own data cannot answer (2026-11-11, owner: "jinka result nhi hai
 * hamare DB mai unka MCC ya authorised bodies ke website se scrap ya search karke dhundke verify karke laga sakte hai…
 * Gemini key").
 *
 *  1. Find: one Tavily search limited to official sites — *.gov.in, *.nic.in, MCC, NMC, NBEMS, NTA and every state board
 *     the alert feed reads (the same rule as zynNotices `officialLink`) — with each page's own text.
 *  2. Copy: Gemini (lib/gemini.ts, Flash, temperature 0) answers from that text alone, says which page it used and the
 *     date it prints, or says it cannot; told never to give one college's closing rank or promise a seat.
 *  3. Verify, in code, before anything is shown: the page used is official; every figure in the answer (2+ digits,
 *     amounts, years, dates) appears in that page's text; no college's closing rank, no promise, no fee guessed.
 * Anything that fails is dropped, not shown. Server only.
 */
import { webSearch, type WebResult } from "@/lib/webSearch";
import { geminiJson, geminiReady } from "@/lib/gemini";
import { officialLink } from "@/lib/zynNotices";
import { ALERT_SOURCES } from "@/lib/alertFeed";

export interface OfficialAnswer {
  lead: string;
  points: string[];
  sourceUrl: string;
  sourceTitle: string;
  asOf: string | null;
}

const host = (u: string) => {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};
const DOMAINS = [
  "gov.in",
  "nic.in",
  "mcc.nic.in",
  "nmc.org.in",
  "natboard.edu.in",
  "nbe.edu.in",
  "nta.ac.in",
  ...ALERT_SOURCES.map((s) => host(s.url)).filter(Boolean),
];

/** "₹1,67,300", "2026", "50%", "18.11.2026": the digits of every figure, commas and spaces dropped. */
const figures = (s: string) => [...s.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0].replace(/,/g, "")).filter((x) => x.replace(/\D/g, "").length >= 2);
const flat = (s: string) => s.replace(/[,\s]/g, "");
/** One college's closing rank, a promise, or a sales line — never on our pages. */
const FORBIDDEN = /\b(guarantee|assured|100%\s*(seat|admission)|direct admission|donation)\b/i;
const COLLEGE_RANK = /\b(closing|last|cut ?off)\s*(rank|air)\b[^.]{0,80}\b(college|institute|hospital|university)\b|\b(college|institute|hospital|university)\b[^.]{0,80}\b(closing|last|cut ?off)\s*(rank|air)\b/i;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    answerable: { type: "BOOLEAN" },
    lead: { type: "STRING" },
    points: { type: "ARRAY", items: { type: "STRING" } },
    source_index: { type: "INTEGER" },
    as_of: { type: "STRING" },
  },
  required: ["answerable", "lead", "points", "source_index", "as_of"],
};

function prompt(question: string, docs: WebResult[]): string {
  const blocks = docs.map((d, i) => `[${i + 1}] ${d.title}\nURL: ${d.url}\n---\n${(d.raw ?? d.content).slice(0, 12_000)}\n---`).join("\n\n");
  return [
    "You answer a search from an Indian NEET PG / NEET UG student, using ONLY the official documents below (government,",
    "regulator or counselling-authority pages). Rules:",
    "- If the documents do not answer exactly what the search asks (same exam, same year or the latest one, same state,",
    "  branch or college it names), set answerable=false and leave the rest empty.",
    "- lead: 1–2 plain sentences that answer the search directly, in English. Copy every figure, date and name exactly as",
    "  the document prints it. No figure that is not in the document.",
    "- points: up to 4 short facts from the same document that a student needs next (dates, steps, rules, amounts).",
    "- Never state any single college's closing rank or cut off, never promise a seat or admission, never advise.",
    "- source_index: the number of the one document you used. as_of: the date or session the document itself prints",
    "  (e.g. '7 Nov 2026', '2026-27'), or '' if it prints none.",
    "",
    `Search: "${question}"`,
    "",
    blocks,
  ].join("\n");
}

export async function officialAnswer(question: string): Promise<OfficialAnswer | null> {
  if (!(await geminiReady())) return null;
  const found = await webSearch(question, { includeDomains: DOMAINS, maxResults: 5, raw: true }).catch(() => null);
  const docs = (found ?? []).filter((r) => officialLink(r.url) && (r.raw ?? r.content).length > 200).slice(0, 3);
  if (!docs.length) return null;
  const out = await geminiJson<{ answerable: boolean; lead: string; points: string[]; source_index: number; as_of: string }>(prompt(question, docs), SCHEMA);
  if (!out?.answerable || !out.lead?.trim()) return null;
  const doc = docs[(out.source_index ?? 0) - 1];
  if (!doc || !officialLink(doc.url)) return null;
  const lead = out.lead.trim().slice(0, 500);
  const points = (out.points ?? []).map((p) => p.trim()).filter(Boolean).slice(0, 4).map((p) => p.slice(0, 300));
  const all = [lead, ...points].join(" ");
  // Every figure must be in the page's own text, as printed.
  const text = flat(doc.raw ?? doc.content);
  if (figures(all).some((f) => !text.includes(f))) return null;
  if (FORBIDDEN.test(all) || COLLEGE_RANK.test(all)) return null;
  return { lead, points, sourceUrl: doc.url, sourceTitle: doc.title.trim() || host(doc.url), asOf: out.as_of?.trim() || null };
}
