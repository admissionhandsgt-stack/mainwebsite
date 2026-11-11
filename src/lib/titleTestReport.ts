/**
 * How the title test is doing (lib/titleTest.ts), from Search Console: for the MD/MS college pages in each half,
 * clicks, impressions, CTR and average position over the same days before the test and after it settled. The lift is
 * the figures half's change in CTR over the control half's — a difference in differences, so whatever moved both
 * halves alike (a Google update, the counselling calendar) cancels out. Server only; cached six hours.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { googleToken } from "@/lib/google";
import { TITLE_TEST, titleGroup } from "@/lib/titleTest";

const SITE = "sc-domain:admissionhands.com";
const PREFIX = "https://www.admissionhands.com/md-ms-india/colleges/";

export interface Half {
  pages: number;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}
export interface TitleTestReport {
  ready: boolean;
  note: string;
  before: { from: string; to: string };
  after: { from: string; to: string } | null;
  control: { before: Half; after: Half | null };
  figures: { before: Half; after: Half | null };
  /** (figures CTR after / before) ÷ (control CTR after / before) − 1, as a percentage; null until both windows exist. */
  lift: number | null;
}

const day = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => day(new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000));

async function pageRows(token: string, from: string, to: string) {
  const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      startDate: from,
      endDate: to,
      dimensions: ["page"],
      type: "web",
      rowLimit: 25_000,
      dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: "/md-ms-india/colleges/" }] }],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  const j = (await r.json()) as { rows?: { keys: string[]; clicks: number; impressions: number; position: number }[]; error?: { message?: string } };
  if (!r.ok) throw new Error(`Search Console: ${j.error?.message ?? r.status}`);
  return j.rows ?? [];
}

/** MD/MS pages only: a DNB-only hospital's title is not in the test, so it would only dilute both halves. */
async function mdmsSlugs(): Promise<Set<string>> {
  const r = (await db.execute(sql`
    SELECT DISTINCT i.slug FROM seat_options so
      JOIN institutes i ON i.id = so.institute_id
      JOIN courses c ON c.id = so.course_id
     WHERE so.level = 'pg' AND c.name !~* '^(DNB|DrNB|FNB|Diploma|PG Diploma)'`)) as unknown as { slug: string }[];
  return new Set(r.map((x) => x.slug));
}

function halves(rows: { keys: string[]; clicks: number; impressions: number; position: number }[], eligible: Set<string>) {
  const acc = { control: { pages: 0, clicks: 0, impressions: 0, pos: 0 }, figures: { pages: 0, clicks: 0, impressions: 0, pos: 0 } };
  for (const x of rows) {
    const slug = x.keys[0].startsWith(PREFIX) ? x.keys[0].slice(PREFIX.length).split(/[/?#]/)[0] : "";
    if (!slug || !eligible.has(slug)) continue;
    const g = acc[titleGroup(slug)];
    g.pages++;
    g.clicks += x.clicks;
    g.impressions += x.impressions;
    g.pos += x.position * x.impressions;
  }
  const out = (a: typeof acc.control): Half => ({
    pages: a.pages,
    clicks: a.clicks,
    impressions: a.impressions,
    ctr: a.impressions ? a.clicks / a.impressions : 0,
    position: a.impressions ? a.pos / a.impressions : 0,
  });
  return { control: out(acc.control), figures: out(acc.figures) };
}

export const getTitleTestReport = unstable_cache(
  async (): Promise<TitleTestReport | null> => {
    const token = await googleToken(["https://www.googleapis.com/auth/webmasters.readonly"]);
    if (!token) return null;
    // Search Console's figures lag about three days.
    const last = day(new Date(Date.now() - 3 * 86_400_000));
    const settled = addDays(TITLE_TEST.started, TITLE_TEST.settleDays);
    const afterDays = Math.max(0, Math.min(28, Math.round((Date.parse(last) - Date.parse(settled)) / 86_400_000) + 1));
    const span = afterDays || 14;
    const before = { from: addDays(TITLE_TEST.started, -span), to: addDays(TITLE_TEST.started, -1) };
    const after = afterDays > 0 ? { from: settled, to: addDays(settled, afterDays - 1) } : null;
    const eligible = await mdmsSlugs();
    const b = halves(await pageRows(token, before.from, before.to), eligible);
    const a = after ? halves(await pageRows(token, after.from, after.to), eligible) : null;
    const lift =
      a && b.control.ctr && b.figures.ctr && a.control.ctr ? ((a.figures.ctr / b.figures.ctr) / (a.control.ctr / b.control.ctr) - 1) * 100 : null;
    const ready = afterDays >= 21;
    return {
      ready,
      note: !after
        ? `The test titles went live on ${TITLE_TEST.started}; results start on ${settled}, once Google has recrawled them.`
        : ready
          ? "Three weeks of data: enough to decide."
          : `${afterDays} of 21 days in — read it as a trend, not a result, until three weeks have passed.`,
      before,
      after,
      control: { before: b.control, after: a?.control ?? null },
      figures: { before: b.figures, after: a?.figures ?? null },
      lift,
    };
  },
  ["title-test-report-v1"],
  { revalidate: 6 * 3600 },
);
