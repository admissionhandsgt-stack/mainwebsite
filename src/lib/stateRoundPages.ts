/**
 * A state's own NEET PG round, as a page — /neet-pg-counselling/<year>/<round-slug>/<state> (2026-11-24, owner: "jaise
 * humne round wise MCC ka result page banaya hai aise sab states ka banaye"). Server only.
 *
 * Google and Bing suggest these as real searches — 458 of the 7,891 the research bot holds name a state with a round,
 * result, merit list, seat matrix or schedule ("haryana neet pg round 2 result", "maharashtra neet pg merit list 2026",
 * "wbmcc neet pg counselling round 3") — and the site had no page for any of them.
 *
 * What a page holds, all of it already on the site somewhere but never per round:
 *   - the state authority's own notices for that round (owner-approved in Zyn, each linked to the authority's file):
 *     result / allotment, merit list, seat matrix, schedule, registration;
 *   - the round's result in group figures, where the allotment list is loaded (`state_round_cuts`): last rank admitted
 *     by quota, category and branch, each over 3+ colleges — never one college's closing rank (the chance-view rule);
 *   - the same round last year, branch by branch, from the state's own results (`closing_ranks`).
 * A page exists only where the state's round has a notice or figures; it is indexed only with figures, a result notice
 * or two notices, so no page is a single link. Only the running counselling year has pages.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { groupRank } from "@/lib/chance";
import { branchSlug } from "@/lib/branchSlug";
import { getPgStates, getPgStatePage, OPEN_CATEGORY_CODES } from "@/lib/pgStateQueries";
import { stateKey } from "@/lib/stateNotices";
import { getStateRoundOf, type StateRound } from "@/lib/stateRoundQueries";
import { getCounsellingYear, ROUNDS, type RoundSpec } from "@/lib/mccResults";
import { logError } from "@/lib/logger";

const rows = <T,>(r: unknown) => r as unknown as T[];

/** The rounds a state page can be about: 1, 2, 3 (a state's mop-up round) and the stray round. */
export const STATE_ROUNDS = ROUNDS.filter((r) => r.order <= 4);
export const stateRoundPath = (year: number, roundSlug: string, stateSlug: string) => `/neet-pg-counselling/${year}/${roundSlug}/${stateSlug}`;
/** "R2" — how `state_round_cuts` and `closing_ranks` label a round. */
const label = (order: number) => `R${order}`;

/* ------------------------------------------------------------- which round a notice is about --- */

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4 };
const WORD: Record<string, number> = { one: 1, two: 2, three: 3, first: 1, second: 2, third: 3, "1st": 1, "2nd": 2, "3rd": 3, ist: 1, iind: 2, iiird: 3 };

/**
 * The round a notice names: 1–3, or 4 for a stray round (a state's mop-up round is its third). Boards write it every
 * way — "Round-2", "Round -1", "Round1", "Round- II", "2nd round", "second phase", "Phase II" — and a notice that
 * names two rounds ("Round 2 registration and resignation of Round 1 seat") is about the first it names.
 */
export function roundOrder(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const found: { at: number; order: number }[] = [];
  const add = (re: RegExp, order: (m: RegExpExecArray) => number | null | undefined) => {
    const m = re.exec(t);
    const o = m ? order(m) : null;
    if (m && o) found.push({ at: m.index, order: o });
  };
  add(/\bstray\b/, () => 4);
  add(/\bmop[\s-]?up\b/, () => 3);
  add(/\b(?:round|phase)\s*[-–—:.]?\s*(\d|iii|ii|iv|i)\b/, (m) => (/\d/.test(m[1]) ? (Number(m[1]) >= 1 && Number(m[1]) <= 4 ? Number(m[1]) : null) : ROMAN[m[1]]));
  add(/\b(1st|2nd|3rd|first|second|third|ist|iind|iiird)\s+(?:round|phase|counsel+ing)\b/, (m) => WORD[m[1]]);
  add(/\b(?:round|phase)\s+(one|two|three)\b/, (m) => WORD[m[1]]);
  if (!found.length) return null;
  return found.sort((a, b) => a.at - b.at)[0].order;
}

export type NoticeKind = "result" | "merit" | "matrix" | "schedule" | "registration" | "notice";
export const KIND_LABEL: Record<NoticeKind, string> = {
  result: "Result",
  merit: "Merit list",
  matrix: "Seat matrix",
  schedule: "Schedule",
  registration: "Registration",
  notice: "Notice",
};

/**
 * What a notice is, from its own title alone. Zyn's `kind` is not used: it files a merit list, a "second round seat
 * allotment – notification" and a resignation notice under "result" or "schedule", and the page answers "Is the result
 * out?" from this (audit of 2026-11-24: Karnataka's and Jharkhand's Round 2 pages said "out" on notices that were not
 * results). A result is a result, an allotment / selection list, the allotments or a seat allocation — never a schedule,
 * a notification about the allotment, an option facility, or a notice about withheld, cancelled or resigned seats.
 * Anything the title does not settle is a plain "Notice".
 */
export function noticeKind(title: string, _kind?: string | null): NoticeKind {
  const t = title.toLowerCase();
  if (/merit\s*(list|no\b|position)/.test(t)) return "merit";
  const never = /withh?eld|extension|resign|cancel|free exit/.test(t);
  const explicit = /allot+ment\s+(list|result|order)|allot+ments\b|seat allocation|selection list|select list|selected candidates|list of selected/.test(t);
  // "Allotment" or "result" alone counts only in a title that is not a notice about something else ("Important notice
  // regarding 2nd round … on the basis of NEET PG result" is not a result).
  const bare = /\ballot+ment\b|\bresults?\b/.test(t) && !/s(e)?chedule|notification|notice|procedure|instruction|information|option|facility|\bfee\b|report|guideline|regarding|basis of/.test(t);
  if (!never && (explicit || bare) && !/s(e)?chedule/.test(t.replace(/allot+ment\s+(list|result|order)/, ""))) return "result";
  if (/\bmatrix\b|vacan|seat position|seat distribution/.test(t)) return "matrix";
  if (/s(e)?chedule|time ?table|calendar|important dates/.test(t)) return "schedule";
  if (/regist|web[\s-]?options?|choice filling|option (form|entry)|preferences?\b|apply online|online application/.test(t)) return "registration";
  return "notice";
}

/* --------------------------------------------------------------------------- the notices --- */

export interface RoundNotice {
  title: string;
  url: string | null;
  /** ISO time the authority published it (or the owner approved it). */
  on: string;
  /** `on` is the authority's own publication day (Zyn's `published_on`), not the day the notice was approved here. */
  exact: boolean;
  authority: string | null;
  kind: NoticeKind;
  order: number;
  brief: string | null;
  points: string[];
}

type NoticeRow = { title: string; url: string | null; pub: string | null; at: string | null; authority: string | null; state: string; round: string | null; kind: string | null; brief: string | null; points: unknown };

/** Every published PG notice of a counselling year that names a round, by state. July of the year to June of the next. */
const loadNotices = unstable_cache(
  async (year: number): Promise<(RoundNotice & { state: string })[]> => {
    const list = rows<NoticeRow>(
      await db.execute(sql`
        SELECT z.title, z.url, z.authority, z.state, z.round, z.kind,
               z.payload->>'published_on' AS pub, to_json(COALESCE(z.approved_at, z.received_at))#>>'{}' AS at,
               z.payload->>'public_brief' AS brief, z.payload->'public_points' AS points
          FROM zyn_notices z
          LEFT JOIN live_alerts a ON a.id = z.alert_id
         WHERE z.status = 'published' AND z.state IS NOT NULL
           AND COALESCE(z.payload->>'level', 'pg') = 'pg'
           -- A notice an admin switched off stays off; an expired one is still listed (as on the state pages).
           AND (a.id IS NULL OR a.is_active OR (a.expires_at IS NOT NULL AND a.expires_at < now()))
           AND COALESCE(z.approved_at, z.received_at) >= make_date(${year}, 7, 1)
           AND COALESCE(z.approved_at, z.received_at) < make_date(${year + 1}, 7, 1)`),
    );
    const out: (RoundNotice & { state: string })[] = [];
    for (const r of list) {
      const order = roundOrder(r.round) ?? roundOrder(r.title);
      // The day the authority published it (Zyn's `published_on`, a date), else the moment the owner approved it.
      // A `published_on` after today is a date inside the notice (a schedule's last day), not when it was published.
      const pub = r.pub && /^\d{4}-\d{2}-\d{2}$/.test(r.pub) ? `${r.pub}T12:00:00+05:30` : null;
      const exact = !!pub && Date.parse(pub) <= Date.now() + 86_400_000;
      const on = exact ? pub : r.at;
      if (!order || !on) continue;
      const raw = typeof r.points === "string" ? (() => { try { return JSON.parse(r.points as string); } catch { return []; } })() : r.points;
      out.push({
        state: r.state,
        title: r.title.replace(/\s+/g, " ").trim(),
        url: r.url,
        on,
        exact,
        authority: r.authority ? r.authority.split(" · ")[0].replace(/\s*\([^)]*\.[a-z]{2,}[^)]*\)\s*$/i, "").trim() : null,
        kind: noticeKind(r.title, r.kind),
        order,
        brief: r.brief?.trim() || null,
        points: Array.isArray(raw) ? raw.filter((p): p is string => typeof p === "string" && !!p.trim()).map((p) => p.trim()).slice(0, 8) : [],
      });
    }
    // The same notice sent twice (one title, one day, two links) is listed once.
    const seen = new Set<string>();
    return out
      .sort((a, b) => Date.parse(b.on) - Date.parse(a.on))
      .filter((x) => {
        const k = `${x.state}|${x.order}|${x.title.toLowerCase()}|${x.on.slice(0, 10)}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  },
  ["state-round-notices-v2"],
  { revalidate: 900, tags: ["alerts", "state-round"] },
);

/* ----------------------------------------------------------------------------- the index --- */

export interface RoundEntry {
  state: string;
  slug: string;
  order: number;
  roundSlug: string;
  path: string;
  notices: number;
  /** Notices that are a result or allotment list. */
  results: number;
  /** The allotment list is loaded and covers three or more colleges. */
  figures: boolean;
  /** The newest thing on the page: a notice's date or the list's own date (YYYY-MM-DD, IST). */
  newest: string | null;
  indexable: boolean;
}

const istDay = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

/** Every state × round of the running counselling that has something to show. */
export const getStateRoundIndex = unstable_cache(
  async (): Promise<{ year: number; entries: RoundEntry[] }> => {
    try {
      const year = await getCounsellingYear();
      const [states, notices, cuts] = await Promise.all([
        getPgStates(),
        loadNotices(year),
        db.execute(sql`
          SELECT s.slug, c.round, COUNT(DISTINCT COALESCE(c.institute_id::text, c.college_printed))::int AS colleges,
                 to_char(MAX(c.imported_at) AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS loaded
            FROM state_round_cuts c JOIN states s ON s.id = c.state_id
           WHERE c.level = 'pg' AND c.year = ${year} AND c.closing_air > 0
           GROUP BY s.slug, c.round`),
      ]);
      const cutMap = new Map(rows<{ slug: string; round: string; colleges: number; loaded: string | null }>(cuts).map((c) => [`${c.slug}|${c.round}`, { colleges: Number(c.colleges), loaded: c.loaded }]));
      const entries: RoundEntry[] = [];
      for (const st of states) {
        const mine = notices.filter((n) => stateKey(n.state) === stateKey(st.name));
        for (const spec of STATE_ROUNDS) {
          const ns = mine.filter((n) => n.order === spec.order);
          const cut = cutMap.get(`${st.slug}|${label(spec.order)}`);
          const figures = (cut?.colleges ?? 0) >= 3;
          if (!ns.length && !figures) continue;
          const results = ns.filter((n) => n.kind === "result").length;
          entries.push({
            state: st.name,
            slug: st.slug,
            order: spec.order,
            roundSlug: spec.slug,
            path: stateRoundPath(year, spec.slug, st.slug),
            notices: ns.length,
            results,
            figures,
            // The later of the newest notice and the day the allotment list was loaded.
            newest: [ns.length ? istDay(ns[0].on) : "", figures ? (cut?.loaded ?? "") : ""].sort().pop() || null,
            indexable: figures || results > 0 || ns.length >= 2,
          });
        }
      }
      return { year, entries };
    } catch (error) {
      logError(error, { route: "stateRoundPages:index" });
      return { year: new Date().getFullYear(), entries: [] };
    }
  },
  ["state-round-index-v2"],
  { revalidate: 900, tags: ["alerts", "state-round", "seat-data"] },
);

/* ------------------------------------------------------------- the same round, last year --- */

export interface LastYearRound {
  year: number;
  quota: string;
  colleges: number;
  rows: { name: string; slug: string; colleges: number; last: number }[];
}

const openCodes = sql.join(OPEN_CATEGORY_CODES.map((c) => sql`${c}`), sql`, `);

/** The state's own results for the same round of its last complete year: the main merit quota, open category, 3+ colleges a branch. */
const lastYearRound = unstable_cache(
  async (stateSlug: string, order: number): Promise<LastYearRound | null> => {
    const p = await getPgStatePage(stateSlug);
    if (!p?.year || !p.branchCut) return null;
    const quota = p.branchCut.quota;
    const list = rows<{ name: string; colleges: number; last: number; all_colleges: number }>(
      await db.execute(sql`
        WITH x AS (
          SELECT co.name, cr.institute_id, cr.closing_rank
            FROM closing_ranks cr
            JOIN institutes i ON i.id = cr.institute_id
            JOIN states s ON s.id = i.state_id
            JOIN courses co ON co.id = cr.course_id
            JOIN categories cat ON cat.id = cr.category_id
            JOIN quotas q ON q.id = cr.quota_id
           WHERE cr.level = 'pg' AND s.slug = ${stateSlug} AND cr.year = ${p.year} AND cr.round_label = ${label(order)}
             AND q.label = ${quota} AND cat.code IN (${openCodes}) AND cr.closing_rank > 0)
        SELECT name, COUNT(DISTINCT institute_id)::int AS colleges, MAX(closing_rank)::int AS last,
               (SELECT COUNT(DISTINCT institute_id) FROM x)::int AS all_colleges
          FROM x GROUP BY name HAVING COUNT(DISTINCT institute_id) >= 3 ORDER BY MAX(closing_rank)`),
    );
    const out = list
      .map((x) => ({ name: String(x.name), slug: branchSlug(String(x.name)), colleges: Number(x.colleges), last: groupRank(Number(x.last), Number(x.colleges)) }))
      .filter((x): x is { name: string; slug: string; colleges: number; last: number } => x.last != null);
    return out.length >= 3 ? { year: p.year, quota, colleges: Number(list[0]?.all_colleges ?? 0), rows: out } : null;
  },
  ["state-round-last-year-v2"],
  { revalidate: 86400, tags: ["seat-data"] },
);

/* ------------------------------------------------------------------------------ one page --- */

export interface StateRoundPage {
  year: number;
  spec: RoundSpec;
  state: { name: string; slug: string; mdms: number };
  entry: RoundEntry;
  notices: RoundNotice[];
  /** The newest result or allotment notice of the round, when one is out. */
  result: RoundNotice | null;
  /** The body the notices come from. */
  authority: string | null;
  figures: StateRound | null;
  lastYear: LastYearRound | null;
  /** This state's other rounds, and this round in other states. */
  otherRounds: RoundEntry[];
  otherStates: RoundEntry[];
}

export async function getStateRoundPage(yearText: string, roundSlug: string, stateSlug: string): Promise<StateRoundPage | null> {
  const spec = STATE_ROUNDS.find((r) => r.slug === roundSlug);
  if (!spec || !/^\d{4}$/.test(yearText)) return null;
  const { year, entries } = await getStateRoundIndex();
  if (Number(yearText) !== year) return null;
  const entry = entries.find((e) => e.slug === stateSlug && e.order === spec.order);
  if (!entry) return null;
  const [states, all, figures, lastYear] = await Promise.all([
    getPgStates(),
    loadNotices(year),
    entry.figures ? getStateRoundOf(stateSlug, year, label(spec.order)).catch(() => null) : Promise.resolve(null),
    lastYearRound(stateSlug, spec.order).catch(() => null),
  ]);
  const st = states.find((s) => s.slug === stateSlug);
  if (!st) return null;
  const notices = all.filter((n) => stateKey(n.state) === stateKey(st.name) && n.order === spec.order).map(({ state: _s, ...n }) => n);
  const result = notices.find((n) => n.kind === "result") ?? null;
  return {
    year,
    spec,
    state: { name: st.name, slug: st.slug, mdms: st.mdms },
    entry,
    notices,
    result,
    authority: notices.find((n) => n.authority)?.authority ?? null,
    figures,
    lastYear,
    otherRounds: entries.filter((e) => e.slug === stateSlug && e.order !== spec.order).sort((a, b) => a.order - b.order),
    otherStates: entries.filter((e) => e.order === spec.order && e.slug !== stateSlug).sort((a, b) => a.state.localeCompare(b.state)),
  };
}

/** A state's round pages (its counselling and data pages link them). */
export async function getStateRoundLinks(stateName: string): Promise<{ year: number; entries: RoundEntry[] }> {
  const { year, entries } = await getStateRoundIndex();
  return { year, entries: entries.filter((e) => stateKey(e.state) === stateKey(stateName)).sort((a, b) => a.order - b.order) };
}
