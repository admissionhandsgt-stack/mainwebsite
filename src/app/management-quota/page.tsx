import type { Metadata } from "next";
import { getQuotaOverview } from "@/lib/quotaQueries";
import { resolveMetadata } from "@/lib/content";
import QuotaPage from "@/components/quota/QuotaPage";

export const revalidate = 86400;

const money = (v: number | null) => {
  if (v == null) return "—";
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} crore`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} lakh`;
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

  const title = "Management Quota Medical Fees & Closing Ranks 2026";
  const description = pg
    ? `Management quota seats at ${inr(pg.colleges)} medical colleges — ${money(pg.minFee)} to ${money(pg.maxFee)} a year, with the closing rank beside each fee. Published counselling results, not estimates.`
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
        ? `For MD/MS, published fees run from ${money(pg.minFee)} to ${money(pg.maxFee)} a year, with ${money(pg.medianFee)} in the middle. A single average would be meaningless across that range, so the table lists each college's own published fee against its own closing rank.`
        : "Published fees vary widely by college and state; the table on this page lists each one.",
    },
    {
      q: "What rank is needed for a management quota seat?",
      a: pg
        ? `Management seats closed anywhere from rank ${inr(pg.bestRank)} to ${inr(pg.widestRank)} in the latest MD/MS rounds — they stay open long after the government quota at the same college has closed. That is exactly why the fee belongs on the same row: the seats still open at the largest ranks are the most expensive ones.`
        : "Management seats stay open to considerably larger ranks than the government quota.",
    },
    {
      q: "Is management quota the same as a private college seat?",
      a: "No. A private college usually has several kinds of seat — a government or state quota at a controlled fee, a management quota at the college's own fee, and sometimes an NRI quota above that. The same college can therefore appear at three very different prices, and the quota column is what tells them apart.",
    },
    {
      q: "Do you publish management quota fees for MBBS?",
      a: ug
        ? `No. We hold ${inr(ug.seats)} MBBS seats under a management quota and their closing ranks, but the UG counselling source publishes unlabelled fee blocks per college without saying which quota each belongs to. Printing one as a management fee would be a guess. The ranks are below.`
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
      intro="Every management seat we hold, with the rank it closed at and the fee it carries — on the same row, because the seats that stay open at the largest ranks are the ones that cost the most, and reading those two facts apart is how people commit to a fee they did not need to pay."
    />
  );
}
