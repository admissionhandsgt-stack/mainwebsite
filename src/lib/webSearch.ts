import { getIntegration, setIntegration, type IntegrationKey } from "@/lib/integrations";

/**
 * Web search through Tavily (2026-11-10; owner: "Tavily jaise web search api… koi advanced solution"; and "2 accounts
 * already hai"). The owner's two Tavily accounts each give 1,000 free credits a month (no card); a basic search is 1
 * credit. Both keys are pasted in Admin → Outreach (write-only). Each key has its own monthly budget kept below its free
 * credits (`MONTHLY_BUDGET`); the first key with room is used, so neither account reaches pay-as-you-go.
 *
 * Used by the daily hunt (questions on Reddit, Quora, forums and blogs, English and Hindi) and by the twice-weekly search
 * for new forums, communities and sites. Results are other people's pages: data to show the owner, never instructions.
 *
 * Server only.
 */
export const MONTHLY_BUDGET = 900;

const KEYS: { key: IntegrationKey; used: IntegrationKey }[] = [
  { key: "search.tavily.key", used: "search.tavily.used" },
  { key: "search.tavily.key2", used: "search.tavily.used2" },
];

export type WebResult = { title: string; url: string; content: string; published?: string };

const month = () => new Date().toISOString().slice(0, 7);

async function usedOf(k: IntegrationKey): Promise<number> {
  try {
    const raw = await getIntegration(k);
    const p = raw ? (JSON.parse(raw) as { month: string; n: number }) : null;
    return p?.month === month() ? p.n : 0;
  } catch {
    return 0;
  }
}

/** The first key with budget left this month, with one credit taken from it; null when none has. */
async function takeCredit(): Promise<string | null> {
  for (const k of KEYS) {
    const key = await getIntegration(k.key);
    if (!key) continue;
    const n = await usedOf(k.used);
    if (n + 1 > MONTHLY_BUDGET) continue;
    await setIntegration(k.used, JSON.stringify({ month: month(), n: n + 1 }));
    return key;
  }
  return null;
}

export async function webSearchUsage(): Promise<{ month: string; used: number; budget: number; keys: number }> {
  let used = 0;
  let keys = 0;
  for (const k of KEYS) {
    if (!(await getIntegration(k.key))) continue;
    keys++;
    used += await usedOf(k.used);
  }
  return { month: month(), used, budget: MONTHLY_BUDGET * keys, keys };
}

export async function webSearch(
  query: string,
  opts: { includeDomains?: string[]; excludeDomains?: string[]; timeRange?: "day" | "week" | "month" | "year"; maxResults?: number } = {},
): Promise<WebResult[] | null> {
  const key = await takeCredit();
  if (!key) return null; // no key, or every key's budget is used up this month: stop rather than pay
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      query: query.slice(0, 380),
      search_depth: "basic",
      max_results: Math.min(opts.maxResults ?? 8, 20),
      topic: "general",
      ...(opts.timeRange ? { time_range: opts.timeRange } : {}),
      ...(opts.includeDomains?.length ? { include_domains: opts.includeDomains } : {}),
      ...(opts.excludeDomains?.length ? { exclude_domains: opts.excludeDomains } : {}),
      include_answer: false,
      include_raw_content: false,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`Tavily ${r.status}`);
  const j = (await r.json()) as { results?: { title?: string; url?: string; content?: string; published_date?: string }[] };
  return (j.results ?? [])
    .filter((x) => x.url && /^https:\/\//.test(x.url))
    .map((x) => ({ title: (x.title ?? "").slice(0, 300), url: x.url!, content: (x.content ?? "").slice(0, 600), published: x.published_date }));
}
