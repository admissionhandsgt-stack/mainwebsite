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
import { approxFee } from "@/lib/chance";
import { generalBands } from "@/lib/cutoffBands";

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
export function collegeFaqs(
  college: CollegeDetail,
  cutoffs: CourseCutoff[],
  fees: CollegeFee[],
  level: "ug" | "pg",
): Faq[] {
  const faqs: Faq[] = [];
  const course = level === "pg" ? "MD/MS" : "MBBS";
  const year = cutoffs.find((c) => c.latestYear)?.latestYear;

  /* ---- the rank question, answered without a college's rank ----
   *
   * Since 2026-10-12 no page states a named college's closing rank (see
   * lib/depth.ts). The question is still what people search, so it is answered
   * with what genuinely decides it — which counselling, which quotas — and
   * where the student's own chance is shown. */
  if (cutoffs.length) {
    const counsellings = [...new Set(cutoffs.map((c) => c.counselling).filter(Boolean))] as string[];
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
      faqs.push({
        q: `What is the ${level === "pg" ? "NEET PG" : "NEET UG"} cutoff for ${college.name}?`,
        a:
          `For the general category${bands[0].year ? ` in ${bands[0].year}` : ""}, the last seat was taken in the ` +
          `${said} — these are rank bands across all rounds, not exact ranks. OBC, SC, ST, EWS and PwD seats, ` +
          `NRI and management close at very different ranks; sign in free on AdmissionHands to see your own ` +
          `chance at this college, and your counsellor takes you through the round-by-round detail.`,
      });
    }

    faqs.push({
      q: `What NEET rank do I need for ${college.name}?`,
      a:
        `It depends on the course, your quota and category, and the round — the same college closes at very ` +
        `different ranks for different seats. Seats here are filled through ${list(counsellings, 2) || "counselling"}` +
        (quotas.length ? `, under ${list(quotas, 3)}` : "") +
        `. Sign in free on AdmissionHands to see your own chance at this college in plain words — high chance, ` +
        `good chance, possible or reach — and your counsellor takes you through the round-by-round detail.`,
    });

    faqs.push({
      q: `How many seat options does ${college.name} offer in counselling?`,
      a:
        `${inr(cutoffs.length)} published seat options${year ? ` in ${year}` : ""} — each a course, quota and ` +
        `category combination — across ${categories} ${categories === 1 ? "category" : "categories"}.`,
    });
  }

  /* ---- the money, as a bracket ---- */
  const priced = fees.filter((f) => f.feeInr != null && f.feeInr > 0);
  if (priced.length) {
    const values = priced.map((f) => f.feeInr!);
    const bracket = approxFee(Math.min(...values), Math.max(...values));
    if (bracket) {
      faqs.push({
        q: `What are the fees at ${college.name}?`,
        a:
          `Approximately ${bracket.replace(/^≈ /, "").replace(/\*$/, "")} in tuition, depending on the course ` +
          `and quota. This is a bracket from the published fee schedule, not a quote — hostel, deposit, bond and ` +
          `later-year changes vary by seat, and your counsellor confirms the exact figure for your quota.`,
      });
    }
  }

  const stipends = fees.filter((f) => f.stipendY1Inr != null && f.stipendY1Inr > 0);
  if (stipends.length && level === "pg") {
    const top = stipends.reduce((a, b) => (b.stipendY1Inr! > a.stipendY1Inr! ? b : a));
    faqs.push({
      q: `Does ${college.name} pay a stipend?`,
      a: `Yes — ${money(top.stipendY1Inr!)} a month in the first year, which is worth ${money(top.stipendY1Inr! * 12)} over that year against the fees above.`,
    });
  }

  /* ---- the shape of the place ---- */
  if (college.seatsTotal && college.branchCount) {
    faqs.push({
      q: `How many ${course} seats does ${college.name} have?`,
      a: `${inr(college.seatsTotal)} seats across ${college.branchCount} ${level === "pg" ? "branches" : "courses"}, counted from the published seat matrix.`,
    });
  }

  // `other` is what the UG import has for every row — saying it would be a
  // claim we cannot back. See the note in CLAUDE.md on UG ownership.
  if (college.ownership && college.ownership !== "other") {
    faqs.push({
      q: `Is ${college.name} a government or private college?`,
      a:
        `It is a ${college.ownership} institution` +
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
