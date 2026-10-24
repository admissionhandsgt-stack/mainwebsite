/**
 * MCC's NEET PG round results, published by themselves (2026-10-20). Server only.
 *
 * The mcc-worker container (deploy/oracle/mcc-worker/worker.py) finds a round's result PDF on MCC's
 * page, parses it into mcc_allotments_staging and calls POST /api/cron/mcc-results. This module is
 * the app's half:
 *   - `detected` / `failed`: one WhatsApp to the team per PDF, and the round page refreshed so it says
 *     the result is out (with MCC's link) while the PDF is still being read.
 *   - `ingest`: courses mapped with lib/mccCourses, colleges with the matches the 2024–25 rows and the
 *     2026 seat matrix already carry (same MCC wording), the round replaced in mcc_allotments in one
 *     transaction, the pages refreshed, the team told, IndexNow pinged.
 * and the read side for /neet-pg-counselling/[year]/[round].
 *
 * No college's closing rank is published (the 2026-10-12 rule): the pages show counts, and per branch
 * the last All India open rank only where three or more colleges stand behind it.
 */
import { revalidateTag, unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ourCourseFor, programmeLabel } from "@/lib/mccCourses";
import { branchSlug } from "@/lib/branchSlug";
import { MIN_GROUP } from "@/lib/chance";
import { staffList } from "@/lib/staffList";
import { sendText } from "@/lib/waGateway";
import { pingIndexNow } from "@/lib/indexNow";
import { logError } from "@/lib/logger";
import { CUT_CATS, quotaFamily, shortCategory, type BranchCut, type CutCat, type CutQuota } from "@/lib/mccRoundTypes";
import { getSettings } from "@/lib/content";
import { PAGE_COPY } from "@/lib/pageCopyDefaults";
import { getPgProcessContent } from "@/lib/pgProcessContent";

export { CUT_CATS, CUT_QUOTAS, type BranchCut, type CutCat, type CutQuota } from "@/lib/mccRoundTypes";

const rows = <T,>(r: unknown) => r as unknown as T[];

/** `schedule` is the round's title in the admin's pg_schedule collection; the special stray round is not scheduled ahead. */
export const ROUNDS = [
  { slug: "round-1-result", round: "Round 1", label: "Round 1", order: 1, schedule: "round 1" },
  { slug: "round-2-result", round: "Round 2", label: "Round 2", order: 2, schedule: "round 2" },
  { slug: "round-3-result", round: "Round 3", label: "Round 3", order: 3, schedule: "round 3" },
  { slug: "stray-vacancy-round-result", round: "Stray Vacancy Round", label: "Stray vacancy round", order: 4, schedule: "stray vacancy" },
  { slug: "special-stray-vacancy-round-result", round: "Special Stray Vacancy Round", label: "Special stray vacancy round", order: 5, schedule: null },
] as const;
export type RoundSpec = (typeof ROUNDS)[number];
export const roundBySlug = (slug: string) => ROUNDS.find((r) => r.slug === slug) ?? null;
export const roundByName = (name: string) => ROUNDS.find((r) => r.round === name) ?? null;
export const roundPath = (year: number, slug: string) => `/neet-pg-counselling/${year}/${slug}`;

/* ---------------------------------------------------------------- writing */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const firstPart = (s: string) => norm(s.split(",")[0] ?? s);
/** The same test as the SQL that reads earlier rounds (`mcc_course ~* 'NBEMS|DNB|NBE'`), so keys agree. */
const isDnb = (course: string) => /NBEMS|DNB|NBE/i.test(course);

interface RoundRow {
  year: number;
  round: string;
  kind: string | null;
  status: string;
  source_title: string | null;
  source_url: string | null;
  detected_at: string;
  published_at: string | null;
  rows: number | null;
  alerted_detected_url: string | null;
  alerted_live_url: string | null;
}

async function roundRow(year: number, round: string): Promise<RoundRow | null> {
  const [r] = rows<RoundRow>(
    await db.execute(sql`SELECT year, round, kind, status, source_title, source_url, detected_at::text, published_at::text, rows,
                                alerted_detected_url, alerted_live_url
                           FROM mcc_round_results WHERE year = ${year} AND round = ${round}`),
  );
  return r ?? null;
}

async function tellTeam(text: string): Promise<void> {
  for (const s of await staffList()) {
    const r = await sendText(s.phone, text, { purpose: "alert" });
    if (!r.sent) logError(new Error(`MCC result alert to ${s.name} failed: ${r.error}`), { route: "mccResults.alert" });
  }
}

const SITE = "https://www.admissionhands.com";

function refresh() {
  revalidateTag("mcc-results");
  revalidateTag("mcc");
}

const DAY_MS = 86_400_000;
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** An admin copy field read outside a page render (this runs in the worker's API call), tokens filled. */
async function roundCopy(field: "alert_out" | "alert_live", tokens: Record<string, string | number | undefined>) {
  const settings = await getSettings();
  const own = (settings[`page.pg_round.body.${field}`] ?? "").trim();
  return (own || PAGE_COPY["page.pg_round.body"].fields[field].value)
    .replace(/\{(\w+)\}/g, (whole, k: string) => (k in tokens ? String(tokens[k] ?? "") : whole))
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * The alerts bar on every page carries a round's result while it is new (2026-10-21) — our page,
 * whose top links MCC's PDF anyway. One row per round (`source_key`), first among the alerts, kept
 * until a day after reporting closes in the admin's schedule (10 days when it gives none). The title
 * follows the result; an admin who switched the alert off has the last word — it never comes back on.
 */
async function roundAlert(year: number, spec: RoundSpec, which: "out" | "live", total?: number) {
  try {
    const when = roundSchedule(spec, year, (await getPgProcessContent()).schedule);
    const m = when?.joinBy ? /(\d{1,2})\s+([A-Za-z]{3})/.exec(when.joinBy) : null;
    const mon = m ? MONTH_NAMES.indexOf(m[2].toLowerCase()) : -1;
    const joinBy = m && mon >= 0 ? Date.UTC(mon < 6 ? year + 1 : year, mon, Number(m[1])) : null;
    const expires = new Date(Math.max(Date.now() + 3 * DAY_MS, joinBy ? joinBy + DAY_MS : Date.now() + 10 * DAY_MS));
    const title = await roundCopy(which === "live" ? "alert_live" : "alert_out", {
      year,
      round: spec.label,
      total: total ? total.toLocaleString("en-IN") : undefined,
    });
    await db.execute(sql`
      INSERT INTO live_alerts (title, link, is_active, order_index, source, source_key, auto, published_at, expires_at)
      VALUES (${title}, ${roundPath(year, spec.slug)}, true, 0, 'mcc-round', ${`mcc-round:${year}:${spec.slug}`}, false, now(), ${expires.toISOString()})
      ON CONFLICT (source_key) WHERE source_key IS NOT NULL
      DO UPDATE SET title = EXCLUDED.title, expires_at = GREATEST(live_alerts.expires_at, EXCLUDED.expires_at)
       WHERE live_alerts.is_active`);
  } catch (error) {
    logError(error, { route: "mccResults.alert" });
  }
}

/** The worker found a result PDF: refresh the page, and tell the team once per PDF. */
export async function onDetected(year: number, round: string) {
  const r = await roundRow(year, round);
  const spec = roundByName(round);
  if (!r || !spec) return { ok: false, error: "unknown round" };
  refresh();
  // A final result after a provisional one: the bar already says the analysis is up — leave it.
  const [held] = rows<{ n: number }>(await db.execute(sql`SELECT COUNT(*)::int AS n FROM mcc_allotments WHERE year = ${year} AND round = ${round}`));
  if (!held?.n) await roundAlert(year, spec, "out");
  if (r.source_url && r.alerted_detected_url !== r.source_url) {
    await db.execute(sql`UPDATE mcc_round_results SET alerted_detected_url = ${r.source_url} WHERE year = ${year} AND round = ${round}`);
    await tellTeam(
      `📢 *MCC has published the NEET PG ${year} ${spec.label} result* (${r.kind ?? "result"})\n` +
        `${r.source_title ?? ""}\n${r.source_url}\n\n` +
        `The site is reading it now; the page fills itself in a few minutes:\n${SITE}${roundPath(year, spec.slug)}`,
    );
  }
  return { ok: true };
}

export async function onFailed(year: number, round: string) {
  const r = await roundRow(year, round);
  const spec = roundByName(round);
  if (!r || !spec) return { ok: false };
  refresh();
  await tellTeam(
    `⚠️ *NEET PG ${year} ${spec.label}:* the PDF MCC posted could not be read as a result (${r.source_title ?? "untitled"}).\n` +
      `${r.source_url ?? ""}\nThe page shows MCC's link meanwhile. Check Admin → MCC results.`,
  );
  return { ok: true };
}

interface Staged {
  rank: number;
  quota: string | null;
  institute: string | null;
  course: string | null;
  allotted_category: string | null;
  candidate_category: string | null;
  remarks: string | null;
}

/**
 * Staged rows → mcc_allotments for the round. `dryRun` does everything inside a transaction it then
 * rolls back, and returns how much of the round it could map — the test before a real result day.
 */
export async function ingestRound(year: number, round: string, opts: { dryRun?: boolean } = {}) {
  const spec = roundByName(round);
  if (!spec) throw new Error(`unknown round ${round}`);
  const meta = await roundRow(year, round);
  const staged = rows<Staged>(
    await db.execute(sql`SELECT rank, quota, institute, course, allotted_category, candidate_category, remarks
                           FROM mcc_allotments_staging WHERE year = ${year} AND round = ${round} AND institute IS NOT NULL AND institute <> ''`),
  );
  if (!staged.length) throw new Error("nothing staged");

  // Our courses, by name.
  const courseId = new Map(rows<{ id: number; name: string }>(await db.execute(sql`SELECT id, name FROM courses`)).map((c) => [c.name, c.id]));
  // How MCC's wording of a college was matched before — in earlier rounds (same PDFs, same wording)
  // and in the seat matrix — keyed on the whole name and on DNB or not (a hospital's DNB seats belong
  // to its DNB entry). Tested on 2025's round 1 with only 2024 and the 2026 matrix to go on: the
  // whole name places 95.7% of rows with no disagreement at all.
  const known = [
    ...rows<{ name: string; dnb: boolean; institute_id: number; n: number }>(
      await db.execute(sql`SELECT mcc_college_name AS name, (mcc_course ~* 'NBEMS|DNB|NBE') AS dnb, institute_id, COUNT(*)::int AS n
                             FROM mcc_allotments WHERE institute_id IS NOT NULL GROUP BY 1, 2, 3`),
    ),
    ...rows<{ name: string; dnb: boolean; institute_id: number; n: number }>(
      await db.execute(sql`SELECT mcc_college_name AS name, (seat_matrix = 'DNB') AS dnb, institute_id, COUNT(*)::int AS n
                             FROM mcc_seat_matrix WHERE institute_id IS NOT NULL GROUP BY 1, 2, 3`),
    ),
  ].sort((a, b) => a.n - b.n);
  const exact = new Map<string, number>();
  const firstIds = new Map<string, Set<number>>();
  for (const k of known) {
    exact.set(`${norm(k.name)}|${k.dnb}`, k.institute_id); // ascending count: the most common wins
    const f = `${firstPart(k.name)}|${k.dnb}`;
    firstIds.set(f, (firstIds.get(f) ?? new Set<number>()).add(k.institute_id));
  }
  // The fallback, on the name before its first comma, only when one college has that start — the
  // unguarded version put 84 rows at the wrong college ("Government Medical College" is dozens) —
  // and only when that college's state is named in MCC's wording: a chain hospital known only in
  // Hyderabad is not the one in Aurangabad.
  const stateOf = new Map(
    rows<{ id: number; state: string | null }>(
      await db.execute(sql`SELECT i.id, s.name AS state FROM institutes i LEFT JOIN states s ON s.id = i.state_id WHERE i.level = 'pg'`),
    ).map((r) => [r.id, r.state]),
  );
  const inState = (id: number, mccName: string) => {
    const st = stateOf.get(id);
    if (!st) return false;
    const words = norm(st).split(" ").filter((w) => w.length >= 4 && w !== "and");
    const hay = ` ${norm(mccName)} `;
    return words.length > 0 && words.every((w) => hay.includes(` ${w} `) || hay.includes(` ${w}`));
  };

  const stats = { rows: staged.length, institutes: 0, courses: 0, byExact: 0, byName: 0 };
  const out = staged.map((s) => {
    const course = s.course ?? "";
    const ours = course ? ourCourseFor(course) : null;
    const cid = ours ? courseId.get(ours) ?? null : null;
    if (cid) stats.courses++;
    const dnb = isDnb(course);
    const name = s.institute ?? "";
    let inst = exact.get(`${norm(name)}|${dnb}`) ?? null;
    let method: string | null = inst ? "earlier-round" : null;
    if (inst) stats.byExact++;
    else {
      const ids = firstIds.get(`${firstPart(name)}|${dnb}`);
      const only = ids && ids.size === 1 ? [...ids][0] : null;
      if (only && inState(only, name)) {
        inst = only;
        method = "name";
        stats.byName++;
      }
    }
    if (inst) stats.institutes++;
    return { s, cid, inst, method };
  });

  const sourceFile = meta?.source_url ? decodeURIComponent(meta.source_url.split("/").pop() ?? "") : null;
  const sourceTitle = meta?.source_title ?? `MCC PG Medical ${year} - ${round} result`;
  const run = async (tx: typeof db) => {
    await tx.execute(sql`DELETE FROM mcc_allotments WHERE year = ${year} AND round = ${round}`);
    for (let i = 0; i < out.length; i += 500) {
      const chunk = out.slice(i, i + 500);
      await tx.execute(sql`
        INSERT INTO mcc_allotments (year, round, rank, quota, mcc_college_name, state, mcc_course, course_id,
                                    allotted_category, candidate_category, status, institute_id, match_confidence, match_method,
                                    source_title, source_file)
        SELECT v.year, v.round, v.rank, v.quota, v.name, s.name, v.course, v.course_id, v.acat, v.ccat, v.status,
               v.inst, NULL, v.method, v.title, v.file
          FROM (VALUES ${sql.join(
            chunk.map(
              (r) =>
                sql`(${year}::smallint, ${round}::text, ${r.s.rank}::int, ${r.s.quota}::text, ${r.s.institute}::text, ${r.s.course}::text,
                     ${r.cid}::int, ${shortCategory(r.s.allotted_category)}::text, ${shortCategory(r.s.candidate_category)}::text, ${r.s.remarks}::text,
                     ${r.inst}::int, ${r.method}::text, ${sourceTitle}::text, ${sourceFile}::text)`,
            ),
            sql`, `,
          )}) AS v(year, round, rank, quota, name, course, course_id, acat, ccat, status, inst, method, title, file)
          LEFT JOIN institutes i ON i.id = v.inst
          LEFT JOIN states s ON s.id = i.state_id`);
    }
  };

  if (opts.dryRun) {
    try {
      await db.transaction(async (tx) => {
        await run(tx as unknown as typeof db);
        throw new Error("__rollback__");
      });
    } catch (e) {
      if (!(e instanceof Error && e.message === "__rollback__")) throw e;
    }
    return { dryRun: true, ...stats };
  }

  await db.transaction(async (tx) => {
    await run(tx as unknown as typeof db);
    await tx.execute(sql`
      UPDATE mcc_round_results
         SET status = 'live', rows = ${stats.rows}, published_at = COALESCE(published_at, now()), updated_at = now(), error = NULL
       WHERE year = ${year} AND round = ${round}`);
    await tx.execute(sql`DELETE FROM mcc_allotments_staging WHERE year = ${year} AND round = ${round}`);
  });
  refresh();
  await roundAlert(year, spec, "live", stats.rows);

  const path = roundPath(year, spec.slug);
  const ping = await pingIndexNow([path, `/neet-pg-counselling/${year}`, "/neet-pg-seat-matrix"]);
  const after = await roundRow(year, round);
  if (after?.source_url && after.alerted_live_url !== after.source_url) {
    await db.execute(sql`UPDATE mcc_round_results SET alerted_live_url = ${after.source_url} WHERE year = ${year} AND round = ${round}`);
    const summary = await getRoundResult(year, round, { fresh: true });
    await tellTeam(
      `✅ *NEET PG ${year} ${spec.label} result page is live*\n` +
        `${stats.rows.toLocaleString("en-IN")} seats allotted` +
        (summary && summary.upgraded ? ` (${summary.upgraded.toLocaleString("en-IN")} upgrades)` : "") +
        `\n${SITE}${path}\n\nShare it on Telegram and in the WhatsApp groups.`,
    );
  }
  return { dryRun: false, ...stats, indexNow: ping.status ?? null };
}

/* ---------------------------------------------------------------- reading */

export interface RoundState {
  year: number;
  round: string;
  status: "pending" | "detected" | "live" | "failed";
  /** Of the result the page shows: 'final' | 'provisional' | 'result'. */
  kind: string | null;
  /** Live, and MCC has posted a newer PDF for the round that is being read now (a final after a provisional). */
  updating: boolean;
  sourceTitle: string | null;
  sourceUrl: string | null;
  detectedAt: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
}

const kindOf = (title: string | null) => (!title ? null : /final/i.test(title) ? "final" : /provisional/i.test(title) ? "provisional" : "result");

/** Where a round stands: no PDF yet, PDF seen and being read, live, or unreadable. */
export const getRoundState = (year: number, round: string) =>
  unstable_cache(
    async (): Promise<RoundState> => {
      try {
        const [r] = rows<{ status: string; kind: string | null; source_title: string | null; source_url: string | null; detected_at: string | null; published_at: string | null; updated_at: string | null }>(
          await db.execute(sql`SELECT status, kind, source_title, source_url, to_json(detected_at)#>>'{}' AS detected_at, to_json(published_at)#>>'{}' AS published_at, to_json(updated_at)#>>'{}' AS updated_at
                                 FROM mcc_round_results WHERE year = ${year} AND round = ${round}`),
        );
        const [have] = rows<{ n: number; title: string | null; file: string | null }>(
          await db.execute(sql`SELECT COUNT(*)::int AS n, MAX(source_title) AS title, MAX(source_file) AS file FROM mcc_allotments WHERE year = ${year} AND round = ${round}`),
        );
        const live = (have?.n ?? 0) > 0;
        const status: RoundState["status"] = live ? "live" : !r ? "pending" : r.status === "parse_failed" ? "failed" : "detected";
        // Live rows came from the PDF named in their own source_title; a row still being read is a newer one.
        const updating = live && !!r && r.status !== "live" && r.status !== "parse_failed";
        return {
          year,
          round,
          status,
          kind: live ? kindOf(have?.title ?? null) ?? "result" : r?.kind ?? null,
          updating,
          sourceTitle: live && !updating ? r?.source_title ?? have?.title ?? null : r?.source_title ?? null,
          sourceUrl: r?.source_url ?? null,
          detectedAt: r?.detected_at ?? null,
          publishedAt: r?.published_at ?? null,
          updatedAt: r?.updated_at ?? null,
        };
      } catch (error) {
        logError(error, { route: `mccResults:state:${year}:${round}` });
        return { year, round, status: "pending", kind: null, updating: false, sourceTitle: null, sourceUrl: null, detectedAt: null, publishedAt: null, updatedAt: null };
      }
    },
    ["mcc-round-state-v2", String(year), round],
    { revalidate: 60, tags: ["mcc-results"] },
  )();

export interface RoundResult {
  year: number;
  round: string;
  total: number;
  fresh: number;
  upgraded: number;
  byQuota: { quota: string; seats: number }[];
  byCategory: { category: string; seats: number }[];
  byProgramme: { programme: string; seats: number }[];
  byState: { state: string; seats: number }[];
  /** Per branch: seats allotted, colleges, and the last All India open rank where 3+ colleges stand behind it. */
  branches: { course: string; slug: string; seats: number; colleges: number; aiqOpenLast: number | null }[];
  /** Per seat family, per branch, the last rank admitted in each category (3+ colleges only). */
  cuts: Record<CutQuota, BranchCut[]>;
  aiqOpenLast: number | null;
  aiqOpenColleges: number;
  /**
   * Colleges per seat family. There is no total across families on purpose: a hospital is listed
   * twice in MCC's data (its MD/MS entry and its DNB entry), so a sum would count it twice.
   */
  colleges: Record<CutQuota, number>;
  sourceTitle: string | null;
}

async function loadResult(year: number, round: string): Promise<RoundResult | null> {
  const r = rows<{ quota: string | null; acat: string | null; status: string | null; course: string | null; mcc_course: string | null; state: string | null; inst: string; rank: number; title: string | null }>(
    await db.execute(sql`
      SELECT a.quota, a.allotted_category AS acat, a.status, c.name AS course, a.mcc_course, a.state,
             COALESCE(a.institute_id::text, a.mcc_college_name) AS inst, a.rank, a.source_title AS title
        FROM mcc_allotments a LEFT JOIN courses c ON c.id = a.course_id
       WHERE a.year = ${year} AND a.round = ${round}`),
  ).map((x) => ({ ...x, acat: shortCategory(x.acat) }));
  if (!r.length) return null;
  const cutMap = new Map<string, { seats: number; colleges: Set<string>; byCat: Map<CutCat, { last: number; colleges: Set<string> }> }>();
  for (const x of r) {
    const fam = quotaFamily(x.quota);
    if (!fam || !x.course) continue;
    const key = `${fam}|${x.course}`;
    const b = cutMap.get(key) ?? { seats: 0, colleges: new Set<string>(), byCat: new Map() };
    b.seats++;
    b.colleges.add(x.inst);
    const cat = CUT_CATS.find((c) => c === x.acat);
    if (cat) {
      const c = b.byCat.get(cat) ?? { last: 0, colleges: new Set<string>() };
      c.last = Math.max(c.last, x.rank);
      c.colleges.add(x.inst);
      b.byCat.set(cat, c);
    }
    cutMap.set(key, b);
  }
  const cuts: Record<CutQuota, BranchCut[]> = { aiq: [], deemed: [], dnb: [] };
  for (const [key, b] of cutMap) {
    const [fam, course] = [key.slice(0, key.indexOf("|")) as CutQuota, key.slice(key.indexOf("|") + 1)];
    const last: Partial<Record<CutCat, number>> = {};
    for (const [cat, c] of b.byCat) if (c.colleges.size >= MIN_GROUP && c.last) last[cat] = c.last;
    cuts[fam].push({ course, slug: branchSlug(course), seats: b.seats, colleges: b.colleges.size, last });
  }
  for (const k of Object.keys(cuts) as CutQuota[]) cuts[k].sort((a, b) => b.seats - a.seats || a.course.localeCompare(b.course));
  const count = (key: (x: (typeof r)[number]) => string | null) => {
    const m = new Map<string, number>();
    for (const x of r) {
      const k = key(x);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const isAiqOpen = (x: (typeof r)[number]) => x.quota === "All India" && x.acat === "Open";
  const branch = new Map<string, { seats: number; colleges: Set<string>; aiqColleges: Set<string>; aiqLast: number }>();
  for (const x of r) {
    if (!x.course) continue;
    const b = branch.get(x.course) ?? { seats: 0, colleges: new Set<string>(), aiqColleges: new Set<string>(), aiqLast: 0 };
    b.seats++;
    b.colleges.add(x.inst);
    if (isAiqOpen(x)) {
      b.aiqColleges.add(x.inst);
      b.aiqLast = Math.max(b.aiqLast, x.rank);
    }
    branch.set(x.course, b);
  }
  const aiqOpen = r.filter(isAiqOpen);
  const aiqColleges = new Set(aiqOpen.map((x) => x.inst));
  const upgraded = r.filter((x) => /^upgraded/i.test(x.status ?? "")).length;
  return {
    year,
    round,
    total: r.length,
    upgraded,
    fresh: r.length - upgraded,
    byQuota: count((x) => x.quota).map(([quota, seats]) => ({ quota, seats })),
    byCategory: count((x) => x.acat).map(([category, seats]) => ({ category, seats })),
    byProgramme: count((x) => (x.course ? programmeLabel(x.course) : null)).map(([programme, seats]) => ({ programme, seats })),
    byState: count((x) => x.state).map(([state, seats]) => ({ state, seats })),
    branches: [...branch]
      .map(([course, b]) => ({
        course,
        slug: branchSlug(course),
        seats: b.seats,
        colleges: b.colleges.size,
        aiqOpenLast: b.aiqColleges.size >= MIN_GROUP && b.aiqLast ? b.aiqLast : null,
      }))
      .sort((a, b) => b.seats - a.seats || a.course.localeCompare(b.course)),
    cuts,
    aiqOpenLast: aiqColleges.size >= MIN_GROUP && aiqOpen.length ? aiqOpen.reduce((m, x) => Math.max(m, x.rank), 0) : null,
    aiqOpenColleges: aiqColleges.size,
    colleges: {
      aiq: new Set(r.filter((x) => quotaFamily(x.quota) === "aiq").map((x) => x.inst)).size,
      deemed: new Set(r.filter((x) => quotaFamily(x.quota) === "deemed").map((x) => x.inst)).size,
      dnb: new Set(r.filter((x) => quotaFamily(x.quota) === "dnb").map((x) => x.inst)).size,
    },
    sourceTitle: r[0]?.title ?? null,
  };
}

export function getRoundResult(year: number, round: string, opts: { fresh?: boolean } = {}) {
  if (opts.fresh) return loadResult(year, round).catch((error) => (logError(error, { route: "mccResults:result" }), null));
  return unstable_cache(
    () => loadResult(year, round).catch((error) => (logError(error, { route: "mccResults:result" }), null)),
    ["mcc-round-result-v4", String(year), round],
    { revalidate: 300, tags: ["mcc-results"] },
  )();
}

/** The counselling now running: the year of MCC's latest seat matrix. */
export const getCounsellingYear = unstable_cache(
  async (): Promise<number> => {
    try {
      const [r] = rows<{ y: number | null }>(await db.execute(sql`SELECT MAX(year)::int AS y FROM mcc_seat_matrix`));
      return r?.y ? Number(r.y) : new Date().getFullYear();
    } catch (error) {
      logError(error, { route: "mccResults:counsellingYear" });
      return new Date().getFullYear();
    }
  },
  ["mcc-counselling-year-v1"],
  { revalidate: 3600, tags: ["mcc"] },
);

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * A round's dates from the admin's schedule ("12 – 24 Oct", joining by "2 Nov"). The result is
 * expected at the window's last date — the same reading the worker uses to decide when to check
 * MCC every two minutes. A counselling that starts in the autumn ends in the new year.
 */
export function roundSchedule(
  spec: RoundSpec,
  year: number,
  schedule: { round: string; aiq: string; aiqJoinBy: string }[],
): { window: string; joinBy: string | null; expected: Date | null } | null {
  if (!spec.schedule) return null;
  const row = schedule.find((s) => s.round.trim().toLowerCase() === spec.schedule);
  if (!row || !row.aiq || row.aiq === "—") return null;
  const found = [...row.aiq.matchAll(/(\d{1,2})\s+([A-Za-z]{3})/g)];
  const last = found[found.length - 1];
  const month = last ? MONTHS.indexOf(last[2].toLowerCase()) : -1;
  const expected = last && month >= 0 ? new Date(Date.UTC(month < 6 ? year + 1 : year, month, Number(last[1]))) : null;
  return { window: row.aiq, joinBy: row.aiqJoinBy && row.aiqJoinBy !== "—" ? row.aiqJoinBy : null, expected };
}

/** The round the Telegram invite talks about, and the words for it. */
export interface TelegramCue {
  year: number;
  /** "Round 1" … "Stray round" — short enough for the alerts bar. */
  label: string;
  /** "R1" … "Stray" — the alerts bar on a phone. */
  short: string;
  path: string;
}
const CUE_NAMES: Record<string, { label: string; short: string }> = {
  "Round 1": { label: "Round 1", short: "R1" },
  "Round 2": { label: "Round 2", short: "R2" },
  "Round 3": { label: "Round 3", short: "R3" },
  "Stray Vacancy Round": { label: "Stray round", short: "Stray" },
};
export const cueFor = (year: number, spec: RoundSpec): TelegramCue => ({
  year,
  ...(CUE_NAMES[spec.round] ?? { label: spec.label, short: spec.label }),
  path: roundPath(year, spec.slug),
});

/**
 * The round a Telegram invite is about (owner, 2026-10-22: "Round 2 ka result alert Telegram par turant
 * paayein"): in the counselling now running, the first of rounds 1–4 whose result is not live yet. Round 1
 * from a week before MCC's expected date in the admin's schedule (or once its PDF is out) until a month
 * after; every later round at once, because the round before it is live. Null between counsellings, and
 * the invites say their everyday words. The alerts bar, the pop-up and the round pages' box read it.
 */
export const getTelegramCue = unstable_cache(
  async (): Promise<TelegramCue | null> => {
    try {
      const year = await getCounsellingYear();
      const specs = ROUNDS.filter((r) => r.order <= 4);
      const states = await Promise.all(specs.map((r) => getRoundState(year, r.round)));
      const i = states.findIndex((s) => s.status !== "live");
      if (i < 0) return null;
      if (i === 0 && states[0].status === "pending") {
        const when = roundSchedule(specs[0], year, (await getPgProcessContent()).schedule);
        const at = when?.expected?.getTime();
        if (!at || Date.now() < at - 7 * DAY_MS || Date.now() > at + 30 * DAY_MS) return null;
      }
      return cueFor(year, specs[i]);
    } catch (error) {
      logError(error, { route: "mccResults:telegramCue" });
      return null;
    }
  },
  ["mcc-telegram-cue-v1"],
  { revalidate: 300, tags: ["mcc-results"] },
);

/** Every year we hold any round for, newest first, with each round's state — for the hub and the sitemap. */
export const getCounsellingYears = unstable_cache(
  async (): Promise<number[]> => {
    try {
      const r = rows<{ year: number }>(
        await db.execute(sql`SELECT DISTINCT year FROM mcc_allotments UNION SELECT DISTINCT year FROM mcc_round_results UNION SELECT MAX(year) FROM mcc_seat_matrix ORDER BY 1 DESC`),
      );
      return r.map((x) => Number(x.year)).filter((y) => y > 2000);
    } catch (error) {
      logError(error, { route: "mccResults:years" });
      return [];
    }
  },
  ["mcc-counselling-years-v1"],
  { revalidate: 3600, tags: ["mcc-results"] },
);

/** The latest worker heartbeat or event — "last checked MCC at …". */
export const getWorkerLast = unstable_cache(
  async (): Promise<{ at: string; level: string; message: string } | null> => {
    try {
      const [r] = rows<{ at: string; level: string; message: string }>(
        await db.execute(sql`SELECT to_json(at)#>>'{}' AS at, level, message FROM mcc_worker_log WHERE level = 'check' ORDER BY at DESC LIMIT 1`),
      );
      return r ?? null;
    } catch {
      return null;
    }
  },
  ["mcc-worker-last-v2"],
  { revalidate: 60, tags: ["mcc-results"] },
);
