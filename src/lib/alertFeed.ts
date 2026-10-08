/**
 * The live alerts bar, kept current from the authorities' own notice boards.
 *
 * Runs on a schedule (POST /api/cron/alerts, from the server's crontab). For
 * each official source it reads the notice list, keeps what concerns MBBS, BDS,
 * NEET PG or super-speciality counselling, and adds anything it has not seen
 * before as an alert linking to the authority's own document. Every alert
 * expires: 30 days after it was published, or the day after the last date its
 * title names (a registration deadline, a reporting date), whichever is first.
 *
 * Rules that keep it from embarrassing the site:
 *  - **Only official sources**, and the alert links to the authority's file,
 *    never to a copy. The title is theirs, tidied, prefixed with who said it.
 *  - **The first read of a board publishes nothing older than a week.** It
 *    records the backlog in `alert_feed_seen`, so a board with 900 old notices
 *    does not dump them into the bar.
 *  - **At most five new alerts per source per run**, newest first — a board
 *    that re-posts everything with new links cannot flood the site.
 *  - An admin can switch any alert off; the feed never switches one back on,
 *    because it only ever inserts notices it has not seen.
 *
 * Sites that block or time out are reported and skipped; one failing board
 * never stops the others. UP, Rajasthan, Telangana, Haryana, J&K and Odisha did
 * not answer from the server on 2026-10-08 (certificate faults and timeouts).
 */
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
const DAY = 86_400_000;
const MAX_NEW_PER_SOURCE = 5;
/** Live alerts one board may hold at once — Puducherry alone posts a dozen notices a week. */
const MAX_ACTIVE_PER_SOURCE = 4;
const LIFETIME_DAYS = 30;

export interface AlertSource {
  id: string;
  /** Shown before the title in the bar: "MCC (PG): …". */
  label: string;
  url: string;
  /** Every notice on this page is medical counselling — no need to look for MBBS/NEET in the title. */
  medicalOnly?: boolean;
  /** Extra condition a title must meet, for boards that mix many exams. */
  require?: RegExp;
}

export const ALERT_SOURCES: AlertSource[] = [
  { id: "mcc-ug", label: "MCC (UG)", url: "https://mcc.nic.in/ug-medical-counselling/", medicalOnly: true },
  { id: "mcc-pg", label: "MCC (PG)", url: "https://mcc.nic.in/pg-medical-counselling/", medicalOnly: true },
  { id: "mcc-ss", label: "MCC (SS)", url: "https://mcc.nic.in/super-speciality-counselling/", medicalOnly: true },
  {
    id: "nbems",
    label: "NBEMS",
    url: "https://natboard.edu.in/deptnotice",
    medicalOnly: true,
    require: /neet[\s-]*(pg|ss|mds)|\bdnb\b.*(counsel|admission|seat|post[\s-]*mbbs)/i,
  },
  { id: "nta-neet", label: "NTA NEET", url: "https://neet.nta.nic.in/", medicalOnly: true },
  { id: "kea", label: "Karnataka KEA", url: "https://cetonline.karnataka.gov.in/kea/" },
  { id: "mh-cet", label: "Maharashtra CET Cell", url: "https://cetcell.mahacet.org/" },
  { id: "tn", label: "Tamil Nadu", url: "https://tnmedicalselection.net/", medicalOnly: true },
  { id: "kl-cee", label: "Kerala CEE", url: "https://cee.kerala.gov.in/" },
  { id: "gj", label: "Gujarat ACPUGMEC", url: "https://www.medadmgujarat.org/", medicalOnly: true },
  { id: "wb", label: "West Bengal WBMCC", url: "https://wbmcc.nic.in/", medicalOnly: true },
  { id: "br", label: "Bihar BCECEB", url: "https://bceceboard.bihar.gov.in/", require: /ugmac|pgmac|neet|mbbs|bds|medical|dental/i },
  { id: "jh", label: "Jharkhand JCECEB", url: "https://jceceb.jharkhand.gov.in/" },
  { id: "pb", label: "Punjab BFUHS", url: "https://bfuhs.ac.in/" },
  { id: "as", label: "Assam DME", url: "https://dme.assam.gov.in/" },
  { id: "cg", label: "Chhattisgarh DME", url: "https://cgdme.in/" },
  { id: "uk", label: "Uttarakhand HNBUMU", url: "https://hnbumu.ac.in/" },
  { id: "hp", label: "Himachal AMRU", url: "https://amruhp.ac.in/" },
  { id: "py", label: "Puducherry CENTAC", url: "https://centacpuducherry.in/", require: /mbbs|bds|neet|medical|dental|md|ms|mds|pg/i },
];

/* ------------------------------ parsing ------------------------------ */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Every plausible date in a string. Day-first, as Indian notices write them. */
export function datesIn(s: string): Date[] {
  const out: Date[] = [];
  const push = (y: number, m: number, d: number) => {
    if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() === m - 1) out.push(dt);
  };
  for (const m of s.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) push(+m[1], +m[2], +m[3]);
  for (const m of s.matchAll(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/g)) push(+m[3], +m[2], +m[1]);
  for (const m of s.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3})[a-z]*[\s,.-]+(\d{4})\b/gi)) {
    const i = MONTHS.indexOf(m[2].toLowerCase());
    if (i >= 0) push(+m[3], i + 1, +m[1]);
  }
  for (const m of s.matchAll(/\b([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi)) {
    const i = MONTHS.indexOf(m[1].toLowerCase());
    if (i >= 0) push(+m[3], i + 1, +m[2]);
  }
  return out;
}

/** "uploads/2026/09/…" — the month the file went up, from the address itself. */
function uploadMonth(href: string): Date | null {
  const m = href.match(/\/(20\d{2})\/(0[1-9]|1[0-2])\//);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, 1)) : null;
}

const GENERIC = /^(click here|download|read more|view|more|new|details|link|here|pdf|notice|notification|apply online|login)\b.{0,12}$/i;
const MEDICAL =
  /(neet|mbbs|\bbds\b|\bmds\b|md\s*\/\s*ms|\bm\.?d\b|\bm\.?s\b|medical|dental|post[\s-]*graduate|super[\s-]*special|\bss\b|\bdm\b|m\.?ch|\bdnb\b|drnb|ugmac|pgmac|aiq|all india quota)/i;
const CORE = /(neet|mbbs|\bbds\b|\bmds\b|md\s*\/\s*ms|pg medical|medical pg|super[\s-]*special|\bdm\b|m\.?ch|\bdnb\b)/i;
const EVENT =
  /(counsel|round|allot|seat|merit|schedule|registration|choice|option|mop[\s-]*up|stray|vacan|result|notice|notification|admission|cut[\s-]*off|document|verification|reporting|joining|fee|bulletin|prospectus|extension|revised|corrigendum|list|matrix|instruction|guideline|score|answer key|admit card|eligib|quota|declared)/i;
const EXCLUDE =
  /(nursing|pharm|paramedic|\bgnm\b|\banm\b|physiother|polytechnic|engineering|b\.?\s?tech|b\.?\s?arch|\biti\b|recruit|tender|faculty|walk[\s-]*in|quotation|\brti\b|salary|hostel|ayush|bams|bhms|bums|bsms|b\.?\s?sc|m\.?\s?sc|veterinar|fmge|gpat|dpee|\bfet\b|exit exam|staff|employee|auction|pension|transfer|deputation|\bbpt\b|\bmpt\b|b\.?\s?ed\b|\bllb\b|\bpgcet\b|mba|mca|lateral entry|agricultur|fisheries|horticult|\bbhmct\b)/i;

export interface FeedItem {
  title: string;
  url: string;
  publishedOn: Date | null;
  /** True when the board or the title gave a day; false when only the upload month is known. */
  exact: boolean;
  due: Date | null;
  /** Order on the page — boards list newest first. */
  position: number;
}

/** Never medical-counselling news, whatever else the title mentions. */
const NEVER =
  /(ayurved|homoeo|homeopath|unani|siddha|naturopathy|\byoga\b|date[\s-]*sheet|semester|supplementary|re-?appear|practical exam|professional exam|held in the month|university exam|annual exam|(exam|examination)s? held|final year exam|\bbatch\b)/i;

/** Notices on one page, deduplicated, with whatever dates the page gives them. */
export function extractItems(html: string, base: string, source: AlertSource): FeedItem[] {
  const seen = new Set<string>();
  const items: FeedItem[] = [];
  const re = /<a\b[^>]*?href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const rawHref = decode(m[1].trim());
    if (/^(mailto|javascript|tel):/i.test(rawHref)) continue;
    let url: string;
    try {
      url = new URL(rawHref, base).toString();
    } catch {
      continue;
    }
    if (!/^https?:/i.test(url) || /(facebook|twitter|x\.com|instagram|youtube|whatsapp|play\.google|linkedin)\./i.test(url)) continue;

    let title = text(m[2])
      .replace(/^[\s•·»*>–-]+/, "")
      .replace(/^\W*(new|latest)\W+/i, "")
      .replace(/\s*\b(new|click here( to (view|download))?)\W*$/i, "")
      .trim();
    if (title.length < 18 || title.length > 300 || GENERIC.test(title)) continue;
    if (NEVER.test(title)) continue;

    const mentionsCore = CORE.test(title);
    if (EXCLUDE.test(title) && !mentionsCore) continue;
    if (!source.medicalOnly && !MEDICAL.test(title)) continue;
    if (source.require && !source.require.test(title)) continue;
    if (!EVENT.test(title)) continue;

    // The date a board prints beside a notice usually sits just before it, in
    // the same row. Look back a short way, and no further than the previous link.
    const before = html.slice(Math.max(0, m.index - 500), m.index);
    const lastLink = before.toLowerCase().lastIndexOf("</a>");
    const context = text(lastLink >= 0 ? before.slice(lastLink + 4) : before);
    const contextDates = datesIn(context);
    const titleDates = datesIn(title);
    const exactDate = contextDates.at(-1) ?? titleDates[0] ?? null;
    const publishedOn = exactDate;
    const floor = publishedOn ?? uploadMonth(url);
    const later = titleDates.filter((d) => !floor || d.getTime() > floor.getTime() + DAY);
    const due = later.length ? new Date(Math.max(...later.map((d) => d.getTime()))) : null;

    const key = url + "|" + title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      title: tidy(title),
      url,
      publishedOn: exactDate ?? uploadMonth(url),
      exact: Boolean(exactDate),
      due,
      position: items.length,
    });
  }
  return items;
}

const ACRONYMS =
  /\b(mcc|ug|pg|ss|neet|mbbs|bds|mds|aiq|dnb|drnb|dm|mch|nri|pwd|pwbd|afms|aiims|jipmer|esic|nbems|nta|md|ms|obc|sc|st|ews|ur|kea|cee|ii|iii|iv|ay|ugmac|pgmac|dcece|bfuhs|amu|bhu|du|ip)\b/gi;

/** Their words, tidied: entities decoded, shouting lowered, trailing "dated …" kept. */
function tidy(title: string): string {
  let t = title.replace(/\s+/g, " ").replace(/^\[?\d{1,2}[./-]\d{1,2}[./-]\d{4}\]?\s*[-–:]?\s*/, "");
  const letters = t.replace(/[^a-z]/gi, "");
  const upper = t.replace(/[^A-Z]/g, "");
  if (letters.length > 12 && upper.length / letters.length > 0.7) {
    t = t.toLowerCase().replace(ACRONYMS, (a) => a.toUpperCase());
    t = t.charAt(0).toUpperCase() + t.slice(1);
  }
  t = t.replace(/\bScehdule\b/gi, "Schedule").replace(/\bCounelling\b/gi, "Counselling");
  return t.length > 150 ? t.slice(0, 147).replace(/\s+\S*$/, "") + "…" : t;
}

async function fetchPage(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml", "accept-language": "en-IN,en;q=0.9" },
    signal: AbortSignal.timeout(25_000),
    redirect: "follow",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const body = await r.text();
  return body.length > 4_000_000 ? body.slice(0, 4_000_000) : body;
}

/* ------------------------------ the run ------------------------------ */

export interface SourceReport {
  source: string;
  ok: boolean;
  error?: string;
  found: number;
  fresh: number;
  published: string[];
  baseline: boolean;
}

const keyOf = (sourceId: string, item: FeedItem) =>
  createHash("sha256")
    .update(`${sourceId}|${item.url.replace(/[?&](v|ver|t|_)=\d+/g, "")}|${item.title.toLowerCase()}`)
    .digest("hex");

const iso = (d: Date) => d.toISOString().slice(0, 10);

async function runSource(source: AlertSource, now: Date): Promise<SourceReport> {
  const report: SourceReport = { source: source.id, ok: false, found: 0, fresh: 0, published: [], baseline: false };
  let items: FeedItem[];
  try {
    items = extractItems(await fetchPage(source.url), source.url, source);
  } catch (e) {
    report.error = e instanceof Error ? e.cause instanceof Error ? `${e.message}: ${e.cause.message}` : e.message : String(e);
    return report;
  }
  report.ok = true;
  report.found = items.length;
  if (!items.length) return report;

  const known = (await db.execute(sql`SELECT count(*)::int AS n FROM alert_feed_seen WHERE source = ${source.id}`)) as unknown as { n: number }[];
  report.baseline = Number(known[0]?.n ?? 0) === 0;

  const keyed = items.map((item) => ({ item, key: keyOf(source.id, item) }));
  const seenRows = (await db.execute(sql`
    SELECT key FROM alert_feed_seen WHERE key IN (${sql.join(keyed.map((k) => sql`${k.key}`), sql`, `)})
  `)) as unknown as { key: string }[];
  const seen = new Set(seenRows.map((r) => r.key));
  const fresh = keyed.filter((k) => !seen.has(k.key));
  report.fresh = fresh.length;

  const active = (await db.execute(sql`
    SELECT count(*)::int AS n FROM live_alerts
     WHERE source = ${source.id} AND auto = true AND is_active = true AND (expires_at IS NULL OR expires_at > now())
  `)) as unknown as { n: number }[];
  const room = Math.max(0, MAX_ACTIVE_PER_SOURCE - Number(active[0]?.n ?? 0));

  const window = (report.baseline ? 7 : LIFETIME_DAYS) * DAY;
  const candidates = fresh
    .filter(({ item }) => {
      // Undated: new to a board we already know, so new to the world. Never on the first read.
      if (!item.publishedOn) return !report.baseline;
      const age = now.getTime() - item.publishedOn.getTime();
      if (item.exact) return age <= window && age >= -2 * DAY;
      // Only the upload month: this month or last, and on a first read only the top of the list.
      return age <= 45 * DAY && (!report.baseline || item.position < 5);
    })
    .filter(({ item }) => !item.due || item.due.getTime() + DAY > now.getTime())
    .sort((a, b) => (b.item.publishedOn?.getTime() ?? now.getTime()) - (a.item.publishedOn?.getTime() ?? now.getTime()))
    .slice(0, Math.min(MAX_NEW_PER_SOURCE, room));

  for (const { item, key } of fresh) {
    await db.execute(sql`
      INSERT INTO alert_feed_seen (key, source, title, url, published_on)
      VALUES (${key}, ${source.id}, ${item.title}, ${item.url}, ${item.publishedOn ? iso(item.publishedOn) : null})
      ON CONFLICT (key) DO NOTHING
    `);
  }

  for (const { item, key } of candidates) {
    // An upload month is not a publication date; first sight is the honest one.
    const published = item.exact && item.publishedOn && item.publishedOn.getTime() <= now.getTime() ? item.publishedOn : now;
    let expires = new Date(published.getTime() + LIFETIME_DAYS * DAY);
    if (item.due && item.due.getTime() + DAY < expires.getTime()) expires = new Date(item.due.getTime() + DAY);
    const title = `${source.label}: ${item.title}`;
    await db.execute(sql`
      INSERT INTO live_alerts (title, link, is_active, order_index, source, source_key, auto, published_at, expires_at)
      VALUES (${title}, ${item.url}, true, 100, ${source.id}, ${key}, true, ${published.toISOString()}, ${expires.toISOString()})
      ON CONFLICT (source_key) WHERE source_key IS NOT NULL DO NOTHING
    `);
    report.published.push(title);
  }
  return report;
}

/** One pass over every source, then retire whatever has expired. */
export async function runAlertFeed(only?: string[]): Promise<{ reports: SourceReport[]; retired: number }> {
  const now = new Date();
  const sources = only?.length ? ALERT_SOURCES.filter((s) => only.includes(s.id)) : ALERT_SOURCES;
  const reports: SourceReport[] = [];
  // A few at a time: these are government servers, and several are slow.
  for (let i = 0; i < sources.length; i += 4) {
    reports.push(...(await Promise.all(sources.slice(i, i + 4).map((s) => runSource(s, now)))));
  }
  const retired = (await db.execute(sql`
    UPDATE live_alerts SET is_active = false
     WHERE is_active = true AND expires_at IS NOT NULL AND expires_at < now()
    RETURNING id
  `)) as unknown as unknown[];
  return { reports, retired: retired.length };
}
