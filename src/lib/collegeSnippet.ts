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
import { approxFee, exactInr, feeKind, isYearlyFee } from "@/lib/chance";
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
import { getCollegeLiveBands, type LiveBands } from "@/lib/collegeLiveBands";

/** Google shows about 60 characters of a title. */
const TITLE = 62;
/** The most a title runs to rather than cutting a college's name in the middle. */
const LONG_TITLE = 80;
/** How long a title may run to keep both the city and the tail's words ("Fees", "Seats"). */
const CITY_TITLE = 72;
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
  // MCC's results for the counselling year in progress (PG), when that year is newer than the page's own data.
  const ownYear = cutoffs.reduce<number | null>((m, c) => (c.latestYear != null && (m == null || c.latestYear > m) ? c.latestYear : m), null);
  const liveAll = level === "pg" ? await getCollegeLiveBands(slug, cutoffs) : null;
  const live = liveAll && (ownYear == null || liveAll.year > ownYear) ? liveAll : null;
  return { college, cutoffs, fees, extras, nmc, live, summary: summarise(level, college, cutoffs, fees, extras, index, nmc, live) };
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

/**
 * The H1: the short name with its town when the name does not already say it (2026-11-09). "Government Medical
 * College" alone was the H1 of dozens of pages whose titles said "…, Firozabad"; the town is what tells them apart.
 */
export const collegeHeadline = (s: { short: string; place: string | null }) => {
  const flat = (x: string) => x.toLowerCase().replace(/[^a-z]/g, "");
  return s.place && !flat(s.short).includes(flat(s.place)) ? `${s.short}, ${s.place}` : s.short;
};

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
  /** General category, merit quota — the first row of the bands table (the year in progress's, when MCC has one). */
  band: { text: string; quota: string; course: string; year: number | null; rounds?: string } | null;
  /**
   * "≈ ₹5–10 L" — a bracket across this college's published fees; or, where 2026-27 notices print them (feeOfficial),
   * the exact lowest and highest yearly figures, "₹1,67,300 – ₹54,75,000".
   */
  fee: string | null;
  /** Set when `fee` is exact: the seats at each end (one row is one seat), and whether every figure is tuition alone. */
  feeOfficial: {
    lo: { quota: string; course: string; inr: number };
    hi: { quota: string; course: string; inr: number };
    tuition: boolean;
  } | null;
  seats: number | null;
  branches: number | null;
  /** "Government", "Private" or "Deemed" — only when the data says so. */
  type: string | null;
  /** Seats, type and founding year are NMC's own (its register, lib/nmcData.ts). */
  fromNmc: boolean;
  /** The seat figure itself is NMC's (not a curated intake or our seat-matrix count). */
  seatsFromNmc: boolean;
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
  live: LiveBands | null = null,
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

  const ownYear = cutoffs.reduce<number | null>((m, c) => (c.latestYear != null && (m == null || c.latestYear > m) ? c.latestYear : m), null);
  // The counselling year in progress leads the title and snippet where MCC has allotted here ("Cut Off 2026").
  const year = live ? live.year : ownYear;
  const liveFirst = live?.rows[0];
  const first = generalBands(cutoffs, 1)[0];
  // A year's figures only: a whole-course or period-not-stated fee is never a year's (migration 0046).
  const yearly = fees.filter((f) => isYearlyFee(f.feePeriodicity) && f.feeInr != null && f.feeInr > 0);
  const feeValues = yearly.map((f) => f.feeInr!);
  // 2026-27 notices' own figures, exact (owner, 2026-11-05) — a year's figures only, in rupees as charged
  // (a dollar fee's rupee figure is a conversion, so it does not set an exact end).
  const official = yearly.filter((f) => f.official && f.feeCurrency !== "USD");
  const lo = official.length ? official.reduce((a, b) => (b.feeInr! < a.feeInr! ? b : a)) : null;
  const hi = official.length ? official.reduce((a, b) => (b.feeInr! > a.feeInr! ? b : a)) : null;
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
    band: liveFirst
      ? { text: plain(liveFirst.band)!, quota: liveFirst.quota, course: liveFirst.course, year: live!.year, rounds: live!.label }
      : first
        ? { text: plain(first.band)!, quota: first.quota, course: first.course, year: first.year }
        : null,
    fee:
      lo && hi
        ? lo.feeInr === hi.feeInr
          ? exactInr(lo.feeInr!)
          : `${exactInr(lo.feeInr!)} – ${exactInr(hi.feeInr!)}`
        : feeValues.length
          ? plain(approxFee(Math.min(...feeValues), Math.max(...feeValues)))
          : null,
    feeOfficial:
      lo && hi
        ? {
            lo: { quota: lo.quota, course: lo.course, inr: lo.feeInr! },
            hi: { quota: hi.quota, course: hi.course, inr: hi.feeInr! },
            tuition: official.every((f) => feeKind(f.feeLabel).kind === "tuition"),
          }
        : null,
    seats: nmcSeats ?? (level === "ug" ? extras?.intake ?? null : college.seatsTotal ?? null),
    branches: level === "pg" ? (nmcSeats && nmc ? nmc.pg.length : college.branchCount ?? null) : null,
    type,
    fromNmc: Boolean(nmc && (nmcSeats || nmcType)),
    seatsFromNmc: nmcSeats != null,
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
/** Mid-sentence: only the first letter lowered — "Tuition ₹1 L" must not become "₹1 l". */
const lcFirst = (v: string | null) => (v ? v.charAt(0).toLowerCase() + v.slice(1) : null);
/** "₹1 L", "₹61.55 L", "₹1.2 Cr" — a snippet's room, to the nearest thousand. */
const lakh = (v: number) =>
  v >= 10000000 ? `₹${+(v / 10000000).toFixed(2)} Cr` : v >= 100000 ? `₹${+(v / 100000).toFixed(2)} L` : `₹${inr(v)}`;
const fit = (max: number, candidates: (string | null | false | undefined)[]) => {
  const clean = candidates.filter((c): c is string => Boolean(c)).map((c) => c.replace(/\s+/g, " ").trim());
  return clean.find((c) => c.length <= max) ?? null;
};

/** "Madha Medical College, Chennai: MBBS Cutoff 2025, Fees & Seats". */
export function collegeTitle(s: CollegeSummary): string {
  // A place the name already says, spaces aside ("Muzaffarnagar Medical College, Muzaffarna gar"), is not added.
  const squash = (v: string) => v.toLowerCase().replace(/[^a-z]/g, "");
  const place = s.place && !squash(s.short).includes(squash(s.place)) ? s.place : null;
  s = { ...s, place };
  const where = s.place ? `${s.short}, ${s.place}` : s.short;
  // The band's own year when the title promises a cut off: a page whose general band is 2025's but which holds a few
  // 2026 rows elsewhere said "Cut Off 2026" over a 2025 band (AIIMS Bilaspur, found 2026-11-09).
  const yr = s.band?.year ?? s.year;
  const y = yr ? ` ${yr}` : "";
  // "Cut Off" only when the page shows a cutoff band; otherwise what it does show.
  // Worded as India searches (Search Console 7 Oct – 4 Nov 2026): "cut off" in two words 18,033 impressions against
  // "cutoff" 5,240 (UG college pages 10,331 to 2,523); and on MD/MS college pages the course word people type is
  // "pg" (6,227) — "<college> pg fees", "<college> pg stipend" — not "md"/"ms" (1,241). The description still opens
  // with "MD/MS cutoff".
  const c = s.kind === "pg" ? "PG" : s.course;
  const worded: string[] =
    s.kind === "dnb"
      ? s.band
        ? [`: DNB Seats, Stipend & Cut Off${y}`, `: DNB Seats & Cut Off${y}`, `: DNB Cut Off${y}`]
        : s.stipend
          ? [`: DNB Seats & Stipend${y}`, `: DNB Seats${y}`]
          : [`: DNB Seats${y}`, ` DNB Seats`]
      : [
          // A fee from the college's own 2026-27 notice is named with its year, as it is searched ("<college> pg fees
          // 2026-27", owner 2026-11-09: "log updated ya 2026-2027 year se bhi search karte hai"). Tried first; a long
          // name falls through to the tails below.
          ...(s.kind === "pg" && s.feeOfficial
            ? s.band
              ? s.stipend
                ? [`: PG Fees 2026-27, Stipend & Cut Off${y}`, `: PG Fees 2026-27 & Cut Off${y}`]
                : [`: PG Fees 2026-27 & Cut Off${y}`]
              : s.stipend
                ? [`: PG Fees 2026-27, Stipend & Seats`, `: PG Fees 2026-27 & Stipend`]
                : [`: PG Fees 2026-27 & Seats`]
            : []),
          // "sms jaipur pg stipend", "pg stipend in vmmc": an MD/MS page that publishes a stipend says so first.
          ...(s.kind === "pg" && s.stipend
            ? s.band
              ? [`: ${c} Fees, Stipend & Cut Off${y}`, `: ${c} Cut Off${y}, Fees & Stipend`]
              : [`: ${c} Fees, Stipend & Seats`, `: ${c} Admission${y}, Fees & Stipend`]
            : []),
          ...(s.band
            ? [`: ${c} Cut Off${y}, Fees & Seats`, `: ${c} Cut Off${y} & Fees`, `: ${c} Cut Off${y}`]
            : [`: ${c} Admission${y}, Fees & Seats`, `: ${c} Fees & Seats`, `: ${c} Admission`]),
        ];
  // "Cut Off" is one character longer than "Cutoff": where that character is all that stops a tail fitting, the
  // one-word spelling keeps the tail's other words ("Fees", "Stipend", "Seats") rather than losing them.
  const tails = worded.flatMap((t) => (t.includes("Cut Off") ? [t, t.replace("Cut Off", "Cutoff")] : [t]));
  const withPlace = fit(TITLE, tails.map((t) => where + t));
  if (withPlace) return withPlace;
  // The city before the tail's words: "<college> <city>" is how a long-named college is searched ("ahmednagar
  // medical college", "port blair medical college" — about 630 impressions a month were landing on titles that had
  // dropped the city, 2026-11-05). So the shortest tail, then the same without its year, with the city kept — up to
  // LONG_TITLE — before giving up the city.
  if (s.place) {
    // First every tail with the city up to CITY_TITLE, so "Fees" and "Seats" stay where they fit; then the shortest
    // tail in both spellings ("Cut Off" first), then both without the year, up to LONG_TITLE.
    const last = tails[tails.length - 1];
    const shortest = tails.filter((t) => t.replace("Cut Off", "Cutoff") === last);
    const compact =
      fit(CITY_TITLE, tails.map((t) => where + t)) ??
      fit(LONG_TITLE, [...shortest, ...shortest.map((t) => t.replace(/\s\d{4}$/, ""))].map((t) => where + t));
    if (compact) return compact;
  }
  const whole = fit(TITLE, s.place ? tails.map((t) => s.short + t) : []);
  if (whole) return whole;
  // Too long for every tail: keep the whole name with the shortest tail, up to LONG_TITLE. A "…" cut in the middle
  // ("Sri Aurobindo Medical College and… Indore", 36 of 231 sampled pages on 2026-11-04) reads as a fault, drops the
  // words people search, and sometimes kept a name's last word in place of the city; Google trims a long title at
  // its end instead, where the tail is. Only a name too long even for that is still shortened from the middle.
  const tail = tails[tails.length - 1];
  const kept = fit(LONG_TITLE, [where + tail, s.short + tail]);
  if (kept) return kept;
  return `${clipMiddle(where, TITLE - tail.length)}${tail}`;
}

/** The meta description: the summary box in a sentence or two. */
export function collegeDescription(s: CollegeSummary): string {
  const where = s.place ? `${s.short}, ${s.place}` : s.short;
  const b = s.band;
  const by = b?.year ?? s.year;
  // A 2026-27 notice's figures in lakh for the snippet ("₹1 L – ₹61.55 L"; the page itself prints them in full), called
  // tuition only when every figure is the tuition alone. `feeShort` drops the year when the sentence runs long.
  const o = s.feeOfficial;
  const range = o ? (o.lo.inr === o.hi.inr ? lakh(o.lo.inr) : `${lakh(o.lo.inr)} – ${lakh(o.hi.inr)}`) : null;
  const fee = s.fee ? (o ? `${o.tuition ? "Tuition" : "Fees"} ${range} a year (2026-27)` : `Tuition ${s.fee} a year`) : null;
  const feeShort = s.fee ? (o ? `${o.tuition ? "Tuition" : "Fees"} ${range} a year` : fee) : null;
  const type = s.type ? `${s.type.toLowerCase()}${s.kind === "dnb" ? "" : " college"}` : null;

  if (s.kind === "dnb") {
    const seats = s.seats ? `${inr(s.seats)} DNB seat${s.seats === 1 ? "" : "s"}${s.branches ? ` in ${s.branches} ${s.branches === 1 ? "speciality" : "specialities"}` : ""}` : null;
    const stipend = s.stipend ? `stipend ${money(s.stipend)} a month` : null;
    const cut = b ? `General-category cut off${by ? ` ${by}` : ""}${b.rounds ? ` (${b.rounds})` : ""}: ${b.text} (${b.course})` : null;
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
    const r = b?.rounds ? ` ${b.rounds}` : "";
    const cut = b ? `MD/MS cut off${by ? ` ${by}` : ""}${r}: ${b.text} (general, ${b.quota}, ${b.course})` : null;
    const cutShort = b ? `MD/MS cut off${by ? ` ${by}` : ""}${r}: ${b.text} (general, ${b.course})` : null;
    const seats = s.seats ? `${inr(s.seats)} PG seats${s.branches ? ` in ${s.branches} branches` : ""}` : null;
    const seatsShort = s.seats ? `${inr(s.seats)} PG seats` : null;
    const stipend = s.stipend ? `stipend ${money(s.stipend)} a month` : null;
    // The facts as one sentence: capitalised (it may now open with "tuition"), empty when there are none.
    const facts = (...xs: (string | null)[]) => {
      const f = xs.filter(Boolean).join(", ");
      return f ? ` ${f.charAt(0).toUpperCase()}${f.slice(1)}.` : "";
    };
    // Fee and stipend before seats (2026-11-10): on these pages "<college> pg fees" and "<college> pg stipend" are
    // asked far more than seats (GSC, 1–7 Nov: fees 23%, stipend 15%, seats 2% of the named queries), and with the
    // year-in-progress cut off leading the sentence the stipend was the first fact to fall off ("SMS Medical
    // College, Jaipur" showed no stipend while "sms jaipur pg stipend" was its top query).
    return (
      fit(DESCRIPTION, [
        `${where} — ${cut ?? "MD/MS admission"}.${facts(lcFirst(fee), stipend, seats, type)}`,
        `${where} — ${cutShort ?? "MD/MS admission"}.${facts(lcFirst(fee), stipend, seats, type)}`,
        `${where} — ${cutShort ?? "MD/MS admission"}.${facts(lcFirst(fee), stipend, seats)}`,
        `${where} — ${cutShort ?? "MD/MS admission"}.${facts(lcFirst(feeShort), stipend, seatsShort)}`,
        `${where} — ${cutShort ?? "MD/MS admission"}.${facts(lcFirst(feeShort), stipend)}`,
        `${s.short} — ${cutShort ?? "MD/MS admission"}.${facts(lcFirst(feeShort), stipend)}`,
        `${where} — ${cutShort ?? "MD/MS admission"}.${facts(stipend, seats)}`,
        `${s.short} — ${cutShort ?? "MD/MS admission"}.${facts(stipend ?? seats)}`,
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
