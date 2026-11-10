import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { gscRows } from "@/lib/searchLinks";
import { tellOwner } from "@/lib/telegramBot";
import { getIntegration } from "@/lib/integrations";

/**
 * Daily hunt (2026-11-10). Owner: "daily hunt karke de do details… admin open karke same url par jake… answer create
 * karke doge wo manually post kardunga". Reddit refuses automated reading from servers (403/429, and its Data API needs
 * approval for commercial use), so the questions come from where we may read them: Search Console. Every day
 * (`POST /api/cron/hunt`, 06:05 UTC) the most-searched questions of the last 7 days that land on our pages become items
 * in Admin → Outreach → Daily hunt: the question, our page that answers it, an answer written from that page's own first
 * line (its live figures — never typed), and search links to find the same question on Quora, Reddit and Google. The
 * owner opens one, posts by hand from his own account, and records where. The site posts nothing anywhere.
 *
 * Server only.
 */
const SITE = "https://www.admissionhands.com";
const PER_DAY = 10;
const QUESTION = /^(what|which|how|is|are|can|does|do|should|when|why|where|who|kya|kaise|kitna|kitni|kitne|kaun|konsa|kab)\b|\?$|\b(vs|or|best|list|kitna|kya)\b/i;
const INTENT = /\b(stipend|salary|fee|fees|cut ?off|cutoff|rank|marks|score|seats?|bond|penalty|counsell?ing|round|choice|upgrad|quota|admission|eligib|colleges? (in|list))\b/i;
const BAD = /site:|["@]|https?:|\b(login|result pdf|near me|phone|contact|address)\b/i;

export type HuntItem = {
  id: number;
  query: string;
  impressions: number;
  page: string;
  answer: string;
  status: string;
  posted_url: string | null;
  created_at: string;
};

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x2F;/g, "/");

/** The page's own answer: the hero's first line when it is a quick answer, else its meta description. */
async function pageAnswer(path: string, base: string): Promise<string | null> {
  try {
    const r = await fetch(base + path, { headers: { "user-agent": "AdmissionHands-hunt" }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!r.ok) return null;
    const html = await r.text();
    const hero = html.match(/<p class="mt-4 max-w-\[62ch\][^"]*">([^<]{60,600})<\/p>/)?.[1];
    const desc = html.match(/<meta name="description" content="([^"]{40,400})"/)?.[1];
    const text = hero && /\d/.test(hero) ? hero : desc ?? hero;
    return text ? decode(text).trim() : null;
  } catch {
    return null;
  }
}

function compose(query: string, fact: string, path: string): string {
  const url = `${SITE}${path}`;
  return [
    fact,
    "",
    `The full table, from the counselling authorities' published data (free, no sign-up): ${url}`,
    "",
    "(I'm a counsellor at AdmissionHands; happy to answer follow-up questions here.)",
    "",
    "— Hinglish —",
    `Short mein: ${fact}`,
    `Poori list yahan hai (free): ${url}`,
  ].join("\n");
}

export async function buildHunt(base = `http://127.0.0.1:${process.env.PORT ?? 8150}`): Promise<{ added: number; considered: number }> {
  const rows = await gscRows(7);
  const byQuery = new Map<string, { imp: number; pages: Map<string, number> }>();
  for (const r of rows) {
    const q = r.query.trim().toLowerCase();
    if (q.length < 12 || q.length > 90 || BAD.test(q) || !(QUESTION.test(q) || INTENT.test(q))) continue;
    const path = r.page.replace(SITE, "").replace(/\/$/, "") || "/";
    if (path.includes("?") || path.includes("#")) continue;
    const e = byQuery.get(q) ?? { imp: 0, pages: new Map() };
    e.imp += r.impressions;
    e.pages.set(path, (e.pages.get(path) ?? 0) + r.impressions);
    byQuery.set(q, e);
  }
  const seen = new Set(
    ((await db.execute(sql`SELECT lower(query) AS q FROM hunt_items`)) as unknown as { q: string }[]).map((x) => x.q),
  );
  // Questions first, then the most searched; one item per answering page a day, so the list is not ten stipend pages.
  const ranked = [...byQuery.entries()]
    .filter(([q]) => !seen.has(q))
    .sort((a, b) => Number(QUESTION.test(b[0])) - Number(QUESTION.test(a[0])) || b[1].imp - a[1].imp);
  const usedPages = new Set<string>();
  let added = 0;
  for (const [query, e] of ranked) {
    if (added >= PER_DAY) break;
    const page = [...e.pages.entries()].sort((a, b) => b[1] - a[1])[0][0];
    if (usedPages.has(page)) continue;
    const fact = await pageAnswer(page, base);
    if (!fact) continue;
    usedPages.add(page);
    await db.execute(sql`
      INSERT INTO hunt_items (query, impressions, page, answer) VALUES (${query}, ${e.imp}, ${page}, ${compose(query, fact, page)})
      ON CONFLICT ((lower(query))) DO NOTHING`);
    added++;
  }
  if (added && (await getIntegration("telegram.bot.chat_id"))) {
    await tellOwner(`🔎 Daily hunt: ${added} questions people searched this week, each with an answer ready to post.\nOpen: https://admin.admissionhands.com/outreach#hunt`).catch(() => undefined);
  }
  return { added, considered: byQuery.size };
}

export async function listHunt(): Promise<HuntItem[]> {
  return (await db.execute(sql`
    SELECT id, query, impressions, page, answer, status, posted_url, to_json(created_at)#>>'{}' AS created_at
      FROM hunt_items ORDER BY (status = 'new') DESC, created_at DESC LIMIT 200`)) as unknown as HuntItem[];
}

export async function markHunt(id: number, status: "posted" | "dismissed", postedUrl?: string) {
  const url = postedUrl && /^https:\/\/[^\s]+$/.test(postedUrl) ? postedUrl.slice(0, 500) : null;
  await db.execute(sql`UPDATE hunt_items SET status = ${status}, posted_url = coalesce(${url}, posted_url), updated_at = now() WHERE id = ${id}`);
}
