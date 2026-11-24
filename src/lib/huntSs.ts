/**
 * "dm cardiology seats in india", "interventional radiology seats in india", "mch neurosurgery seats" (2026-11-24):
 * about 500 impressions in twelve days on the /neet-ss/<course> pages at position 5–9, and no builder answered them —
 * `SUPER_SPECIALTY` (lib/huntBranch.ts) rightly stops the MD/MS builders, and nothing took their place.
 *
 * The answer: NMC's approved seats for the DM / MCh course (its college-and-course register, the same source as the MD/MS
 * seat answer) and the seats MCC's NEET SS round 1 allotted in the latest year we hold (`ss_allotments`). A DrNB course is
 * National Board's and on no NMC register, so it is answered from MCC's allotments alone. Seats and colleges only — no rank.
 * Answered only when every word the search uses for the course is in one course's name; never when it names a state, a
 * college or anything else (NMC's DM/MCh seats are not split by state here).
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getSsCourses } from "@/lib/ssQueries";
import type { Draft } from "@/lib/huntAnswers";

const n = (v: number) => Math.round(v).toLocaleString("en-IN");

/** Words as both sides spell them: anaesthesia/anesthesia/anaethesia, paediatric/pediatric, haematology/hematology… */
export const ssNorm = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/m\.\s?ch\.?|\bmch\b/g, " mch ")
    .replace(/\bd\.\s?m\.?|\bdm\b/g, " dm ")
    .replace(/[^a-z]+/g, " ")
    .replace(/\bana?e?s?thes?i?a\b/g, "anaesthesia")
    .replace(/\bp(a)?ediatrics?\b/g, "paediatric")
    .replace(/\bh(a)?ematology\b/g, "haematology")
    .replace(/\bgyn(a)?ecolog\w*/g, "gynaecology")
    .replace(/\bneuro surgery\b/g, "neurosurgery")
    .replace(/\bneuro radiology\b/g, "neuroradiology")
    .replace(/\bonco pathology\b/g, "oncopathology")
    .replace(/\bdiseases\b/g, "disease")
    .replace(/\bbilliary\b/g, "biliary")
    .replace(/\bhepato pancreatto\b/g, "hepatopancreatto")
    .replace(/\s+/g, " ")
    .trim()} `;

const DEGREE = new Set(["dm", "mch", "drnb"]);
const FILLER = new Set(["and", "the", "with", "direct", "years", "year"]);
/** Words a search adds around the course's name. */
const QUERY_FILLER = new Set([
  ...FILLER, "seat", "seats", "in", "india", "indian", "how", "many", "total", "number", "no", "of", "for", "neet", "ss",
  "super", "speciality", "specialty", "superspeciality", "course", "courses", "all", "list", "available", "is", "are", "what",
  "count", "intake",
]);

/** What a course name says once its degree is gone: "DM Clinical Immunology and Rheumatology" → its words. */
const core = (course: string) =>
  ssNorm(course)
    .trim()
    .split(" ")
    .filter((w) => w.length >= 3 && !DEGREE.has(w) && !FILLER.has(w));

/** NMC's DM / MCh seats, one row per college × course, with each name alternative's words. */
const nmcSsRows = unstable_cache(
  async (): Promise<{ keys: string[]; type: "dm" | "mch"; college: string; seats: number }[]> => {
    const r = (await db.execute(sql`
      SELECT course_type AS type, course_name AS name, college_code AS college, SUM(approved_seat)::int AS seats
        FROM nmc_courses WHERE course_type IN ('DM', 'M.Ch.') AND approved_seat > 0
       GROUP BY course_type, course_name, college_code`)) as unknown as { type: string; name: string; college: string; seats: number }[];
    return r.map((x) => ({
      type: x.type === "DM" ? "dm" : "mch",
      college: String(x.college),
      seats: Number(x.seats),
      keys: String(x.name)
        .replace(/^(d\.\s?m\.|m\.\s?ch\.)\s*/i, "")
        .replace(/\([^)]*\)/g, " ")
        .split("/")
        .map((alt) => core(alt).join(" "))
        .filter(Boolean),
    }));
  },
  ["hunt-nmc-ss-rows-v1"],
  { revalidate: 86_400, tags: ["nmc"] },
);

export async function ssSeats(q: string): Promise<Draft | null> {
  if (!/\bseats?\b/i.test(q) || /cut ?off|closing|rank|fee|stipend|bond|salary/i.test(q)) return null;
  const s = ssNorm(q);
  const asked = s.trim().split(" ").filter((w) => w.length >= 3 && !DEGREE.has(w) && !QUERY_FILLER.has(w));
  if (!asked.length) return null;
  const wantDrnb = / drnb /.test(s);
  const wantMch = / mch /.test(s);
  const wantDm = / dm /.test(s);
  const { year, courses } = await getSsCourses().catch(() => ({ year: null as number | null, prevYear: null, courses: [] as Awaited<ReturnType<typeof getSsCourses>>["courses"] }));
  if (!year || !courses.length) return null;
  const degreeOf = (c: string) => (/^drnb/i.test(c) ? "drnb" : /^mch/i.test(c) ? "mch" : "dm");
  // Every course word the search uses must be in the course's name; the course with the fewest words beyond them wins
  // ("dm cardiology" is DM Cardiology, not DM Paediatric Cardiology). DM/MCh before DrNB when the search names no degree.
  const fits = courses
    .map((c) => ({ c, words: core(c.course), degree: degreeOf(c.course) }))
    .filter((x) => asked.every((w) => x.words.includes(w)))
    .filter((x) => (wantDrnb ? x.degree === "drnb" : wantMch ? x.degree === "mch" : wantDm ? x.degree === "dm" : x.degree !== "drnb"));
  if (!fits.length) return null;
  fits.sort((a, b) => a.words.length - b.words.length);
  const best = fits[0];
  // Two courses equally close is a guess: no answer.
  if (fits[1] && fits[1].words.length === best.words.length && fits[1].c.slug !== best.c.slug) return null;
  const course = best.c;

  let nmc: { seats: number; colleges: number } | null = null;
  if (best.degree !== "drnb") {
    const key = best.words.join(" ");
    const rows = (await nmcSsRows().catch((): Awaited<ReturnType<typeof nmcSsRows>> => [])).filter((r) => r.type === best.degree && r.keys.includes(key));
    if (rows.length) nmc = { seats: rows.reduce((t, r) => t + r.seats, 0), colleges: new Set(rows.map((r) => r.college)).size };
  }

  const points: string[] = [];
  // Round 1's seats and the year's institutes are different counts (an institute can first appear in a later round): said apart.
  const mcc = course.seats ? `In NEET SS ${year}, MCC's round 1 allotted ${n(course.seats)} ${course.course} seats; ${n(course.colleges)} ${course.colleges === 1 ? "institute" : "institutes"} had an allotment in it across the year's rounds.` : null;
  if (nmc && mcc) points.push(mcc);
  if (best.degree !== "drnb") points.push(`DrNB seats in the same speciality are National Board seats in accredited hospitals, counted apart from NMC's ${best.degree === "mch" ? "MCh" : "DM"} seats.`);
  points.push("MCC's NEET SS counselling fills these seats; each NEET SS group has its own merit list, so a rank is read within its group.");

  const lead = nmc
    ? `India has ${n(nmc.seats)} ${course.course} seats a year in ${n(nmc.colleges)} ${nmc.colleges === 1 ? "college" : "colleges"}, as approved on the National Medical Commission's register.`
    : mcc;
  if (!lead) return null;
  return {
    page: `/neet-ss/${course.slug}`,
    kind: `ss-seats:${course.slug}`,
    lead,
    points,
    source: nmc
      ? `The National Medical Commission's college-and-course register; MCC's NEET SS ${year} allotment results.`
      : `MCC's NEET SS ${year} allotment results.`,
    what: `${course.course} seats and cut off page`,
  };
}
