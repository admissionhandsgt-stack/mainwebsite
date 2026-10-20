import type { Metadata } from "next";
import { fitTitle, fitDescription } from "@/lib/seoTitle";
import { getQuotaOverview } from "@/lib/quotaQueries";
import { getDeemedQuotaSeats } from "@/lib/pgSeatData";
import { getNriColleges } from "@/lib/nriColleges";
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
  const [pg, deemed] = await Promise.all([getQuotaOverview("nri", "pg"), getDeemedQuotaSeats("nri")]);

  // Searched as "nri quota fees", "nri medical seat cost in india".
  // The title's year is the one the page delivers — MCC's 2026 NRI seats (2026-10-20); the fees are
  // the latest results' and the description says which.
  const y = pg?.year ? ` ${pg.year}` : "";
  const title = pg
    ? fitTitle(
        ...(deemed
          ? [
              `NRI Quota MD/MS ${deemed.year}: ${inr(deemed.total)} Seats, Fees & Colleges`,
              `NRI Quota MD/MS ${deemed.year}: Seats & Fees`,
            ]
          : []),
        `NRI Quota Fees${y}: MD/MS Seat Cost at ${inr(pg.colleges)} Medical Colleges`,
        `NRI Quota Medical Fees${y}: MD/MS at ${inr(pg.colleges)} Colleges`,
        `NRI Quota Medical Fees & Closing Ranks${y}`,
      )
    : "NRI Quota Medical Fees & Closing Ranks";
  const description = pg
    ? fitDescription(
        ...(deemed
          ? [
              `MCC's ${deemed.year} matrix: ${inr(deemed.total)} NRI MD/MS seats at ${inr(deemed.colleges.length)} deemed universities. NRI fees at ${inr(pg.colleges)} colleges${y ? ` (${pg.year} results)` : ""}: most ${money(pg.p10Fee)} to ${money(pg.p90Fee)}.`,
            ]
          : []),
        // The middle 80% of published fees, never min–max: the top is a whole-course dollar
        // figure converted to rupees, and "₹2.84 Cr a year" described no seat (2026-10-18).
        `NRI quota MD/MS fees at ${inr(pg.colleges)} medical colleges: most published fees run ${money(pg.p10Fee)} to ${money(pg.p90Fee)}, median ${money(pg.medianFee)}, with closing-rank ranges by quota. See your chance free.`,
        `NRI quota MD/MS fees at ${inr(pg.colleges)} medical colleges: most run ${money(pg.p10Fee)} to ${money(pg.p90Fee)}, median ${money(pg.medianFee)}.`,
        `NRI quota MD/MS fees at ${inr(pg.colleges)} medical colleges: median ${money(pg.medianFee)}.`,
      )
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
  const [pg, ug, nri] = await Promise.all([
    getQuotaOverview("nri", "pg"),
    getQuotaOverview("nri", "ug"),
    getNriColleges(),
  ]);
  const pgNri = nri?.streams.pg;

  const faqs = [
    {
      q: "How much does an NRI quota medical seat cost?",
      a: pg
        ? `For MD/MS, most published NRI fees run from ${money(pg.p10Fee)} to ${money(pg.p90Fee)}, and the middle seat costs about ${money(pg.medianFee)}. The extremes go further, from ${money(pg.minFee)} to ${money(pg.maxFee)}, because a state NRI quota at a private college and a deemed university's NRI seat are priced very differently. Most fee schedules quote a year's tuition, but some deemed universities quote the whole course or a dollar figure — check which one you are reading. Which colleges your rank reaches, and roughly what each costs, is shown after a free sign-in.`
        : "Published fees vary by college and state; a counsellor can give you the current figure for the colleges you are considering.",
    },
    {
      q: "What rank do you need for an NRI quota seat?",
      a: pg
        ? `Far less than for a government seat, which is the point of the quota. In the latest MD/MS rounds, NRI seats closed anywhere from rank ${inr(pg.bestRank)} down to ${inr(pg.widestRank)}. A large rank being enough does not make the seat cheap — the NRI seats that stay open to the largest ranks are, on the whole, the dearest, so check the fee before you count one as an option.`
        : "NRI seats stay open to considerably larger ranks than the government quota.",
    },
    {
      q: "Is NRI quota available in government medical colleges?",
      // Counted, not asserted: until 2026-10-18 this said "yes, in several states" for PG,
      // where the results we hold carry no government NRI seat at all.
      a: pgNri
        ? `For MD/MS, not in the results we hold: every NRI seat is at a private college (${inr(pgNri.privateCount)}) or a deemed university (${inr(pgNri.deemedCount)}). For MBBS, a state can keep NRI seats in its government colleges${nri && nri.govtNriColleges > 0 ? ` — ${nri.govtNriCounselling ? `${nri.govtNriCounselling}'s counselling` : "one state's counselling"} lists "Govt. NRI" seats at ${inr(nri.govtNriColleges)} colleges` : ""}. "NRI" in one state is not the same seat as "NRI" in another, so the quota name each authority uses is on our list of colleges with NRI seats.`
        : `Some states keep NRI seats in government colleges; most NRI seats are at private colleges and deemed universities. "NRI" in one state is not the same seat as "NRI" in another.`,
    },
    {
      q: "Do you publish NRI fees for MBBS?",
      a: ug
        ? `No, and deliberately. We hold ${inr(ug.seats)} MBBS NRI seat options and their closing ranks, but the UG counselling source lists unlabelled fee blocks per college without saying which quota each belongs to. Any MBBS NRI fee we printed would be a guess, and a guess about a fee of this size is the most expensive kind to get wrong. The rank ranges by quota are below; ask a counsellor for a fee and we will point you at the college's own notification.`
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
      intro="What NRI seats cost, quota by quota and state by state, and how far down the rank list they stayed open — which of them your own rank reaches is shown after a free sign-in."
    />
  );
}
