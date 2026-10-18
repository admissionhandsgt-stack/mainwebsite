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

/** "29 September 2026". */
export const nmcDate = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null;
