import { fitDescription, fitTitle } from "@/lib/seoTitle";
import type { Metadata } from "next";
import { getQuotaOverview } from "@/lib/quotaQueries";
import { resolveMetadata } from "@/lib/content";
import QuotaPage from "@/components/quota/QuotaPage";

export const revalidate = 86400;

const money = (v: number | null) => {
  if (v == null) return "—";
  if (v >= 10000000) return `₹${+(v / 10000000).toFixed(2)} crore`;
  if (v >= 100000) return `₹${+(v / 100000).toFixed(2)} lakh`;
  return `₹${v.toLocaleString("en-IN")}`;
};

const inr = (v: number | null) => (v == null ? "—" : v.toLocaleString("en-IN"));

/**
 * What a management seat actually costs, and what rank it stays open to.
 *
 * Top-level rather than nested, because "management quota" is the search term
 * and it spans both MBBS and MD/MS — filing it under either would put it one
 * level further from the query it exists to answer.
 */
export async function generateMetadata(): Promise<Metadata> {
  const pg = await getQuotaOverview("management", "pg");

  // Searched as "md management quota fees", "<college> management quota fees",
  // "mng quota". Fees are PG only — UG publishes no per-quota fee.
  const y = pg?.year ? ` ${pg.year}` : "";
  const title = pg
    ? fitTitle(
        `Management Quota Fees${y}: MD/MS Seats at ${inr(pg.colleges)} Medical Colleges`,
        `Management Quota Fees${y}: MD/MS at ${inr(pg.colleges)} Colleges`,
        `Management Quota Medical Fees & Closing Ranks${y}`,
      )
    : "Management Quota Medical Fees & Closing Ranks";
  const description = pg
    // The median, not the minimum: the cheapest published management fee is a
    // ₹1,000 slip, and a headline built on it would mislead.
    ? fitDescription(
        `MD/MS management quota fees at ${inr(pg.colleges)} medical colleges in ${pg.states} states: median published fee ${money(pg.medianFee)}, most ${money(pg.p10Fee)} to ${money(pg.p90Fee)}, with how far each quota's closing ranks reach. See your chance free.`,
        `Management quota MD/MS seats at ${inr(pg.colleges)} medical colleges: median published fee ${money(pg.medianFee)}, with closing-rank ranges.`,
      )
    : "Management quota medical seats with published fees and closing ranks.";

  return resolveMetadata("/management-quota", {
    title,
    description,
    keywords: [
      "management quota fees",
      "management quota medical college",
      "management quota MBBS fees",
      "management quota NEET PG",
      "management seat cutoff",
      "management quota closing rank",
      "MD MS management quota fees",
      "private medical college management seat",
    ].join(", "),
  });
}

export default async function ManagementQuotaPage() {
  const [pg, ug] = await Promise.all([
    getQuotaOverview("management", "pg"),
    getQuotaOverview("management", "ug"),
  ]);

  const faqs = [
    {
      q: "How much does a management quota medical seat cost?",
      a: pg
        ? `For MD/MS, most published management fees run from ${money(pg.p10Fee)} to ${money(pg.p90Fee)}, and the middle seat costs about ${money(pg.medianFee)}. Most fee schedules quote a year's tuition, but some quote the whole course — check which one you are reading. Which colleges your rank reaches, and roughly what each costs, is shown after a free sign-in.`
        : "Published fees vary widely by college and state; a counsellor can give you the current figure for the colleges you are considering.",
    },
    {
      q: "What rank is needed for a management quota seat?",
      a: pg
        ? `Management seats closed anywhere from rank ${inr(pg.bestRank)} to ${inr(pg.widestRank)} in the latest MD/MS rounds — they stay open long after the government quota at the same college has closed. Seats that stay open to larger ranks tend to cost more (the median fee in the widest-reaching quarter of management seats is well above the tightest quarter's), so check the fee before counting one as an option.`
        : "Management seats stay open to considerably larger ranks than the government quota.",
    },
    {
      q: "Is management quota the same as a private college seat?",
      a: "No. A private college usually has several kinds of seat — a government or state quota at a controlled fee, a management quota at the college's own fee, and sometimes an NRI quota above that. The same college can therefore appear at three very different prices, and the quota name in the counselling's seat matrix is what tells them apart.",
    },
    {
      q: "Do you publish management quota fees for MBBS?",
      a: ug
        ? `No. We hold ${inr(ug.seats)} MBBS management seat options and their closing ranks, but the UG counselling source publishes unlabelled fee blocks per college without saying which quota each belongs to. Printing one as a management fee would be a guess. The rank ranges by quota are below.`
        : "Not yet — the UG source does not publish a fee per quota.",
    },
    {
      q: "Is a management seat worth taking?",
      a: "Sometimes, and often not. Before paying for one it is worth checking how far the government and state quotas actually reached at your rank — for a good number of candidates they reach further than expected, especially in later rounds. Our predictor answers that from the same published data, free.",
    },
  ];

  return (
    <QuotaPage
      pg={pg}
      ug={ug}
      faqs={faqs}
      intro="What management seats cost, quota by quota and state by state, and how far down the rank list they stayed open — which of them your own rank reaches is shown after a free sign-in."
    />
  );
}
