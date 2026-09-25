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
 * Ordered by how often they are the reason somebody arrives: the cutoff first,
 * then the money, then the shape of the place.
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

  /* ---- the cutoff, which is what most of these queries are ---- */
  const ranked = cutoffs.filter((c) => c.r1Latest != null);
  if (ranked.length) {
    const tightest = ranked.reduce((a, b) => (b.r1Latest! < a.r1Latest! ? b : a));
    const widest = ranked.reduce((a, b) => (b.r1Latest! > a.r1Latest! ? b : a));

    // The quota is named alongside the rank on purpose. A rank without its
    // quota invites the reader to assume a government seat and a government
    // fee; at most colleges the widest rank is a management or NRI seat
    // costing several times more.
    const seat = (c: CourseCutoff) =>
      `${c.course} (${c.quota}, ${c.category})`;

    faqs.push({
      q: `What is the closing rank for ${college.name}?`,
      a:
        tightest.course === widest.course && tightest.quota === widest.quota
          ? `In ${year ?? "the latest round"}, ${seat(tightest)} closed at rank ${inr(tightest.r1Latest!)} in round 1.`
          : `In ${year ?? "the latest round"}, the hardest seat here was ${seat(tightest)}, ` +
            `closing at rank ${inr(tightest.r1Latest!)} in round 1. The most accessible was ` +
            `${seat(widest)} at ${inr(widest.r1Latest!)} — a different quota, usually at a very ` +
            `different fee, so the two are not interchangeable. The table above keeps each seat's ` +
            `rank, quota and fee on one row. These are the authority's own published closing ranks, ` +
            `not estimates.`,
    });

    // The thing that costs people a seat, and nobody else publishes it.
    const moved = ranked.filter(
      (c) => c.widestLatest != null && c.r1Latest != null && c.widestLatest > c.r1Latest,
    );
    if (moved.length) {
      const most = moved.reduce((a, b) =>
        b.widestLatest! - b.r1Latest! > a.widestLatest! - a.r1Latest! ? b : a,
      );
      faqs.push({
        q: `Does the cutoff at ${college.name} go up in later rounds?`,
        a:
          `Yes, for ${moved.length} of its ${ranked.length} seats. The largest move was ${most.course}, ` +
          `which closed at ${inr(most.r1Latest!)} in round 1 and reached ${inr(most.widestLatest!)} ` +
          `by the widest round — a difference of ${inr(most.widestLatest! - most.r1Latest!)} ranks. ` +
          `Judging this college by round 1 alone understates what it actually reached.`,
      });
    }
  }

  /* ---- the money ---- */
  const priced = fees.filter((f) => f.feeInr != null);
  if (priced.length) {
    const cheapest = priced.reduce((a, b) => (b.feeInr! < a.feeInr! ? b : a));
    const dearest = priced.reduce((a, b) => (b.feeInr! > a.feeInr! ? b : a));
    faqs.push({
      q: `What are the fees at ${college.name}?`,
      a:
        cheapest.feeInr === dearest.feeInr
          ? `${money(cheapest.feeInr!)} a year, as published in the counselling fee schedule.`
          : `From ${money(cheapest.feeInr!)} a year on a ${cheapest.quota} seat to ` +
            `${money(dearest.feeInr!)} on a ${dearest.quota} seat. The difference is the quota, not ` +
            `the college — the cheapest figure here does not apply to the seats open at the largest ` +
            `ranks. Both are from the published counselling fee schedule.`,
    });
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
}): Record<string, unknown>[] {
  const { college, level, faqs } = opts;
  const base = level === "pg" ? "/md-ms-india/colleges" : "/mbbs-india/colleges";
  const listName = level === "pg" ? "MD/MS colleges" : "MBBS colleges";

  const out: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "CollegeOrUniversity",
      name: college.name,
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
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: listName, item: `${SITE}${base}` },
        {
          "@type": "ListItem",
          position: 3,
          name: college.name,
          item: `${SITE}${base}/${college.slug}`,
        },
      ],
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
