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
 * What an NRI seat actually costs, and what rank it stays open to.
 *
 * "NRI quota fees", "NRI quota cutoff", "NRI seat medical college" are high
 * intent and high value — the people searching them are the ones who convert —
 * and the site answered none of them, despite holding every NRI seat with its
 * published rank and fee.
 *
 * It lives under `/nri-quota` because that section already exists and already
 * ranks for the softer NRI queries; this is the page with the numbers on it.
 */
export async function generateMetadata(): Promise<Metadata> {
  const pg = await getQuotaOverview("nri", "pg");

  const title = "NRI Quota Medical Fees & Closing Ranks 2026";
  const description = pg
    ? `NRI quota seats at ${inr(pg.colleges)} medical colleges — ${money(pg.minFee)} to ${money(pg.maxFee)} a year, with the closing rank beside each fee. Published counselling results, not estimates.`
    : "NRI quota medical seats with published fees and closing ranks.";

  return resolveMetadata("/nri-quota/fees", {
    title,
    description,
    keywords: [
      "NRI quota fees",
      "NRI quota medical college fees",
      "NRI quota MBBS fees",
      "NRI quota NEET PG",
      "NRI seat cutoff",
      "NRI quota closing rank",
      "NRI quota MD MS fees",
      "medical college NRI seat price",
    ].join(", "),
  });
}

export default async function NriFeesPage() {
  const [pg, ug] = await Promise.all([
    getQuotaOverview("nri", "pg"),
    getQuotaOverview("nri", "ug"),
  ]);

  const faqs = [
    {
      q: "How much does an NRI quota medical seat cost?",
      a: pg
        ? `For MD/MS, published fees run from ${money(pg.minFee)} to ${money(pg.maxFee)} a year, with ${money(pg.medianFee)} in the middle. The spread is enormous because it covers state NRI quotas in government colleges at one end and deemed universities at the other — which is why the table on this page puts each college's own fee beside its own rank instead of quoting an average.`
        : "Published fees vary by college and state; the table on this page lists each one.",
    },
    {
      q: "What rank do you need for an NRI quota seat?",
      a: pg
        ? `Far less than for a government seat, which is the point of the quota. In the latest MD/MS rounds, NRI seats closed anywhere from rank ${inr(pg.bestRank)} down to ${inr(pg.widestRank)}. A large rank being enough does not make the seat cheap — the same row shows what it costs.`
        : "NRI seats stay open to considerably larger ranks than the government quota.",
    },
    {
      q: "Is NRI quota available in government medical colleges?",
      a: `Yes, in several states — an NRI quota exists inside government colleges as well as in deemed and private ones, and the fee differs sharply between them. The quota column in the table names the exact quota each seat belongs to, because "NRI" in one state is not the same seat as "NRI" in another.`,
    },
    {
      q: "Do you publish NRI fees for MBBS?",
      a: ug
        ? `No, and deliberately. We hold ${inr(ug.seats)} MBBS seats under an NRI quota and their closing ranks, but the UG counselling source lists unlabelled fee blocks per college without saying which quota each belongs to. Any MBBS NRI fee we printed would be a guess, and a guess about a fee of this size is the most expensive kind to get wrong. The ranks are below; ask a counsellor for a fee and we will point you at the college's own notification.`
        : "Not yet — the UG source does not publish a fee per quota.",
    },
    {
      q: "Can an Indian student take an NRI seat?",
      a: "Eligibility is set by the counselling authority, not by us, and it varies: some states allow a seat to be claimed against an NRI sponsor or a relative abroad, others do not, and the rules are re-issued each cycle. Read the current information bulletin for your counselling before planning around it.",
    },
  ];

  return (
    <QuotaPage
      pg={pg}
      ug={ug}
      faqs={faqs}
      intro="Every NRI seat we hold, with the rank it closed at and the fee it carries — on the same row, because reading one without the other is how people plan around a seat they cannot afford or pay for one they did not need."
    />
  );
}
