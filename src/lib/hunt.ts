import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { gscRows } from "@/lib/searchLinks";
import { tellOwner } from "@/lib/telegramBot";
import { getIntegration } from "@/lib/integrations";
import { webSearch, webSearchUsage } from "@/lib/webSearch";
import { answerFor, type Answer } from "@/lib/huntAnswers";
import { pgFocus, ugOnly } from "@/lib/researchFocus";
import { geminiJson } from "@/lib/gemini";

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
  source: string;
  thread_url: string | null;
  impressions: number;
  page: string;
  answer: string;
  status: string;
  posted_url: string | null;
  kind: string | null;
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

export async function buildHunt(
  base = `http://127.0.0.1:${process.env.PORT ?? 8150}`,
): Promise<{ added: number; considered: number; web: { added: number; searched: number; skipped?: string } }> {
  const rows = await gscRows(7);
  const focus = await pgFocus();
  const byQuery = new Map<string, { imp: number; pages: Map<string, number> }>();
  for (const r of rows) {
    const q = r.query.trim().toLowerCase();
    if (q.length < 12 || q.length > 90 || BAD.test(q) || !(QUESTION.test(q) || INTENT.test(q))) continue;
    // NEET PG only while that is the season (lib/researchFocus.ts).
    if (focus && ugOnly(q)) continue;
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
    const landing = [...e.pages.entries()].sort((a, b) => b[1] - a[1])[0][0];
    // An answer written for this question (lib/huntAnswers.ts): the owner's saved answer, else one built from the data
    // the question asks about, else the landing page's own first line.
    const a = await answerFor(query, { fallback: landing, pageLine: (p) => pageAnswer(p, base) }).catch(() => null);
    if (!a || usedPages.has(a.page)) continue;
    usedPages.add(a.page);
    await db.execute(sql`
      INSERT INTO hunt_items (query, impressions, page, answer, kind) VALUES (${query}, ${e.imp}, ${a.page}, ${a.answer}, ${a.kind})
      ON CONFLICT ((lower(query))) DO NOTHING`);
    added++;
  }
  const web = await buildWebHunt(base).catch((e) => ({ added: 0, searched: 0, skipped: e instanceof Error ? e.message : "web search failed" }));
  if ((added || web.added) && (await getIntegration("telegram.bot.chat_id"))) {
    await tellOwner(
      `🔎 Daily hunt: ${web.added} threads on Reddit / Quora / forums and ${added} searched questions, each with an answer ready to post.\nOpen: https://admin.admissionhands.com/outreach#hunt`,
    ).catch(() => undefined);
  }
  return { added, considered: byQuery.size, web };
}

/**
 * A question the owner types (Admin → Daily hunt, or "/answer …" to the Telegram bot): the answer, written the same way,
 * saved as a hunt item so it can be copied, posted and recorded like the rest.
 */
export async function askHunt(question: string, base = `http://127.0.0.1:${process.env.PORT ?? 8150}`): Promise<HuntItem | null> {
  const q = question.trim().slice(0, 300);
  if (q.length < 6) throw new Error("Type the question.");
  const fallback = TOPICS.find((t) => t.re.test(q))?.path ?? "/neet-pg-cutoff";
  const a = await answerFor(q, { fallback, pageLine: (p) => pageAnswer(p, base) });
  if (!a) return null;
  const rows = (await db.execute(sql`
    INSERT INTO hunt_items (query, impressions, page, answer, source, kind) VALUES (${q}, 0, ${a.page}, ${a.answer}, 'manual', ${a.kind})
    ON CONFLICT ((lower(query))) DO UPDATE SET answer = EXCLUDED.answer, page = EXCLUDED.page, kind = EXCLUDED.kind, status = 'new', updated_at = now()
    RETURNING id, query, source, thread_url, impressions, page, answer, status, posted_url, kind, to_json(created_at)#>>'{}' AS created_at`)) as unknown as HuntItem[];
  return rows[0] ?? null;
}

/** Writes an item's answer again (after a saved answer was added, or the figures changed). */
export async function rebuildHunt(id: number, base = `http://127.0.0.1:${process.env.PORT ?? 8150}`): Promise<boolean> {
  const it = ((await db.execute(sql`SELECT query, thread_title, page FROM hunt_items WHERE id = ${id}`)) as unknown as { query: string; thread_title: string | null; page: string }[])[0];
  if (!it) return false;
  const a = await answerFor(it.thread_title || it.query, { fallback: it.page, pageLine: (p) => pageAnswer(p, base) });
  if (!a) return false;
  await db.execute(sql`UPDATE hunt_items SET answer = ${a.answer}, page = ${a.page}, kind = ${a.kind}, updated_at = now() WHERE id = ${id}`);
  return true;
}

export async function listHunt(): Promise<HuntItem[]> {
  return (await db.execute(sql`
    SELECT id, query, source, thread_url, impressions, page, answer, status, posted_url, kind, to_json(created_at)#>>'{}' AS created_at
      FROM hunt_items ORDER BY (status = 'new') DESC, created_at DESC LIMIT 200`)) as unknown as HuntItem[];
}

export async function markHunt(id: number, status: "posted" | "dismissed", postedUrl?: string) {
  const url = postedUrl && /^https:\/\/[^\s]+$/.test(postedUrl) ? postedUrl.slice(0, 500) : null;
  await db.execute(sql`UPDATE hunt_items SET status = ${status}, posted_url = coalesce(${url}, posted_url), updated_at = now() WHERE id = ${id}`);
}

/* ------------------------------------------------- threads found on the web ---- */

/** Big education portals (competitors) and our own site never come back as places to answer. */
const NOT_FORUMS = ["admissionhands.com", "careers360.com", "shiksha.com", "collegedunia.com", "collegedekho.com", "getmyuni.com", "aglasem.com", "youtube.com", "facebook.com", "instagram.com", "x.com", "twitter.com", "linkedin.com"];
/** Which of our pages answers a thread, from its title and text. First match wins; order matters. */
const TOPICS: { re: RegExp; path: string }[] = [
  { re: /stipend|salary/i, path: "/md-ms-india/stipend" },
  { re: /\bbond\b|penalt|seat leaving|leav(e|ing) (the |my )?seat/i, path: "/md-ms-india/bond" },
  { re: /upgrad|freeze|float|choice fill|lock(ing)? (my )?choices|choice (list|order)/i, path: "/neet-pg-choice-filling" },
  { re: /marks? (vs|and|to|se) rank|score.{0,20}rank|rank.{0,20}score|kitne marks/i, path: "/neet-pg-marks-vs-rank" },
  { re: /\bnri\b/i, path: "/nri-quota" },
  { re: /deemed/i, path: "/md-ms-india/deemed-universities" },
  { re: /(mbbs|neet ug|bds).{0,40}(cut ?off|closing rank)|(cut ?off|closing rank).{0,40}(mbbs|neet ug|bds)/i, path: "/neet-ug-cutoff" },
  { re: /cut ?off|closing rank|which (college|branch)|kaunsa college|kaun sa college|college milega|branch milega/i, path: "/neet-pg-cutoff" },
  { re: /(pg|md|ms|mbbs).{0,30}fee|fee.{0,30}(pg|md|ms|mbbs)/i, path: "/md-ms-india/fees" },
];
/** Rotated across days, about twelve searches a day (~360 of Tavily's 1,000 free credits a month). */
const WEB_QUERIES: { q: string; forums?: boolean; range: "week" | "month" }[] = [
  { q: "NEET PG stipend", forums: true, range: "week" },
  { q: "NEET PG round 2 upgrade freeze float", forums: true, range: "week" },
  { q: "NEET PG choice filling order advice", forums: true, range: "week" },
  { q: "NEET PG rank which college branch", forums: true, range: "week" },
  { q: "NEET PG bond penalty seat leaving", forums: true, range: "week" },
  { q: "NEET PG marks vs rank", forums: true, range: "week" },
  { q: "MBBS counselling state quota cut off", forums: true, range: "week" },
  { q: "deemed university PG fees worth it", forums: true, range: "month" },
  { q: "NRI quota MBBS PG", forums: true, range: "month" },
  { q: "MD radiology seat rank", forums: true, range: "month" },
  { q: "NEET PG counselling doubt forum", range: "month" },
  { q: "NEET PG counselling guidance blog", range: "month" },
  { q: "नीट पीजी काउंसलिंग सवाल", range: "month" },
  { q: "NEET PG stipend kitna milta hai", range: "month" },
  { q: "MBBS government college fees kitni hai", range: "month" },
  { q: "NEET PG rank se kaunsa college milega", range: "month" },
  { q: "medical students forum India PG admission", range: "month" },
  { q: "resident doctors association stipend demand", range: "month" },
  { q: "NEET UG counselling help forum", range: "month" },
  { q: "PG medical admission advice India blog", range: "month" },
  { q: "NEET PG cut off branch wise discussion", forums: true, range: "month" },
  { q: "state quota vs all india quota PG", forums: true, range: "month" },
  { q: "private medical college PG fees", forums: true, range: "month" },
  { q: "MBBS admission doubts parents", range: "month" },
];
/** The NEET PG round in progress (round 2's result is due 16 Nov 2026), added while the focus is PG. */
const PG_SEASON_QUERIES: { q: string; forums?: boolean; range: "week" | "month" }[] = [
  { q: "NEET PG round 2 result upgrade", forums: true, range: "week" },
  { q: "NEET PG round 2 should I resign seat", forums: true, range: "week" },
  { q: "NEET PG state counselling round 2", forums: true, range: "week" },
  { q: "DNB vs MD which is better NEET PG", forums: true, range: "month" },
  { q: "NEET PG stray vacancy round strategy", forums: true, range: "month" },
  { q: "NEET PG deemed university fees round 2", forums: true, range: "week" },
];
const PER_DAY_WEB = 12;
const looksLikeAQuestion = (t: string) => /\?|\b(how|what|which|should|can|is|any|help|advice|doubt|kya|kaise|kitna|kaunsa)\b/i.test(t);

export async function buildWebHunt(base = `http://127.0.0.1:${process.env.PORT ?? 8150}`): Promise<{ added: number; searched: number; skipped?: string }> {
  const day = Math.floor(Date.now() / 86_400_000);
  // Two Tavily accounts (owner's): twice the searches a day — about 720 of the 1,800 budgeted credits a month.
  const perDay = (await webSearchUsage()).keys >= 2 ? PER_DAY_WEB * 2 : PER_DAY_WEB;
  // Forums and communities found by findNewSites(): a quarter of the day's searches look inside them (owner, 2026-11-10:
  // "new new doctors forums etc bhi hunt ho, platforms hunt ho").
  const forums = ((await db.execute(sql`SELECT url FROM outreach_sources WHERE is_forum ORDER BY created_at DESC LIMIT 20`)) as unknown as { url: string }[])
    .map((f) => f.url.replace(/^https:\/\//, "").replace(/^www\./, ""));
  const inside = forums.length ? Math.ceil(perDay / 4) : 0;
  // NEET PG only while that is the season (lib/researchFocus.ts): the MBBS / NEET UG searches rest.
  const pool = (await pgFocus()) ? [...WEB_QUERIES.filter((x) => !ugOnly(x.q)), ...PG_SEASON_QUERIES] : WEB_QUERIES;
  const todays: { q: string; forums?: boolean; range: "week" | "month"; inside?: string[] }[] = [
    ...Array.from({ length: perDay - inside }, (_, i) => pool[(day * perDay + i) % pool.length]),
    ...Array.from({ length: inside }, (_, i) => ({ ...pool[(day * inside + i + 7) % pool.length], forums: false, range: "month" as const, inside: forums })),
  ];
  const lines = new Map<string, string | null>();
  const pageLine = async (p: string) => {
    if (!lines.has(p)) lines.set(p, await pageAnswer(p, base));
    return lines.get(p) ?? null;
  };
  let searched = 0;
  let added = 0;
  for (const wq of todays) {
    const results = await webSearch(wq.q, {
      includeDomains: wq.inside ?? (wq.forums ? ["reddit.com", "quora.com"] : undefined),
      excludeDomains: wq.forums || wq.inside ? undefined : NOT_FORUMS,
      timeRange: wq.range,
      maxResults: 8,
    });
    if (results === null) return { added, searched, skipped: searched ? "monthly search budget reached" : "no Tavily key" };
    searched++;
    for (const r of results) {
      if (added >= perDay) break;
      const host = new URL(r.url).hostname.replace(/^www\./, "");
      if (NOT_FORUMS.some((d) => host === d || host.endsWith(`.${d}`)) || /\.(gov|nic)\.in$/.test(host)) continue;
      const text = `${r.title} ${r.content}`;
      if (!/reddit\.com|quora\.com/.test(host) && !wq.inside && !looksLikeAQuestion(r.title)) continue;
      const fallback = TOPICS.find((t) => t.re.test(text))?.path ?? null;
      // Written for this thread: its title is the question, its text says more (a state, a score, a round).
      const a: Answer | null = await answerFor(r.title || wq.q, { text: r.content, fallback, pageLine }).catch(() => null);
      if (!a) continue;
      const ins = (await db.execute(sql`
        INSERT INTO hunt_items (query, impressions, page, answer, source, thread_url, thread_title, kind)
        VALUES (${r.title.slice(0, 200) || r.url}, 0, ${a.page}, ${a.answer}, 'web', ${r.url}, ${r.title.slice(0, 300)}, ${a.kind})
        ON CONFLICT DO NOTHING RETURNING id`)) as unknown as { id: number }[];
      if (ins.length) added++;
    }
  }
  return { added, searched };
}

/**
 * Twice a week: new forums, doctors' communities, Q&A platforms, blogs and associations found on the web. Each becomes a
 * site whose contact page is read for an address; a forum or community is also flagged `is_forum`, so the daily hunt
 * searches inside it. Four searches a run, rotating through the list.
 */
/**
 * Where to look for people who write about NEET PG / medical admission (2026-11-13, owner: "daily 3 times… extensive
 * search… AI use karo… emails nikale, blogs dekhe, sabcheej dekhe"): education and health reporters, bloggers, doctors'
 * and students' associations, forums — English and Hindi. Six searches a run, three runs a day, rotating through the list.
 * `range` is how fresh the results must be: news and blogs this month, organisations this year.
 */
const SITE_QUERIES: { q: string; range: "week" | "month" | "year" }[] = [
  // Reporters and news desks
  { q: "NEET PG 2026 counselling news India", range: "month" },
  { q: "NEET PG 2026 cut off round result news", range: "month" },
  { q: "resident doctors stipend news India 2026", range: "month" },
  { q: "medical education news India NMC 2026 PG seats", range: "month" },
  { q: "MBBS seats new medical colleges 2026 news", range: "month" },
  { q: "NEET PG fees private medical colleges news", range: "month" },
  { q: "medical PG bond policy state news India", range: "month" },
  { q: "health reporter India medical education", range: "year" },
  { q: "education news portal India NEET counselling", range: "month" },
  // Blogs
  { q: "NEET PG 2026 blog choice filling strategy", range: "month" },
  { q: "NEET PG counselling experience blog doctor", range: "year" },
  { q: "MD MS seat matrix 2026 blog", range: "month" },
  { q: "NEET PG branch selection blog clinical non clinical", range: "year" },
  { q: "medical student blog India PG residency life", range: "year" },
  { q: "doctor blogger India PG stipend bond", range: "year" },
  { q: "NEET PG stray vacancy round blog", range: "year" },
  { q: "deemed university PG fees blog India", range: "year" },
  { q: "NEET PG low rank options blog", range: "year" },
  // Associations and communities
  { q: "resident doctors association India contact", range: "year" },
  { q: "junior doctors association state India", range: "year" },
  { q: "medical students association India", range: "year" },
  { q: "Indian Medical Association junior doctors network", range: "year" },
  { q: "federation resident doctors association press release", range: "year" },
  { q: "doctors forum India discussion", range: "year" },
  { q: "NEET PG aspirants community forum", range: "year" },
  { q: "MBBS students forum India discussion board", range: "year" },
  // Hindi
  { q: "नीट पीजी काउंसलिंग 2026 समाचार", range: "month" },
  { q: "पीजी डॉक्टर स्टाइपेंड खबर", range: "month" },
  { q: "मेडिकल कॉलेज सीटें 2026 खबर", range: "month" },
  { q: "नीट पीजी कटऑफ 2026", range: "month" },
];
const PER_RUN = 6;
const FORUM_WORDS = /forum|community|discuss|discussion|board|q&a|qna|answers|ask|threads?|groups?|club/i;

/**
 * Only an Indian site about medical admission is somewhere to write to. The first unfiltered run (2026-11-12) added
 * microsoft.com, heart.org, the American College of Physicians, jamanetwork, a US and an Australian university — and
 * drafts to their help desks. An Indian address (.in) or a page that talks about NEET / MBBS / AIIMS / NMC / resident
 * doctors counts; a foreign academic or national domain never does.
 */
function indianMedical(host: string, text: string): boolean {
  if (/\.(edu|ac\.uk|edu\.au|gov\.uk|us|uk|au|ca|nz|eu|de|fr)$/.test(host)) return false;
  // App stores and study-abroad / course directories carry the words but are nobody to write to (second run).
  if (/^(apps\.apple\.com|play\.google\.com)$|findamasters|findaphd|topuniversities|mooclab/.test(host)) return false;
  if (/\.in$/.test(host)) return /\b(neet|mbbs|medical|doctors?|md|ms|pg|aiims|nmc|health|medicine|counsell?ing|admission)\b/i.test(text);
  return /\b(neet|mbbs|aiims|nmc|mcc|resident doctors?|medical colleges? in india|indian medical)\b/i.test(text);
}

type Found = { host: string; url: string; title: string; snippet: string };
type Judged = { host: string; relevant: boolean; kind: "journalist" | "blogger" | "association" | "forum" | "other"; topic: "trend" | "seats" | "colleges" | "fees" | "stipend" | "general"; org: string };

const JUDGE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      host: { type: "STRING" },
      relevant: { type: "BOOLEAN" },
      kind: { type: "STRING", enum: ["journalist", "blogger", "association", "forum", "other"] },
      topic: { type: "STRING", enum: ["trend", "seats", "colleges", "fees", "stipend", "general"] },
      org: { type: "STRING" },
    },
    required: ["host", "relevant", "kind", "topic", "org"],
  },
};

/**
 * AI's read of each found site (Gemini, one call for the run): is it an Indian outlet, blog, association or forum that
 * writes about medical admission, NEET, medical colleges or doctors' training — someone who might use or cite our data —
 * and what does it cover. Null when AI is unavailable; the word rules then decide alone.
 */
async function judge(found: Found[]): Promise<Map<string, Judged> | null> {
  if (!found.length) return new Map();
  const list = found.map((f, i) => `[${i + 1}] host: ${f.host}\ntitle: ${f.title.slice(0, 160)}\ntext: ${f.snippet.replace(/\s+/g, " ").slice(0, 400)}`).join("\n\n");
  const out = await geminiJson<Judged[]>(
    [
      "These are web pages found while looking for Indian websites whose readers are medical students, doctors or NEET aspirants",
      "and their families. For each host decide:",
      "- relevant: true only if the site itself is an Indian news outlet, education/health desk, blog, association, union or",
      "  community that writes about medical admission, NEET UG/PG, medical colleges, residency, stipend, or doctors' training.",
      "  False for government sites, coaching/test-prep sellers, admission agents/consultancies, hospitals, pharma, foreign",
      "  sites, app stores, generic portals with no such writing, and competitors that sell admission counselling.",
      "- kind: journalist (news outlet or desk), blogger (personal or topic blog), association (doctors'/students' body),",
      "  forum (discussion community), or other.",
      "- topic: what of ours fits it best — trend (cut off / rank trends), seats (seat increase, seat matrix), colleges (new",
      "  medical colleges), fees (PG fees), stipend (stipend, bond, resident pay), or general.",
      "- org: the site's own name, short.",
      "Answer for every host, in order. Judge only from the text given; do not guess beyond it.",
      "",
      list,
    ].join("\n"),
    JUDGE_SCHEMA,
  ).catch(() => null);
  if (!out || !Array.isArray(out)) return null;
  return new Map(out.filter((j) => j && j.host).map((j) => [j.host.replace(/^www\./, "").toLowerCase(), j]));
}

export async function findNewSites(): Promise<{ added: number; forums: number; judged?: number; rejected?: number; skipped?: string }> {
  // Three runs a day (server crontab), each taking the next six searches.
  const run = Math.floor(Date.now() / (8 * 3_600_000));
  const found = new Map<string, Found>();
  let searched = 0;
  for (let i = 0; i < PER_RUN; i++) {
    const wq = SITE_QUERIES[(run * PER_RUN + i) % SITE_QUERIES.length];
    const results = await webSearch(wq.q, { excludeDomains: [...NOT_FORUMS, "reddit.com", "quora.com", "wikipedia.org"], timeRange: wq.range, maxResults: 10, country: "india" });
    if (results === null) {
      if (!searched) return { added: 0, forums: 0, skipped: "no Tavily key or budget" };
      break;
    }
    searched++;
    for (const r of results) {
      let u: URL;
      try {
        u = new URL(r.url);
      } catch {
        continue;
      }
      const host = u.hostname.replace(/^www\./, "").toLowerCase();
      if (found.has(host)) continue;
      if (/\.(gov|nic)\.in$|\.gov$/.test(host) || NOT_FORUMS.some((d) => host === d || host.endsWith(`.${d}`))) continue;
      if (!indianMedical(host, `${r.title} ${r.content}`)) continue;
      found.set(host, { host, url: `https://${u.hostname}`, title: r.title, snippet: r.content });
    }
  }
  // Sites we already hold are not judged again.
  const known = new Set(
    ((await db.execute(sql`SELECT url FROM outreach_sources`)) as unknown as { url: string }[]).map((x) => {
      try {
        return new URL(x.url).hostname.replace(/^www\./, "").toLowerCase();
      } catch {
        return x.url;
      }
    }),
  );
  const fresh = [...found.values()].filter((f) => !known.has(f.host)).slice(0, 25);
  const ai = await judge(fresh);
  let added = 0;
  let forums = 0;
  let rejected = 0;
  for (const f of fresh) {
    if (added >= 12) break;
    const j = ai?.get(f.host) ?? null;
    if (ai && (!j || !j.relevant)) {
      rejected++;
      continue;
    }
    const isForum = j ? j.kind === "forum" : FORUM_WORDS.test(`${f.title} ${f.host}`);
    const kind = j ? (j.kind === "forum" ? "other" : j.kind) : /association|federation|union|society/i.test(f.title) ? "association" : "other";
    const org = (j?.org || f.title.split(/[|–—-]/)[0]).trim().slice(0, 120) || f.host;
    const topic = j && j.topic !== "general" ? j.topic : null;
    const ins = (await db.execute(sql`
      INSERT INTO outreach_sources (url, org, kind, is_forum, topic) VALUES (${f.url}, ${org}, ${kind}, ${isForum}, ${topic})
      ON CONFLICT DO NOTHING RETURNING id`)) as unknown as { id: number }[];
    if (ins.length) {
      added++;
      if (isForum) forums++;
    }
  }
  return { added, forums, judged: ai ? fresh.length : 0, rejected };
}

