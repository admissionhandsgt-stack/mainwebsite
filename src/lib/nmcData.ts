/**
 * What the National Medical Commission's register says about one of our
 * colleges (2026-10-18) — read side of lib/nmcSync.ts.
 *
 * These are the regulator's own figures: approved seats per course, ownership
 * as NMC records it, university, founding year, recognition status. They fill
 * what the counselling extract never had (UG ownership, university, intake) and
 * replace a seat count derived from counselling rows with the approved intake.
 * A college we could not match to NMC simply has no record — never a guess.
 */

import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { logError } from "@/lib/logger";
import { stateKey } from "@/lib/nmcSync";
import type { Level } from "@/lib/collegeQueries";

export interface NmcCourse {
  name: string;
  type: string;
  seats: number | null;
  previous: number | null;
}

export interface NmcFacts {
  code: string;
  name: string;
  state: string | null;
  university: string | null;
  /** As NMC writes it: "Government", "Private", "Trust". */
  management: string | null;
  inceptionYear: number | null;
  mbbsSeats: number | null;
  mbbsPrevious: number | null;
  recognition: string | null;
  /** MD, MS and Diploma courses, most seats first. */
  pg: NmcCourse[];
  /** DM and M.Ch. */
  ss: NmcCourse[];
  pgSeats: number;
  ssSeats: number;
  /** NMC's own last-updated date across the college's rows, and when we read it. */
  updated: string | null;
  syncedAt: string | null;
}

const rowsOf = <T,>(r: unknown) => r as unknown as T[];

async function load(slug: string, level: Level): Promise<NmcFacts | null> {
  try {
    const r = rowsOf<Record<string, unknown>>(
      await db.execute(sql`
        SELECT c.college_code, c.college_name, c.state_name, c.university_name, c.management_type,
               c.inception_year, c.course_name, c.course_type, c.approved_seat, c.previous_approved_seat,
               c.recognition_status, c.nmc_updated::text AS nmc_updated, c.synced_at::text AS synced_at
          FROM institutes i
          JOIN nmc_institutes m ON m.institute_id = i.id
          JOIN nmc_courses c ON c.college_code = m.college_code
         WHERE i.slug = ${slug} AND i.level = ${level}
      `),
    );
    if (!r.length) return null;
    const first = r[0];
    const mbbs = r.find((x) => x.course_type === "M.B.B.S.");
    const course = (x: Record<string, unknown>): NmcCourse => ({
      name: String(x.course_name),
      type: String(x.course_type ?? ""),
      seats: x.approved_seat == null ? null : Number(x.approved_seat),
      previous: x.previous_approved_seat == null ? null : Number(x.previous_approved_seat),
    });
    const bySeats = (a: NmcCourse, b: NmcCourse) => (b.seats ?? 0) - (a.seats ?? 0) || a.name.localeCompare(b.name);
    const pg = r.filter((x) => ["MD", "MS", "Diploma"].includes(String(x.course_type))).map(course).sort(bySeats);
    const ss = r.filter((x) => ["DM", "M.Ch."].includes(String(x.course_type))).map(course).sort(bySeats);
    const max = (k: string) => r.reduce<string | null>((m, x) => (x[k] && (!m || String(x[k]) > m) ? String(x[k]) : m), null);
    return {
      code: String(first.college_code),
      name: String(first.college_name),
      state: (first.state_name as string) ?? null,
      university: (first.university_name as string) ?? null,
      management: (first.management_type as string) ?? null,
      inceptionYear: first.inception_year == null ? null : Number(first.inception_year),
      mbbsSeats: mbbs?.approved_seat == null ? null : Number(mbbs.approved_seat),
      mbbsPrevious: mbbs?.previous_approved_seat == null ? null : Number(mbbs.previous_approved_seat),
      recognition: (mbbs?.recognition_status as string) ?? null,
      pg,
      ss,
      pgSeats: pg.reduce((a, c) => a + (c.seats ?? 0), 0),
      ssSeats: ss.reduce((a, c) => a + (c.seats ?? 0), 0),
      updated: max("nmc_updated"),
      syncedAt: max("synced_at"),
    };
  } catch (error) {
    // Before migration 0035 the tables do not exist; a page without the record is still a page.
    logError(error, { route: `nmcData:${level}:${slug}` });
    return null;
  }
}

export const getNmcFacts = (slug: string, level: Level) =>
  unstable_cache(() => load(slug, level), ["nmc-facts-v1", level, slug], { revalidate: 86400, tags: ["nmc"] })();

/** NMC's ownership and approved MBBS seats for every matched UG college — for the directory's badges. */
export const getNmcUgIndex = unstable_cache(
  async (): Promise<Record<string, { management: string | null; seats: number | null }>> => {
    try {
      const r = rowsOf<{ slug: string; management: string | null; seats: number | null }>(
        await db.execute(sql`
          SELECT i.slug, c.management_type AS management, c.approved_seat AS seats
            FROM institutes i
            JOIN nmc_institutes m ON m.institute_id = i.id
            JOIN nmc_courses c ON c.college_code = m.college_code AND c.course_type = 'M.B.B.S.'
           WHERE i.level = 'ug'
        `),
      );
      return Object.fromEntries(r.map((x) => [x.slug, { management: x.management, seats: x.seats == null ? null : Number(x.seats) }]));
    } catch (error) {
      logError(error, { route: "nmcData:ugIndex" });
      return {};
    }
  },
  ["nmc-ug-index-v1"],
  { revalidate: 86400, tags: ["nmc"] },
);

/**
 * NMC's approved MD/MS seats for one of our branch names, across India — "md nuclear medicine seats in india" is how
 * a branch is searched (Search Console, Oct–Nov 2026: 4,365 impressions for "<branch> seats in india"). NMC names a
 * course with its alternates ("M.D. Radio-diagnosis /Radiology"), so every alternate is a key; ours may carry one too
 * ("MD Aviation Medicine/Aerospace Medicine"). MD/MS only: NMC's diplomas are named too differently to match safely.
 */
const nmcKey = (s: string) =>
  s.toLowerCase().replace(/m\.\s?d\.?/g, "md").replace(/m\.\s?s\.?/g, "ms").replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const NMC_ALIAS: Record<string, string> = { mdlabmedicine: "mdlaboratorymedicine" };

const loadNmcBranchSeats = unstable_cache(
  async (): Promise<Record<string, { seats: number; colleges: number }>> => {
    try {
      const r = rowsOf<{ type: string; name: string; seats: number; colleges: number }>(
        await db.execute(sql`
          SELECT course_type AS type, course_name AS name, SUM(approved_seat)::int AS seats,
                 COUNT(DISTINCT college_code)::int AS colleges
            FROM nmc_courses WHERE course_type IN ('MD', 'MS') AND approved_seat > 0
           GROUP BY course_type, course_name`),
      );
      const out: Record<string, { seats: number; colleges: number }> = {};
      for (const x of r) {
        const prefix = x.type === "MS" ? "MS " : "MD ";
        const parts = String(x.name).replace(/^M\.\s?[DS]\.?\s*-?\s*/i, "").split("/").map((p) => p.trim()).filter(Boolean);
        for (const p of [String(x.name), ...parts.map((p) => prefix + p)]) {
          const k = nmcKey(p);
          if (!out[k]) out[k] = { seats: Number(x.seats), colleges: Number(x.colleges) };
        }
      }
      return out;
    } catch (error) {
      logError(error, { route: "nmcData:branchSeats" });
      return {};
    }
  },
  ["nmc-branch-seats-v1"],
  { revalidate: 86400, tags: ["nmc"] },
);

/** NMC's seats for an MD/MS branch name of ours, or null when NMC's register has no such course. */
export async function getNmcBranchSeats(name: string): Promise<{ seats: number; colleges: number } | null> {
  if (!/^(MD|MS)\s/.test(name)) return null;
  const all = await loadNmcBranchSeats();
  for (const variant of [name, ...name.split("/").slice(0, 1)]) {
    const k = nmcKey(variant);
    const hit = all[NMC_ALIAS[k] ?? k];
    if (hit) return hit;
  }
  return null;
}

/** "29 September 2026". */
export const nmcDate = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null;

/**
 * NMC's PG seats in one state (2026-11-10): "how many pg seats in maharashtra / andhra pradesh / kerala" sat at position
 * 8–10 with no clicks while the PG state page never said the number. MD, MS and Diploma seats, government against
 * private (NMC files deemed universities as private), and how many colleges hold them. Matched by `stateKey`, which folds
 * the two spellings of a state.
 */
export interface NmcStatePg {
  md: number;
  ms: number;
  diploma: number;
  govt: number;
  colleges: number;
  govtColleges: number;
}
const loadNmcPgByState = unstable_cache(
  async (): Promise<Record<string, NmcStatePg>> => {
    const rows = (await db.execute(sql`
      SELECT state_name AS s,
             COALESCE(SUM(approved_seat) FILTER (WHERE course_type = 'MD'), 0)::int AS md,
             COALESCE(SUM(approved_seat) FILTER (WHERE course_type = 'MS'), 0)::int AS ms,
             COALESCE(SUM(approved_seat) FILTER (WHERE course_type = 'Diploma'), 0)::int AS diploma,
             COALESCE(SUM(approved_seat) FILTER (WHERE management_type = 'Government'), 0)::int AS govt,
             COUNT(DISTINCT college_code)::int AS colleges,
             COUNT(DISTINCT college_code) FILTER (WHERE management_type = 'Government')::int AS govt_colleges
        FROM nmc_courses WHERE course_type IN ('MD', 'MS', 'Diploma') GROUP BY state_name`)) as unknown as {
      s: string; md: number; ms: number; diploma: number; govt: number; colleges: number; govt_colleges: number;
    }[];
    const out: Record<string, NmcStatePg> = {};
    for (const r of rows) {
      const k = stateKey(r.s);
      const prev = out[k];
      const add = { md: r.md, ms: r.ms, diploma: r.diploma, govt: r.govt, colleges: r.colleges, govtColleges: r.govt_colleges };
      out[k] = prev
        ? { md: prev.md + add.md, ms: prev.ms + add.ms, diploma: prev.diploma + add.diploma, govt: prev.govt + add.govt, colleges: prev.colleges + add.colleges, govtColleges: prev.govtColleges + add.govtColleges }
        : add;
    }
    return out;
  },
  ["nmc-pg-by-state-v1"],
  { revalidate: 86400, tags: ["nmc"] },
);

export async function getNmcPgForState(state: string): Promise<NmcStatePg | null> {
  try {
    return (await loadNmcPgByState())[stateKey(state)] ?? null;
  } catch (error) {
    logError(error, { route: "nmcData:pgByState" });
    return null;
  }
}
