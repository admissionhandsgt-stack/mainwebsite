/**
 * What a college page says about itself in one glance — the summary box under
 * the H1, the <title> and the meta description — built from the same numbers,
 * so the search snippet never states a figure the page does not show
 * (2026-10-17, after Search Console showed 0.5% CTR on MBBS college pages and
 * 1.4% on PG ones at an average position of 7–8).
 *
 * Every figure is optional: a number the page does not have is left out, never
 * guessed. Ranks appear only as the general-category band the page already
 * prints (lib/cutoffBands.ts) — never the rank behind it.
 */

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { collegeName, isDnbOnly } from "@/lib/collegeName";
import { generalBands } from "@/lib/cutoffBands";
import { approxFee } from "@/lib/chance";
import { clipMiddle, ugCourseLabel } from "@/lib/seoTitle";
import {
  getCollege,
  getCollegeCutoffs,
  getCollegeFees,
  type CollegeDetail,
  type CourseCutoff,
  type CollegeFee,
  type Level,
} from "@/lib/collegeQueries";
import { getUgCollegeExtras } from "@/lib/content";
import { getNmcFacts, type NmcFacts } from "@/lib/nmcData";

/** Google shows about 60 characters of a title. */
const TITLE = 62;
const DESCRIPTION = 158;

/* ------------------------------------------------------------- loading */

/** One load per request, shared by generateMetadata and the page. */
export const loadCollegePage = cache(async (slug: string, level: Level) => {
  const college = await getCollege(slug, level);
  if (!college) return null;
  const [cutoffs, fees, extras, index, nmc] = await Promise.all([
    getCollegeCutoffs(slug, level),
    getCollegeFees(slug, level),
    level === "ug" ? getUgCollegeExtras(slug) : Promise.resolve(null),
    nameIndex(level),
    getNmcFacts(slug, level),
  ]);
  return { college, cutoffs, fees, extras, nmc, summary: summarise(level, college, cutoffs, fees, extras, index, nmc) };
});

/**
 * How many colleges of a level share each short name + place. Two pages with
 * one title are a duplicate to Google: "Manipal Hospital, Bangalore" is three
 * hospitals, told apart by the locality the name also gives.
 */
const nameIndex = unstable_cache(
  async (level: Level): Promise<Record<string, number>> => {
    const r = (await db.execute(sql`SELECT name FROM institutes WHERE level = ${level} AND is_active = true`)) as unknown as {
      name: string;
    }[];
    const out: Record<string, number> = {};
    for (const { name } of r) {
      const c = collegeName(name);
      const k = `${c.short}|${c.place ?? ""}`.toLowerCase();
      out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  },
  ["college-name-index-v2"],
  { revalidate: 86400, tags: ["seat-data"] },
);

/* ------------------------------------------------------------- the facts */

type Extras = Awaited<ReturnType<typeof getUgCollegeExtras>>;

export interface CollegeSummary {
  short: string;
  place: string | null;
  /** The whole official name, tidied — shown under the H1 when it differs. */
  official: string;
  /** "MBBS", "BDS", "BAMS"…, "MD/MS", or "DNB" for a National Board-only hospital. */
  course: string;
  kind: "ug" | "pg" | "dnb";
  /** The latest year in this page's own counselling data. */
  year: number | null;
  /** General category, merit quota — the first row of the bands table. */
  band: { text: string; quota: string; course: string; year: number | null } | null;
  /** "≈ ₹5–10 L" — a bracket across this college's published fees. */
  fee: string | null;
  seats: number | null;
  branches: number | null;
  /** "Government", "Private" or "Deemed" — only when the data says so. */
  type: string | null;
  /** Seats, type and founding year are NMC's own (its register, lib/nmcData.ts). */
  fromNmc: boolean;
  /** Highest published first-year stipend, a month (PG). */
  stipend: number | null;
  established: number | null;
  beds: number | null;
}

const TYPE: Record<string, string> = { government: "Government", private: "Private", deemed: "Deemed" };
const NMC_TYPE: Record<string, string> = { government: "Government", private: "Private", trust: "Private (trust)" };
const plain = (s: string | null | undefined) => (s ? s.replace(/\*$/, "").replace(/\s*\/yr\*?$/, "").trim() : null);

function summarise(
  level: Level,
  college: CollegeDetail,
  cutoffs: CourseCutoff[],
  fees: CollegeFee[],
  extras: Extras,
  index: Record<string, number>,
  nmc: NmcFacts | null,
): CollegeSummary {
  const n = collegeName(college.name);
  let place = n.place;
  // Shared with another college of this level: name the locality too.
  if ((index[`${n.short}|${n.place ?? ""}`.toLowerCase()] ?? 0) > 1 && n.places.length > 1) place = n.places.slice(-2).join(", ");
  if (!place && level === "ug" && extras?.city && !n.short.toLowerCase().includes(extras.city.toLowerCase())) place = extras.city;
  if (!place && level === "pg") {
    const p = college.city ?? college.district;
    if (p && !n.short.toLowerCase().includes(p.toLowerCase())) place = p;
  }

  const courses = Array.from(new Set(cutoffs.map((c) => c.course)));
  const kind: CollegeSummary["kind"] = level === "ug" ? "ug" : isDnbOnly(courses) ? "dnb" : "pg";
  const course = level === "ug" ? ugCourseLabel(college.name, courses) : kind === "dnb" ? "DNB" : "MD/MS";

  const year = cutoffs.reduce<number | null>((m, c) => (c.latestYear != null && (m == null || c.latestYear > m) ? c.latestYear : m), null);
  const first = generalBands(cutoffs, 1)[0];
  const feeValues = fees.map((f) => f.feeInr).filter((v): v is number => v != null && v > 0);
  const stipend = fees.reduce<number | null>((m, f) => (f.stipendY1Inr != null && f.stipendY1Inr > 0 && (m == null || f.stipendY1Inr > m) ? f.stipendY1Inr : m), null);

  const curated =
    level === "ug"
      ? extras?.collegeType && /^(government|private|deemed)$/i.test(extras.collegeType)
        ? TYPE[extras.collegeType.toLowerCase()]
        : null
      : TYPE[college.ownership] ?? null;
  // NMC's register is the regulator's word on ownership, but it files a deemed university
  // under "Private" — a curated "Deemed" is the more exact of the two and is kept.
  const nmcType = nmc?.management ? NMC_TYPE[nmc.management.toLowerCase()] ?? null : null;
  const type = curated === "Deemed" ? curated : nmcType ?? curated;
  // Approved intake from NMC beats a count derived from counselling rows.
  const nmcSeats = level === "ug" ? nmc?.mbbsSeats ?? null : kind === "pg" && nmc?.pgSeats ? nmc.pgSeats : null;

  return {
    short: n.short,
    place,
    official: n.official,
    course,
    kind,
    year,
    band: first ? { text: plain(first.band)!, quota: first.quota, course: first.course, year: first.year } : null,
    fee: feeValues.length ? plain(approxFee(Math.min(...feeValues), Math.max(...feeValues))) : null,
    seats: nmcSeats ?? (level === "ug" ? extras?.intake ?? null : college.seatsTotal ?? null),
    branches: level === "pg" ? (nmcSeats && nmc ? nmc.pg.length : college.branchCount ?? null) : null,
    type,
    fromNmc: Boolean(nmc && (nmcSeats || nmcType)),
    stipend: level === "pg" ? stipend : null,
    established: nmc?.inceptionYear ?? college.establishedYear,
    beds: college.beds,
  };
}

/* ------------------------------------------------------------- words */

export const money = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};
const inr = (v: number) => v.toLocaleString("en-IN");
const fit = (max: number, candidates: (string | null | false | undefined)[]) => {
  const clean = candidates.filter((c): c is string => Boolean(c)).map((c) => c.replace(/\s+/g, " ").trim());
  return clean.find((c) => c.length <= max) ?? null;
};

/** "Madha Medical College, Chennai: MBBS Cutoff 2025, Fees & Seats". */
export function collegeTitle(s: CollegeSummary): string {
  const where = s.place ? `${s.short}, ${s.place}` : s.short;
  const y = s.year ? ` ${s.year}` : "";
  // "Cutoff" only when the page shows a cutoff band; otherwise what it does show.
  const tails =
    s.kind === "dnb"
      ? s.band
        ? [`: DNB Seats, Stipend & Cutoff${y}`, `: DNB Seats & Cutoff${y}`, `: DNB Cutoff${y}`]
        : s.stipend
          ? [`: DNB Seats & Stipend${y}`, `: DNB Seats${y}`]
          : [`: DNB Seats${y}`, ` DNB Seats`]
      : [
          // "sms jaipur pg stipend", "pg stipend in vmmc" (Search Console and autocomplete, Oct 2026): an MD/MS
          // page that publishes a stipend says so first, when it fits.
          ...(s.kind === "pg" && s.stipend
            ? s.band
              ? [`: ${s.course} Cutoff${y}, Fees, Stipend & Seats`, `: ${s.course} Cutoff${y}, Fees & Stipend`]
              : [`: ${s.course} Admission${y}, Fees & Stipend`, `: ${s.course} Fees & Stipend`]
            : []),
          ...(s.band
            ? [`: ${s.course} Cutoff${y}, Fees & Seats`, `: ${s.course} Cutoff${y} & Fees`, `: ${s.course} Cutoff${y}`]
            : [`: ${s.course} Admission${y}, Fees & Seats`, `: ${s.course} Fees & Seats`, `: ${s.course} Admission`]),
        ];
  const whole = fit(TITLE, [...tails.map((t) => where + t), ...(s.place ? tails.map((t) => s.short + t) : [])]);
  if (whole) return whole;
  // A long name is shortened from the middle, keeping its end and the city.
  const tail = tails[tails.length - 1];
  return `${clipMiddle(where, TITLE - tail.length)}${tail}`;
}

/** The meta description: the summary box in a sentence or two. */
export function collegeDescription(s: CollegeSummary): string {
  const where = s.place ? `${s.short}, ${s.place}` : s.short;
  const b = s.band;
  const by = b?.year ?? s.year;
  const fee = s.fee ? `Tuition ${s.fee} a year` : null;
  const type = s.type ? `${s.type.toLowerCase()}${s.kind === "dnb" ? "" : " college"}` : null;

  if (s.kind === "dnb") {
    const seats = s.seats ? `${inr(s.seats)} DNB seat${s.seats === 1 ? "" : "s"}${s.branches ? ` in ${s.branches} ${s.branches === 1 ? "speciality" : "specialities"}` : ""}` : null;
    const stipend = s.stipend ? `stipend ${money(s.stipend)} a month` : null;
    const cut = b ? `General-category cutoff${by ? ` ${by}` : ""}: ${b.text} (${b.course})` : null;
    const lead = [seats, stipend].filter(Boolean).join(", ");
    return (
      fit(DESCRIPTION, [
        `DNB at ${where}: ${lead}. ${cut ? cut + ". " : ""}For NEET PG doctors — check your chance free.`,
        `DNB at ${where}: ${lead}. ${cut ? cut + "." : ""}`,
        `DNB at ${where}: ${lead}.`,
        `DNB seats at ${s.short}: ${lead}.`,
      ]) ?? `DNB seats, stipend and cutoff at ${s.short}.`
    );
  }

  if (s.kind === "pg") {
    const cut = b ? `MD/MS cutoff${by ? ` ${by}` : ""}: ${b.text} (general, ${b.quota}, ${b.course})` : null;
    const cutShort = b ? `MD/MS cutoff${by ? ` ${by}` : ""}: ${b.text} (general, ${b.course})` : null;
    const seats = s.seats ? `${inr(s.seats)} PG seats${s.branches ? ` in ${s.branches} branches` : ""}` : null;
    const stipend = s.stipend ? `stipend ${money(s.stipend)} a month` : null;
    const facts = (...xs: (string | null)[]) => xs.filter(Boolean).join(", ");
    return (
      fit(DESCRIPTION, [
        `${where} — ${cut ?? "MD/MS admission"}. ${facts(seats, fee?.toLowerCase() ?? null, stipend, type)}.`,
        `${where} — ${cutShort ?? "MD/MS admission"}. ${facts(seats, fee?.toLowerCase() ?? null, stipend, type)}.`,
        `${where} — ${cutShort ?? "MD/MS admission"}. ${facts(seats, fee?.toLowerCase() ?? null, stipend)}.`,
        `${where} — ${cutShort ?? "MD/MS admission"}. ${facts(seats, stipend)}.`,
        `${s.short} — ${cutShort ?? "MD/MS admission"}. ${facts(seats)}.`,
        `${s.short}: MD/MS seats, fees and stipend.`,
      ]) ?? `MD/MS seats, fees and stipend at ${s.short}.`
    );
  }

  // "Private" alone reads oddly in a sentence; "Private quota" does not.
  const quota = b ? (/quota|\baiq\b/i.test(b.quota) ? b.quota : `${b.quota} quota`) : "";
  const cut = b ? `${s.course} cutoff${by ? ` ${by}` : ""}: ${b.text} (general, ${quota})` : null;
  const cutShort = b ? `${s.course} cutoff${by ? ` ${by}` : ""}: ${b.text} (general)` : null;
  const seats = s.seats ? `${inr(s.seats)} ${s.course} seats` : null;
  const tail = [seats, type].filter(Boolean).join(", ");
  const parts = (c: string | null, withTail = true, cta = true) =>
    [`${where} — ${c ?? `${s.course} admission`}.`, fee ? `${fee}.` : "", withTail && tail ? `${tail.charAt(0).toUpperCase()}${tail.slice(1)}.` : "", cta ? "Check your chance free." : ""]
      .filter(Boolean)
      .join(" ");
  return (
    fit(DESCRIPTION, [parts(cut), parts(cut, true, false), parts(cutShort, true, false), parts(cutShort, false, false), `${s.short} — ${cutShort ?? `${s.course} admission`}.`]) ??
    `${s.course} cutoff, fees and seats at ${s.short}.`
  );
}
