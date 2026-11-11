/**
 * Search markup for the per-college pages.
 *
 * These pages are 3,479 of the 3,526 URLs in the sitemap — effectively the
 * whole indexable surface. Anything fixed here is fixed everywhere, and
 * anything missing here is missing from 98% of the site.
 *
 * Three things go on each page:
 *
 *   1. `CollegeOrUniversity`, which was already there.
 *   2. `BreadcrumbList`, which was not. Google renders it in place of the raw
 *      URL in a result, so `Home › MD/MS colleges › SMS Medical College` shows
 *      instead of `admissionhands.com/md-ms-india/colleges/sms-medical-...`.
 *      It is the cheapest change to how a result actually looks.
 *   3. `FAQPage`, with the answers also rendered on the page.
 *
 * **On the FAQ, honestly:** since August 2023 Google shows FAQ rich results
 * only for government and health authorities, so the schema alone will not put
 * stars in the SERP for us. It is here because the questions below are the
 * queries people actually type — "X college cutoff", "X college fees", "how
 * many seats" — and answering them in plain text on the page is what has
 * always helped, schema or not. The markup costs nothing and describes content
 * that is genuinely there.
 *
 * Every answer is computed from the row. A question whose data is missing is
 * dropped rather than answered vaguely: "fees are not available" as a visible
 * FAQ is worse than no FAQ, and inventing a figure would undo the one thing
 * this site claims.
 */

import type { CollegeDetail, CourseCutoff, CollegeFee } from "@/lib/collegeQueries";
import { approxFee, exactInr, feeKind, isYearlyFee } from "@/lib/chance";
import { generalBands } from "@/lib/cutoffBands";
import type { LiveBands } from "@/lib/collegeLiveBands";
import { collegeName } from "@/lib/collegeName";

const SITE = "https://www.admissionhands.com";

const inr = (v: number) => v.toLocaleString("en-IN");

const money = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} crore`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} lakh`;
  return `₹${inr(v)}`;
};

export interface Faq {
  q: string;
  a: string;
}

/**
 * Where the college sits, without repeating itself.
 *
 * Most names already end in their city — "SMS Medical College, Jaipur" — and
 * appending the district then produced "SMS Medical College, Jaipur, Jaipur,
 * Rajasthan" in every description. A place already in the name is dropped.
 */
export function collegePlace(college: CollegeDetail): string {
  const name = college.name.toLowerCase();
  const parts: string[] = [];
  for (const p of [college.district ?? college.city, college.state]) {
    if (!p) continue;
    if (name.includes(p.toLowerCase())) continue;
    if (parts.some((x) => x.toLowerCase() === p.toLowerCase())) continue;
    parts.push(p);
  }
  return parts.join(", ");
}

/* ------------------------------------------------------------------ faqs */

/**
 * The questions these pages are actually found by, answered from the data.
 *
 * Ordered by how often they are the reason somebody arrives: the rank question
 * first, then the money, then the shape of the place.
 */
/**
 * What the page's summary knows that the college row does not: the course the page is about ("MBBS", "BDS"),
 * and NMC's own seat count and ownership (lib/nmcData.ts). Passed by the college pages; optional so any
 * other caller keeps working.
 */
export interface FaqFacts {
  course?: string;
  type?: string | null;
  seats?: number | null;
  fromNmc?: boolean;
  /** `seats` is NMC's own figure — then it is the one the FAQ quotes, the same as the page's NMC card. */
  seatsFromNmc?: boolean;
  /** MCC's results for the counselling year in progress (PG), as bands — answered first ("<college> cut off 2026"). */
  live?: LiveBands | null;
  /** The college's rank in NIRF's medical (or dental) list, once that list is loaded — the official ranking. */
  nirf?: { rank: number; year: number; list: string } | null;
}

/**
 * A counselling's database name as a reader says it: "RJSTHN PG" is Rajasthan's state counselling, "All India PG"
 * is MCC's. The prose of an FAQ printed the codes until 2026-11-05.
 */
const STATE_CODE: Record<string, string> = {
  RJSTHN: "Rajasthan", CHHTSGRH: "Chhattisgarh", CHNDGH: "Chandigarh", PNDCHRY: "Puducherry", UK: "Uttarakhand",
  HP: "Himachal Pradesh", MP: "Madhya Pradesh", UP: "Uttar Pradesh", WB: "West Bengal", TN: "Tamil Nadu",
  AP: "Andhra Pradesh", TEL: "Telangana", KAR: "Karnataka", "J&K": "Jammu and Kashmir",
};
/** Quotas MCC itself runs beside the All India Quota (UG), by their database names. */
const MCC_QUOTA: Record<string, string> = {
  "Central UG": "MCC's central universities counselling",
  "Deemed UG": "MCC's deemed universities counselling",
  "AMU Quota UG": "MCC's AMU quota",
  "Delhi University Quota UG": "MCC's Delhi University quota",
  "IP University Quota UG": "MCC's IP University quota",
  "Jamia Internal UG": "MCC's Jamia internal quota",
  "ESI Scheme UG": "MCC's ESI quota",
  "Delhi Children/Widows UG": "MCC's Delhi children/widows quota",
  "Open Seat Quota UG": "MCC's open seat quota",
};
/** Institutes that run their own PG counselling. */
const OWN_COUNSELLING = /^(JNIMS|RIMS|NEIGRIHMS)\b/i;

export function readableCounselling(name: string): string {
  const n = name.trim();
  if (MCC_QUOTA[n]) return MCC_QUOTA[n];
  if (/^all india/i.test(n) || /^mcc\b/i.test(n)) return "MCC's All India counselling";
  if (/^open states/i.test(n)) return "the private seats open to every state";
  if (/^dnb sponsored/i.test(n)) return "the DNB sponsored seats";
  if (OWN_COUNSELLING.test(n)) return `${n.replace(/\s+(PG|UG)$/i, "")}'s own counselling`;
  const m = n.match(/^(.+?)\s+(?:(Govt|Mgmt)\s+)?(?:PG|UG)(?:\s*\(([^)]+)\))?$/i) ?? n.match(/^(.+?)\s*-\s*PG Medical$/i);
  if (!m) return n;
  const state = STATE_CODE[m[1].trim()] ?? m[1].trim().replace(/&/g, " and ").replace(/\s+/g, " ");
  const kind = m[2] ? (/mgmt/i.test(m[2]) ? " (management seats)" : " (government seats)") : "";
  const body = m[3] ? ` (${m[3]})` : "";
  return `the ${state} state counselling${kind}${body}`;
}

export function collegeFaqs(
  college: CollegeDetail,
  cutoffs: CourseCutoff[],
  fees: CollegeFee[],
  level: "ug" | "pg",
  facts: FaqFacts = {},
): Faq[] {
  const faqs: Faq[] = [];
  // A hospital that runs only National Board courses is asked about as one (Search Console audit, 2026-11-11: DNB
  // pages said "Admission to MD/MS at…", "How many MD/MS seats…", "a government or private college").
  const dnb = level === "pg" && facts.course === "DNB";
  const course = level === "pg" ? (dnb ? "DNB" : "MD/MS") : facts.course && facts.course !== "DNB" ? facts.course : "MBBS";
  const place = dnb ? "hospital" : "college";
  // The name as searched: NBEMS's names end in an address and a PIN code ("…, Delhi-110083"), which read badly in a
  // question and repeated the PIN in every FAQ. The official name stays on the page's own line.
  const nm = collegeName(college.name);
  const name = /\d{6}\s*$/.test(college.name) ? (nm.place && !nm.short.toLowerCase().includes(nm.place.toLowerCase()) ? `${nm.short}, ${nm.place}` : nm.short) : college.name;
  const year = cutoffs.find((c) => c.latestYear)?.latestYear;

  /* ---- the rank question, answered without a college's rank ----
   *
   * Since 2026-10-12 no page states a named college's closing rank (see
   * lib/depth.ts). The question is still what people search, so it is answered
   * with what genuinely decides it — which counselling, which quotas — and
   * where the student's own chance is shown. */
  // The year in progress first: "<college> neet pg cut off 2026" is what is searched while it runs.
  if (facts.live?.rows.length) {
    const L = facts.live;
    const top = L.rows.slice(0, 3);
    const said = top.map((b) => `${b.band.replace(/\*$/, "")} on the ${b.quota} ${b.course} seat`).join(", ");
    const cats = Object.entries(top[0].byCategory).map(([c, band]) => `${c} ${band!.replace(/\*$/, "")}`);
    faqs.push({
      q: `What is the NEET PG ${L.year} cut off for ${name}?`,
      a:
        `In MCC's ${L.year} ${L.label} result, the last general-category seat was taken at ${said} — rank bands, not ` +
        `exact ranks. ` +
        (cats.length ? `On the ${top[0].quota} ${top[0].course} seat the other categories closed at ${cats.join(", ")}. ` : "") +
        `Later rounds usually reach further down the list. Sign in free on AdmissionHands to see your own chance here.`,
    });
  }

  if (cutoffs.length) {
    const counsellings = [...new Set(cutoffs.map((c) => c.counselling).filter(Boolean).map((c) => readableCounselling(c as string)))];
    const quotas = [...new Set(cutoffs.map((c) => c.quota).filter(Boolean))];
    const categories = new Set(cutoffs.map((c) => c.category)).size;
    const list = (xs: string[], n: number) =>
      xs.length <= n ? xs.join(", ") : `${xs.slice(0, n).join(", ")} and ${xs.length - n} more`;

    // The search answer is a band for the general category on merit quotas
    // (lib/cutoffBands.ts) — the rank itself stays with the counsellor.
    const bands = generalBands(cutoffs, 3);
    if (bands.length) {
      const said = bands
        .map((b) => `${b.band.replace(/\*$/, "")} on the ${b.quota} ${level === "pg" ? b.course + " " : ""}seat`)
        .join(", ");
      // The first row's reserved categories, each a band on that same seat (owner, 2026-11-05).
      const first = bands[0];
      const cats = Object.entries(first.byCategory).map(([c, band]) => `${c} ${band!.replace(/\*$/, "")}`);
      faqs.push({
        q: `What is the ${level === "pg" ? "NEET PG" : "NEET UG"} cutoff for ${name}?`,
        a:
          `For the general category${first.year ? ` in ${first.year}` : ""}, the last seat was taken in the ` +
          `${said} — these are rank bands across all rounds, not exact ranks. ` +
          (cats.length
            ? `On the ${first.quota} ${level === "pg" ? first.course + " " : ""}seat the other categories closed at ${cats.join(", ")}. ` +
              `PwD, NRI and management seats close at very different ranks; `
            : `OBC, SC, ST, EWS and PwD seats, NRI and management close at very different ranks; `) +
          `sign in free on AdmissionHands to see your own chance at this college, and your counsellor takes you ` +
          `through the round-by-round detail.`,
      });
    }

    faqs.push({
      q: `What NEET rank do I need for ${name}?`,
      a:
        `It depends on the course, your quota and category, and the round — the same college closes at very ` +
        `different ranks for different seats. Seats here are filled through ${list(counsellings, 2) || "counselling"}` +
        (quotas.length ? `, under ${list(quotas, 3)}` : "") +
        `. Sign in free on AdmissionHands to see your own chance at this college in plain words — high chance, ` +
        `good chance, possible or reach — and your counsellor takes you through the round-by-round detail.`,
    });

    // "<college> admissions" (995 impressions a month on UG pages, 307 on PG, Search Console Oct–Nov 2026).
    faqs.push({
      q: `How to get admission in ${name}?`,
      a:
        `Admission to ${course} at ${name} is through ${level === "pg" ? "NEET PG" : "NEET UG"} ` +
        `and counselling — there is no direct admission. Seats here are allotted by ${list(counsellings, 3) || "counselling"}` +
        (quotas.length ? `, under ${list(quotas, 3)}` : "") +
        `. Register for each counselling you are eligible for, place the college in your choices, and if a seat is ` +
        `allotted, report with your documents by the date given. A counsellor decides with you where it goes in your ` +
        `order and what to do in each round.`,
    });

    faqs.push({
      q: `How many seat options does ${name} offer in counselling?`,
      a:
        `${inr(cutoffs.length)} published seat options${year ? ` in ${year}` : ""} — each a course, quota and ` +
        `category combination — across ${categories} ${categories === 1 ? "category" : "categories"}.`,
    });
  }

  /* ---- the money, as a bracket ---- */
  // A year's figures only — a whole-course or period-not-stated fee is never read as a year's (owner, 2026-11-04) —
  // and "tuition" only when every figure is the tuition alone.
  const priced = fees.filter((f) => f.feeInr != null && f.feeInr > 0 && isYearlyFee(f.feePeriodicity));
  // 2026-27 notices' own figures are quoted exactly (owner, 2026-11-05), each end with its seat — a low fee and a high
  // one from different seats, said without their quotas, read as one seat's range.
  const official = priced.filter((f) => f.official && f.feeCurrency !== "USD");
  if (official.length) {
    const lo = official.reduce((a, b) => (b.feeInr! < a.feeInr! ? b : a));
    const hi = official.reduce((a, b) => (b.feeInr! > a.feeInr! ? b : a));
    const tuition = official.every((f) => feeKind(f.feeLabel).kind === "tuition");
    const what = tuition ? "tuition" : "fee";
    const seat = (f: CollegeFee) => `a ${f.quota} seat in ${f.course}`;
    const rest = priced.length > official.length || fees.some((f) => f.feeCurrency === "USD" || !isYearlyFee(f.feePeriodicity));
    faqs.push({
      q: `What is the ${level === "pg" ? "PG" : course} fee structure at ${name}?`,
      a:
        (lo.feeInr === hi.feeInr
          ? `The 2026-27 ${what} is ${exactInr(lo.feeInr!)} a year on ${seat(lo)}.`
          : `The 2026-27 ${what} runs from ${exactInr(lo.feeInr!)} a year on ${seat(lo)} to ${exactInr(hi.feeInr!)} a year on ${seat(hi)}.`) +
        ` These are the figures the 2026-27 notices print${tuition ? " — the tuition alone; development, university and hostel charges are extra" : ""}. ` +
        (rest ? "The fee table on this page gives every branch and quota, including fees charged in dollars or for the whole course. " : "") +
        `Confirm the fee, deposit and bond for your seat with the college or your counsellor before you pay.`,
    });
  } else if (priced.length) {
    const values = priced.map((f) => f.feeInr!);
    const bracket = approxFee(Math.min(...values), Math.max(...values));
    const tuitionOnly = priced.every((f) => feeKind(f.feeLabel).kind === "tuition");
    if (bracket) {
      faqs.push({
        // "<college> pg fee structure", "<college> mbbs fees structure" — the fee intent as people type it.
        q: `What is the ${level === "pg" ? "PG" : course} fee structure at ${name}?`,
        a:
          `Approximately ${bracket.replace(/^≈ /, "").replace(/\*$/, "")} ${tuitionOnly ? "in tuition" : "in fees"}, depending on the course ` +
          `and quota. This is a bracket from the published fee schedule, not a quote — hostel, deposit, bond and ` +
          `later-year changes vary by seat, and your counsellor confirms the exact figure for your quota.`,
      });
    }
  }

  const stipends = fees.filter((f) => f.stipendY1Inr != null && f.stipendY1Inr > 0);
  if (stipends.length && level === "pg") {
    const top = stipends.reduce((a, b) => (b.stipendY1Inr! > a.stipendY1Inr! ? b : a));
    // "sms jaipur pg stipend" (234 impressions a month) — the question as it is searched, all three years when published.
    const later = [top.stipendY2Inr, top.stipendY3Inr].every((v) => v != null && v > 0)
      ? ` ${money(top.stipendY2Inr!)} in the second and ${money(top.stipendY3Inr!)} in the third,`
      : "";
    faqs.push({
      q: `What is the PG stipend at ${name}?`,
      a: `${money(top.stipendY1Inr!)} a month in the first year,${later} as published — worth ${money(top.stipendY1Inr! * 12)} over the first year against the fees above.`,
    });
  }

  /* ---- the shape of the place ---- */
  if (facts.seatsFromNmc && facts.seats && (level === "pg" || course === "MBBS")) {
    // NMC's figure first, the same one the page's "Official record" card shows — the FAQ quoting our seat-matrix
    // count beside it (646 against NMC's 643 at SMS Jaipur) read as a mistake (2026-11-05). "how many mbbs seats in
    // <college>": the UG list carries no seat matrix, NMC's register does.
    faqs.push({
      q: `How many ${course} seats does ${name} have?`,
      a: `${inr(facts.seats)} ${course} seats a year, as approved in the National Medical Commission's register.`,
    });
  } else if (college.seatsTotal && college.branchCount) {
    faqs.push({
      q: `How many ${course} seats does ${name} have?`,
      a: `${inr(college.seatsTotal)} seats across ${college.branchCount} ${level === "pg" ? "branches" : "courses"}, counted from the published seat matrix.`,
    });
  }

  // `other` is what the UG import has for every row — saying it would be a
  // claim we cannot back. See the note in CLAUDE.md on UG ownership. NMC's register does say, so a UG page
  // whose college NMC lists answers "<college> government or private" (883 impressions a month) from it.
  const ownership = college.ownership && college.ownership !== "other" ? college.ownership : facts.fromNmc && facts.type ? facts.type.toLowerCase() : null;
  // "<college> rankings" (3,011 impressions a month on UG pages, 468 on PG): the official ranking where the college is
  // in it, else what the regulator's register says — never a ranking we made up.
  {
    const what = [
      ownership ? `a ${ownership} ${place}` : null,
      college.establishedYear ? `founded in ${college.establishedYear}` : null,
      facts.seats ? `with ${inr(facts.seats)} ${course} seats${facts.seatsFromNmc ? " on NMC's register" : ""}` : null,
    ].filter(Boolean) as string[];
    if (facts.nirf || what.length >= 2) {
      faqs.push({
        q: `What is the ranking of ${name}?`,
        a: facts.nirf
          ? `${name} is ranked ${facts.nirf.rank} in NIRF ${facts.nirf.year} (${facts.nirf.list}), the Ministry of Education's ` +
            `national ranking.${what.length ? ` It is ${what.join(", ")}.` : ""} For your own seat, what decides it is the ${place}'s cut off at your ` +
            `rank, its fee and ${dnb ? "its training" : "its hospital"} — sign in free to see your chance here.`
          : `The official ranking of medical colleges in India is NIRF, by the Ministry of Education, which lists the top ` +
            `colleges each year. ${name} is ${what.join(", ")}. For your own seat, what decides it is the ${place}'s ` +
            `cut off at your rank, its fee and ${dnb ? "its training" : "its hospital"} — sign in free to see your chance here.`,
      });
    }
  }

  if (ownership) {
    faqs.push({
      q: `Is ${name} a government or private ${place}?`,
      a:
        `It is a ${ownership} ${college.ownership && college.ownership !== "other" ? "institution" : "college in the National Medical Commission's register"}` +
        (college.establishedYear ? `, established in ${college.establishedYear}` : "") +
        (college.university ? `, affiliated to ${college.university}` : "") +
        ".",
    });
  }

  return faqs;
}

/* --------------------------------------------------------------- schemas */

export function collegeJsonLd(opts: {
  college: CollegeDetail;
  level: "ug" | "pg";
  faqs: Faq[];
  /** The name it is searched by, when shorter than the official one. */
  shortName?: string;
  /** The state page, as the visible breadcrumb links it. */
  state?: { name: string; path: string } | null;
}): Record<string, unknown>[] {
  const { college, level, faqs, shortName, state } = opts;
  const base = level === "pg" ? "/md-ms-india/colleges" : "/mbbs-india/colleges";
  // The same trail the page shows: section, then the state, then the college.
  const section = level === "pg" ? { name: "MD/MS in India", path: "/md-ms-india" } : { name: "MBBS in India", path: "/mbbs-india" };
  const trail = [
    { name: "Home", item: SITE },
    { name: section.name, item: `${SITE}${section.path}` },
    ...(state ? [{ name: state.name, item: `${SITE}${state.path}` }] : [{ name: level === "pg" ? "MD/MS colleges" : "MBBS colleges", item: `${SITE}${base}` }]),
    { name: shortName ?? college.name, item: `${SITE}${base}/${college.slug}` },
  ];

  const out: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "CollegeOrUniversity",
      name: college.name,
      ...(shortName && shortName !== college.name ? { alternateName: shortName } : {}),
      address: {
        "@type": "PostalAddress",
        addressLocality: college.district ?? college.city ?? undefined,
        addressRegion: college.state ?? undefined,
        addressCountry: "IN",
      },
      foundingDate: college.establishedYear ? String(college.establishedYear) : undefined,
      parentOrganization: college.university ?? undefined,
      url: `${SITE}${base}/${college.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: t.item })),
    },
  ];

  if (faqs.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  return out;
}
