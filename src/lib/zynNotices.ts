/**
 * Counselling notices from Zyn (the AH Counselor tool), approved by the owner on Telegram, onto the website by
 * themselves (owner, 2026-11-05: "verify karke … telegram par confirmation … confirm karu to website par automatic
 * update"). Zyn watches MCC PG, NMC, NBEMS and the state authorities, drafts each notice and sends it to the owner
 * for approval; only approved notices come here.
 *
 * Every run (POST /api/cron/notices, every 5 minutes) takes the notices approved since the last one and, for each:
 *   1. checks it: approved, a title, and a link on an official domain — else it is held for the admin;
 *   2. puts it on the alerts bar (live_alerts, source "zyn"), unless the same link is already there;
 *   3. for an MCC schedule notice with a round and dates, checks that every date's printed text is in the notice
 *      text Zyn read, and only then writes the round's dates into the admin's pg_schedule (the round pages, their
 *      FAQ and the MCC worker's window follow). Anything that does not check out is held, never guessed.
 * The team gets one WhatsApp line when a round's dates change. Nothing is written back to Zyn.
 *
 * Settings: Admin → Notices (Zyn) — the endpoint, its key (pasted by the owner) and the on/off switch.
 */

import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getIntegration, getIntegrationFlag, setIntegration } from "@/lib/integrations";
import { ALERT_SOURCES, datesIn, offTopic } from "@/lib/alertFeed";
import { staffList } from "@/lib/staffList";
import { sendText } from "@/lib/waGateway";
import { logError } from "@/lib/logger";

type Step = { text?: string | null; from?: string | null; to?: string | null } | null | undefined;
const STEPS = ["registration", "choice_filling", "choice_locking", "result", "reporting"] as const;
type StepKey = (typeof STEPS)[number];

export interface ZynNotice {
  id: string;
  title: string;
  url: string | null;
  /** The authority's own home page, as Zyn curates it — its host is official for that authority. */
  page: string | null;
  authority: string | null;
  state: string | null;
  kind: string | null;
  round: string | null;
  publishedOn: string | null;
  approvedAt: string | null;
  dates: Partial<Record<StepKey, Step>>;
  /** The schedule exactly as the approver saw it, "activity: when" per line (Zyn's `schedule_lines`). */
  lines: string[];
  text: string;
  raw: unknown;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Zyn's record, read loosely: field names agreed on 2026-11-05, with a few spellings tolerated. */
export function normalise(r: Record<string, unknown>): ZynNotice | null {
  const id = str(r.id) ?? (typeof r.id === "number" ? String(r.id) : null);
  const title = str(r.title);
  if (!id || !title) return null;
  const d = (r.dates && typeof r.dates === "object" ? r.dates : {}) as Record<string, unknown>;
  const dates: ZynNotice["dates"] = {};
  for (const k of STEPS) {
    const v = d[k] ?? d[k.replace("_", "")];
    if (v && typeof v === "object") dates[k] = v as Step;
    else if (typeof v === "string" && v.trim()) dates[k] = { text: v.trim() };
  }
  return {
    id,
    title,
    url: str(r.url),
    page: str(r.page),
    authority: str(r.authority) ?? str(r.source),
    state: str(r.state),
    kind: str(r.kind)?.toLowerCase() ?? null,
    round: str(r.round),
    publishedOn: str(r.published_on) ?? str(r.publishedOn),
    approvedAt: str(r.approved_at) ?? str(r.approvedAt),
    dates,
    lines: Array.isArray(r.schedule_lines) ? r.schedule_lines.filter((l): l is string => typeof l === "string" && !!l.trim()) : [],
    text:
      str(r.pdf_text_excerpt) ??
      str(r.text) ??
      (Array.isArray(r.schedule_lines) ? (r.schedule_lines as unknown[]).filter((l) => typeof l === "string").join(" \n ") : ""),
    raw: r,
  };
}

/* ------------------------------------------------------------------ checks */

/** Government and counselling-authority hosts: *.gov.in, *.nic.in, NBEMS, NMC, and every board the site's own feed reads. */
const BOARD_HOSTS = new Set(
  ALERT_SOURCES.map((s) => {
    try {
      return new URL(s.url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }).filter(Boolean),
);
const hostOf = (u: string | null) => {
  try {
    return u ? new URL(u).hostname.toLowerCase().replace(/^www\./, "") : null;
  } catch {
    return null;
  }
};

/** "Rajasthan NEET PG Counselling Board 2026 (pg.neetrajasthan.com)" → "Rajasthan NEET PG Counselling Board 2026". */
const authorityName = (a: string | null) => (a ? a.replace(/\s*\([^)]*\)\s*$/, "").trim() : null);

/** Official: a government or board host, or the same site as the authority's own home page that Zyn curates. */
export function officialLink(url: string | null, page?: string | null): boolean {
  if (!url) return false;
  const h = hostOf(url);
  const p = hostOf(page ?? null);
  if (h && p && (h === p || h.endsWith(`.${p}`) || p.endsWith(`.${h}`))) return true;
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    host = u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  if (host.endsWith(".gov.in") || host.endsWith(".nic.in")) return true;
  if (["natboard.edu.in", "nbe.edu.in", "nmc.org.in"].some((h) => host === h || host.endsWith(`.${h}`))) return true;
  return [...BOARD_HOSTS].some((h) => host === h || host.endsWith(`.${h}`));
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayMon = (isoDate: string | null | undefined) => {
  const m = isoDate?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : null;
};
const range = (from: string | null, to: string | null) => {
  if (!from) return to;
  if (!to || to === from) return from;
  const [fd, fm] = from.split(" ");
  const [td, tm] = to.split(" ");
  return fm === tm ? `${fd} – ${td} ${tm}` : `${from} – ${to}`;
};

/** How MCC labels each step in a schedule. */
const STEP_WORDS: Record<StepKey, RegExp> = {
  registration: /regist|payment/g,
  choice_filling: /choice\s*filling|filling of choices/g,
  choice_locking: /lock/g,
  result: /result|declar/g,
  reporting: /report|joining/g,
};

/** Some occurrence of `t` in `hay` has this step's label as the nearest label before it (within 160 characters). */
function printedUnder(hay: string, t: string, k: StepKey): boolean {
  for (let at = hay.indexOf(t); at >= 0; at = hay.indexOf(t, at + 1)) {
    const before = hay.slice(Math.max(0, at - 160), at);
    let best: { step: StepKey; pos: number } | null = null;
    for (const step of STEPS) {
      for (const m of before.matchAll(STEP_WORDS[step])) {
        if (!best || (m.index ?? -1) > best.pos) best = { step, pos: m.index ?? -1 };
      }
    }
    if (best?.step === k) return true;
  }
  return false;
}

/** A schedule line "activity: when" holds `t`, and its activity names step `k` (a line may name two: "filling / locking"). */
function labelledLine(line: string, t: string, k: StepKey): boolean {
  const l = squash(line);
  const at = l.indexOf(t);
  if (at < 0) return false;
  const colon = l.indexOf(":");
  const label = colon >= 0 && colon < at ? l.slice(0, colon) : l.slice(0, at);
  return new RegExp(STEP_WORDS[k].source).test(label);
}

/** "17.11.2026", "17/11/2026", "17-11-2026", "17 Nov" or "17 November" in `text` for the ISO day `isoDate`. */
function sameDay(text: string, isoDate: string): boolean {
  const m = isoDate.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (!m) return true; // no machine-readable date to contradict the printed one
  const [mm, dd] = [m[1], m[2]];
  const d = String(Number(dd));
  const mon = MONTHS[Number(mm) - 1].toLowerCase();
  const t = text.toLowerCase();
  return (
    new RegExp(`\\b0?${d}[./-]0?${Number(mm)}\\b`).test(t) ||
    new RegExp(`\\b0?${d}(st|nd|rd|th)?\\s+${mon}`).test(t)
  );
}

/**
 * The admin's schedule row a notice's round names ("Round 2", "Round-2", "R2", "Stray Vacancy Round" → "Stray vacancy").
 * MCC writes "Round-2" (its notice no. 5 of 7 Nov 2026): matched only with a space, that notice's dates were held.
 */
export const scheduleTitle = (round: string | null) => {
  if (!round) return null;
  const r = round.toLowerCase();
  if (/stray/.test(r)) return "Stray vacancy";
  const n = r.match(/round[\s._-]*(?:no\.?\s*)?([1-3])\b|\br[\s-]?([1-3])\b/);
  return n ? `Round ${n[1] ?? n[2]}` : null;
};

/**
 * An MCC schedule notice becomes the round's dates only when every date it gives is printed in the notice text —
 * the approver saw the notice, this checks the reading of it.
 */
export function scheduleUpdate(n: ZynNotice): { ok: true; title: string; data: Record<string, string> } | { ok: false; reason: string } | null {
  if (n.kind !== "schedule" || !/\bMCC\b|medical counselling committee/i.test(n.authority ?? "")) return null;
  const title = scheduleTitle(n.round);
  if (!title) return { ok: false, reason: "schedule notice without a round we know" };
  const steps = STEPS.filter((k) => n.dates[k]);
  if (!steps.length) return { ok: false, reason: "schedule notice without dates" };
  if (!n.dates.result && !n.dates.choice_filling) return { ok: false, reason: "no result or choice-filling date" };
  if (!n.text) return { ok: false, reason: "no notice text to check the dates against" };
  const hay = squash(n.text);
  // 1. The printed date is in the notice, and the step label printed nearest before it is this step's — a result
  //    date of "18.11.2026" that the notice prints after "Reporting" is not the result date.
  const misplaced = steps.filter((k) => {
    const t = n.dates[k]?.text;
    if (!t) return true;
    // Zyn's schedule lines ("Choice filling / locking: 9 – 14 Nov"): a line carrying the date whose label names the step.
    if (n.lines.length) return !n.lines.some((line) => labelledLine(line, squash(t), k));
    return !printedUnder(hay, squash(t), k);
  });
  if (misplaced.length) return { ok: false, reason: `dates not found under their step in the notice text: ${misplaced.join(", ")}` };
  // 2. The machine-readable date says the same day as the printed one.
  const mismatched = steps.filter((k) => {
    const s = n.dates[k];
    return !!s && !!s.text && [s.from, s.to].some((d) => d && !sameDay(s.text as string, d));
  });
  if (mismatched.length) return { ok: false, reason: `dates do not match their printed text: ${mismatched.join(", ")}` };

  const shown = (k: StepKey) => {
    const s = n.dates[k];
    return s?.text ?? range(dayMon(s?.from), dayMon(s?.to)) ?? null;
  };
  const start = dayMon(n.dates.registration?.from ?? n.dates.choice_filling?.from ?? null);
  const end = dayMon(n.dates.result?.from ?? n.dates.result?.to ?? n.dates.choice_filling?.to ?? null);
  const window = range(start, end);
  if (!window) return { ok: false, reason: "dates without a machine-readable from/to" };
  const data: Record<string, string> = { aiq: window, source: `MCC notice${n.publishedOn ? ` of ${dayMon(n.publishedOn) ?? n.publishedOn}` : ""}` };
  const joinBy = dayMon(n.dates.reporting?.to ?? null);
  data.aiq_join_by = joinBy ?? "—";
  if (n.url) data.source_url = n.url;
  for (const k of steps) {
    const v = shown(k);
    if (v) data[k] = v;
  }
  return { ok: true, title, data };
}

/* ------------------------------------------------------------------ writing */

async function tellTeam(text: string) {
  for (const s of await staffList()) {
    const r = await sendText(s.phone, text, { purpose: "alert" }).catch((e) => ({ sent: false, error: String(e) }));
    if (!r.sent) logError(new Error(`notice alert to ${s.name} failed`), { route: "zynNotices.alert" });
  }
}

/**
 * A board's page furniture that comes along with a notice's title: Odisha's "… Software Solution Provided By - View PDF"
 * (8 Nov 2026), "Click here", "New". Only trailing boilerplate goes — the words the board wrote stay as written.
 */
export const barTitle = (t: string) =>
  t
    .replace(/\s*software solution provided by\b.*$/i, "")
    .replace(/(\s*[-–|:]?\s*(view|download)\s*(the\s*)?(pdf|file|notice)|\s*[-–|:]?\s*click here(\s+to\s+(view|download))?|\s*\bnew!?)+\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim() || t;

/** On the alerts bar, unless the same link is already live (the site's own feed may have it). */
async function publishAlert(n: ZynNotice): Promise<number | null> {
  if (n.url) {
    const live = (await db.execute(sql`
      SELECT id FROM live_alerts WHERE link = ${n.url} AND is_active AND (expires_at IS NULL OR expires_at > now()) LIMIT 1`)) as unknown as { id: number }[];
    if (live[0]) return Number(live[0].id);
  }
  // Published on the notice's own date — never after its approval: Zyn has given a deadline as the publication date
  // ("Resignation … upto 5:00 pm of 09/11/2026", approved on the 6th, dated the 9th), which put it at the top of the bar.
  const approved = n.approvedAt && !Number.isNaN(Date.parse(n.approvedAt)) ? new Date(n.approvedAt) : new Date();
  const printed = n.publishedOn && /^\d{4}-\d{2}-\d{2}/.test(n.publishedOn) ? new Date(n.publishedOn) : null;
  const published = printed && printed.getTime() <= approved.getTime() ? printed : approved;
  // Expires 14 days on (as the site's own feed), or two days after the last date the notice gives — its steps, or a
  // date its words name after the day it was published (a deadline; "dated 07.11.2026" is not one).
  const stepDates = STEPS.map((k) => n.dates[k]?.to ?? n.dates[k]?.from)
    .filter((v): v is string => !!v && /^\d{4}-\d{2}-\d{2}/.test(v))
    .map((v) => new Date(v).getTime());
  const named = datesIn(`${n.title} ${n.text}`)
    .map((d) => d.getTime())
    .filter((t) => t > published.getTime() + 86_400_000);
  const last = [...stepDates, ...named].sort((a, b) => a - b).pop();
  let expires = new Date(Date.now() + 14 * 86_400_000);
  if (last) {
    const after = last + 2 * 86_400_000;
    // A notice whose last date has passed is history: a day on the bar at most.
    expires = new Date(Math.max(after, Date.now() + 86_400_000));
  }
  const who = authorityName(n.authority);
  const words = barTitle(n.title);
  const title = who && !words.toLowerCase().startsWith(who.toLowerCase()) ? `${who}: ${words}` : words;
  // One source per authority: the alerts bar shows at most three per source, so MCC never crowds out a state board.
  const source = `zyn:${who ?? "notice"}`.slice(0, 60);
  const rows = (await db.execute(sql`
    INSERT INTO live_alerts (title, link, is_active, order_index, source, source_key, auto, published_at, expires_at)
    VALUES (${title.slice(0, 300)}, ${n.url}, true, 90, ${source}, ${`zyn:${n.id}`}, true, ${published.toISOString()}, ${expires.toISOString()})
    ON CONFLICT (source_key) WHERE source_key IS NOT NULL DO NOTHING
    RETURNING id`)) as unknown as { id: number }[];
  return rows[0] ? Number(rows[0].id) : null;
}

async function applySchedule(title: string, data: Record<string, string>) {
  await db.execute(sql`
    UPDATE content_blocks SET data = COALESCE(data, '{}'::jsonb) || ${JSON.stringify(data)}::jsonb
     WHERE collection = 'pg_schedule' AND title = ${title}`);
}

/** One notice: checked, published or held, its schedule applied or held. Already-seen ids are skipped. */
async function take(n: ZynNotice): Promise<"published" | "held" | "seen"> {
  const seen = (await db.execute(sql`SELECT 1 FROM zyn_notices WHERE id = ${n.id}`)) as unknown as unknown[];
  if (seen.length) return "seen";
  // CENTAC Puducherry posts its notices as Google Drive files linked from its own site (three PG Medical notices
  // were held on 6 Nov 2026 for it). A Drive file is anybody's, so the alert links the authority's own page instead.
  if (n.url && /^(drive|docs)\.google\.com$/.test(hostOf(n.url) ?? "") && n.page && officialLink(n.page)) n = { ...n, url: n.page };

  let status: "published" | "held" = "published";
  let reason: string | null = null;
  if (!n.approvedAt) [status, reason] = ["held", "not marked approved"];
  else if (!officialLink(n.url, n.page)) [status, reason] = ["held", "link is not on an official domain"];
  else if (offTopic(n.title, n.url)) [status, reason] = ["held", "not MBBS/BDS/NEET PG counselling (AYUSH, a university exam or similar)"];
  else if (barTitle(n.title).split(/[^A-Za-z]+/).filter((w) => w.length >= 3).length < 3)
    [status, reason] = ["held", "the title does not say what the notice is"];

  const alertId = status === "published" ? await publishAlert(n) : null;

  let scheduleStatus: string | null = null;
  let scheduleReason: string | null = null;
  const upd = scheduleUpdate(n);
  if (upd) {
    if (status !== "published") [scheduleStatus, scheduleReason] = ["held", "notice held"];
    else if (upd.ok) {
      await applySchedule(upd.title, upd.data);
      scheduleStatus = "applied";
      await tellTeam(
        `📅 Website updated from MCC's notice: ${upd.title} — ${upd.data.aiq}` +
          (upd.data.choice_filling ? `, choice filling ${upd.data.choice_filling}` : "") +
          (upd.data.result ? `, result ${upd.data.result}` : "") +
          `.\n${n.url ?? ""}`,
      );
    } else [scheduleStatus, scheduleReason] = ["held", upd.reason];
  }

  await db.execute(sql`
    INSERT INTO zyn_notices (id, title, url, authority, state, kind, round, approved_at, payload, status, reason,
                             schedule_status, schedule_reason, alert_id, decided_at)
    VALUES (${n.id}, ${n.title}, ${n.url}, ${n.authority}, ${n.state}, ${n.kind}, ${n.round},
            ${n.approvedAt}, ${JSON.stringify(n.raw)}::jsonb, ${status}, ${reason},
            ${scheduleStatus}, ${scheduleReason}, ${alertId}, ${status === "published" ? new Date().toISOString() : null})
    ON CONFLICT (id) DO NOTHING`);
  return status;
}

/* ------------------------------------------------------------------ the run */

/** The notice key: its own if one is saved, else the AH Counselor lead-sync key — Zyn uses the same key for both (2026-11-05). */
export async function noticeKey(): Promise<string | null> {
  return (await getIntegration("zyn.notices.key")) ?? (await getIntegration("counselor.sync_key"));
}

export interface RunSummary {
  at: string;
  ok: boolean;
  skipped?: string;
  error?: string;
  received: number;
  published: number;
  held: number;
  cursor: string | null;
}

async function fetchApproved(base: string, key: string, since: string | null, limit = 100) {
  const u = new URL(base);
  if (since) u.searchParams.set("since", since);
  u.searchParams.set("limit", String(limit));
  const res = await fetch(u, { headers: { "X-AH-Sync-Key": key, accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Zyn answered ${res.status}`);
  const body = (await res.json()) as unknown;
  const list = Array.isArray(body) ? body : Array.isArray((body as { notices?: unknown }).notices) ? (body as { notices: unknown[] }).notices : [];
  const next = !Array.isArray(body) ? str((body as { next?: unknown }).next) : null;
  return { list: list.filter((x): x is Record<string, unknown> => !!x && typeof x === "object"), next };
}

export async function runZynNotices(opts: { force?: boolean } = {}): Promise<RunSummary> {
  const at = new Date().toISOString();
  const summary: RunSummary = { at, ok: true, received: 0, published: 0, held: 0, cursor: null };
  const [url, key, enabled, cursor] = await Promise.all([
    getIntegration("zyn.notices.url"),
    noticeKey(),
    getIntegrationFlag("zyn.notices.enabled"),
    getIntegration("zyn.notices.cursor"),
  ]);
  summary.cursor = cursor;
  if (!url || !key) return { ...summary, skipped: "no endpoint or key yet" };
  if (!enabled && !opts.force) return { ...summary, skipped: "switched off" };
  try {
    // The first read takes only the last week (as the site's own feed): with no cursor, weeks of approved notices would
    // otherwise land on the alerts bar at once, each for 14 days.
    const since = cursor ?? new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { list, next } = await fetchApproved(url, key, since);
    summary.received = list.length;
    let newest = cursor;
    for (const r of list) {
      const n = normalise(r);
      if (!n) continue;
      const s = await take(n);
      if (s === "published") summary.published++;
      if (s === "held") summary.held++;
      if (n.approvedAt && (!newest || n.approvedAt > newest)) newest = n.approvedAt;
    }
    const nextCursor = next ?? newest;
    if (nextCursor && nextCursor !== cursor) await setIntegration("zyn.notices.cursor", nextCursor);
    summary.cursor = nextCursor ?? cursor;
  } catch (error) {
    summary.ok = false;
    summary.error = error instanceof Error ? error.message : String(error);
    logError(error, { route: "zynNotices.run" });
  }
  await setIntegration("zyn.notices.last", JSON.stringify(summary));
  return summary;
}

/** The admin's "Test" button: one record, nothing written. */
export async function testZynEndpoint(): Promise<{ ok: boolean; message: string }> {
  const [url, key] = await Promise.all([getIntegration("zyn.notices.url"), noticeKey()]);
  if (!url || !key) return { ok: false, message: "Save the endpoint and the key first." };
  try {
    const { list } = await fetchApproved(url, key, null, 1);
    return { ok: true, message: list.length ? `Connected. Latest approved notice: “${str(list[0].title) ?? "untitled"}”.` : "Connected. No approved notices yet." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

/* ------------------------------------------------------------------ the admin's decisions */

export async function noticeList(limit = 60) {
  return (await db.execute(sql`
    SELECT id, title, url, authority, state, kind, round, approved_at, status, reason, schedule_status, schedule_reason,
           alert_id, received_at, decided_at
      FROM zyn_notices ORDER BY received_at DESC LIMIT ${limit}`)) as unknown as Record<string, unknown>[];
}

/** Publish a held notice anyway (the admin has looked at it), or dismiss it. */
export async function decideNotice(id: string, action: "publish" | "dismiss" | "apply-schedule"): Promise<{ ok: boolean; message: string }> {
  const rows = (await db.execute(sql`SELECT payload, status, schedule_status FROM zyn_notices WHERE id = ${id}`)) as unknown as {
    payload: unknown;
    status: string;
    schedule_status: string | null;
  }[];
  if (!rows[0]) return { ok: false, message: "No such notice." };
  const payload = typeof rows[0].payload === "string" ? JSON.parse(rows[0].payload) : rows[0].payload;
  const n = normalise(payload as Record<string, unknown>);
  if (!n) return { ok: false, message: "The stored notice cannot be read." };
  if (action === "dismiss") {
    await db.execute(sql`UPDATE zyn_notices SET status = 'dismissed', decided_at = now() WHERE id = ${id}`);
    return { ok: true, message: "Dismissed." };
  }
  if (action === "publish") {
    const alertId = await publishAlert(n);
    await db.execute(sql`UPDATE zyn_notices SET status = 'published', reason = NULL, alert_id = ${alertId}, decided_at = now() WHERE id = ${id}`);
    return { ok: true, message: "On the alerts bar." };
  }
  const upd = scheduleUpdate(n);
  if (!upd) return { ok: false, message: "Not an MCC schedule notice." };
  if (!upd.ok) return { ok: false, message: `Not applied: ${upd.reason}. Change the dates in Admin → Page content → MCC schedule.` };
  await applySchedule(upd.title, upd.data);
  await db.execute(sql`UPDATE zyn_notices SET schedule_status = 'applied', schedule_reason = NULL WHERE id = ${id}`);
  return { ok: true, message: `${upd.title} dates updated.` };
}
