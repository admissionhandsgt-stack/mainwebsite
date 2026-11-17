import Link from "@/components/ui/Link";
import type { CollegeFee } from "@/lib/collegeQueries";
import type { CollegeMatrix } from "@/lib/pgSeatData";
import type { CutCat } from "@/lib/mccRoundTypes";
import { approxFeeFor, exactFeeFor } from "@/lib/chance";
import { branchSlug } from "@/lib/branchSlug";
import { SEARCH_NAME } from "@/lib/branchStateQueries";
import { DEPOSITS } from "@/lib/choiceFillingRules";

/**
 * A deemed university's MD/MS seats, branch by branch (owner, 2026-11-17, from the deemed keyword sheet: "<college>
 * <branch> fees / fee structure / management quota fees / seat matrix / admission / NEET PG cut off"). One card per
 * branch with its own anchor (#md-radio-diagnosis), headed in the words people search ("MD Radiology at KMC Manipal:
 * fees 2026-27, seats and cut off"), carrying what the page holds for that branch:
 *   * MCC's 2026 deemed seats — paid ("Self-Financed Merit Seat"), NRI and any minority seats;
 *   * the fee a year for the paid and the NRI seat — the college's own 2026-27 notice exactly, else a bracket with *;
 *   * the paid-seat cut off as a GROUP figure: the last AIR admitted to that branch's paid seats across deemed
 *     universities in MCC's latest round (3+ colleges) — never this college's own closing rank (the chance view).
 * Replaces the generic MCC seat table on a deemed college's page (same seats, by branch). Fees for other quotas (a
 * state's quota at a deemed university) stay in the fee table below.
 */

type Cuts = Map<string, Partial<Record<CutCat, number>>> | null;

const PAID = /self.?financed|paid|management/i;
const NRI = /nri|non-resident/i;
const feePaid = /^MNG$|Mgmt|Management|Mgt|Paid|^MQ|Deemed/i;

function feeText(f: CollegeFee | undefined): string | null {
  if (!f || f.feeInr == null || f.feeInr <= 0) return null;
  const exact = f.official ? exactFeeFor(f.feeInr, f.feePeriodicity, f.feeUsd, f.feeCurrency) : null;
  return exact ?? approxFeeFor(f.feeInr, f.feePeriodicity);
}

export interface DeemedBranch {
  course: string;
  anchor: string;
  name: string;
  paid: number;
  nri: number;
  other: { quota: string; seats: number }[];
  paidFee: string | null;
  nriFee: string | null;
  paidOfficial: boolean;
  cut: number | null;
}

/** The branches as the page prints them — also used for the page's FAQ. */
export function deemedBranches(matrix: CollegeMatrix | null, fees: CollegeFee[], cuts: Cuts): DeemedBranch[] {
  const rows = (matrix?.rows ?? []).filter((r) => r.seatMatrix === "Deemed" && !/^DNB|^DrNB|NBE/i.test(r.course));
  const courses = new Set(rows.map((r) => r.course));
  for (const f of fees) if (f.course && (feePaid.test(f.quota ?? "") || NRI.test(f.quota ?? "")) && !/^DNB|^DrNB|NBE/i.test(f.course)) courses.add(f.course);
  return [...courses]
    .map((course) => {
      const mine = rows.filter((r) => r.course === course);
      const sum = (re: RegExp) => mine.filter((r) => re.test(r.quota ?? "")).reduce((s, r) => s + r.total, 0);
      const other = mine
        .filter((r) => !PAID.test(r.quota ?? "") && !NRI.test(r.quota ?? ""))
        .map((r) => ({ quota: (r.quota ?? "").replace(/ Quota$/, ""), seats: r.total }))
        .filter((x) => x.seats > 0);
      const fc = fees.filter((f) => f.course === course);
      const paidFee = fc.find((f) => feePaid.test(f.quota ?? "") && !NRI.test(f.quota ?? "") && f.official) ?? fc.find((f) => feePaid.test(f.quota ?? "") && !NRI.test(f.quota ?? ""));
      const nriFee = fc.find((f) => NRI.test(f.quota ?? "") && f.official) ?? fc.find((f) => NRI.test(f.quota ?? ""));
      const c = cuts?.get(course);
      const cut = c ? (c.Open ?? Math.max(...Object.values(c).filter((v): v is number => typeof v === "number"))) : null;
      return {
        course,
        anchor: branchSlug(course),
        name: SEARCH_NAME[course] ?? course,
        paid: sum(PAID),
        nri: sum(NRI),
        other,
        paidFee: feeText(paidFee),
        nriFee: feeText(nriFee),
        paidOfficial: !!paidFee?.official,
        cut: cut && Number.isFinite(cut) ? cut : null,
      };
    })
    .filter((b) => b.paid || b.nri || b.paidFee || b.nriFee)
    .sort((a, b) => b.paid + b.nri - (a.paid + a.nri) || a.name.localeCompare(b.name));
}

export default function DeemedBranches({
  short,
  branches,
  year,
  round,
}: {
  short: string;
  branches: DeemedBranch[];
  /** MCC's counselling year of the seats and the cut-off round. */
  year: number | null;
  round: string | null;
}) {
  if (!branches.length) return null;
  const deposit = DEPOSITS.find((d) => /deemed/i.test(d.who))?.deposit;
  const seats = branches.reduce((s, b) => s + b.paid + b.nri + b.other.reduce((t, o) => t + o.seats, 0), 0);
  return (
    <section id="branches" className="scroll-mt-24">
      <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">
        {short}: PG fees, seats and cut off, branch by branch
      </h2>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
        {short} is a deemed university: all {seats ? `${seats} of its ` : "its "}MD/MS seats in MCC&apos;s {year ?? ""} counselling are filled
        through the deemed university rounds, open to candidates from every state (no domicile), in Rounds 1–3 and the stray
        round. Paid seats are open to every category; NRI seats need an NRI sponsor&apos;s documents.
        {deposit ? ` MCC's security deposit for a deemed seat is ₹${deposit.toLocaleString("en-IN")}.` : ""}
      </p>

      {/* Jump to a branch: each card has its own address (#md-radio-diagnosis). */}
      <nav aria-label="Branches" className="mt-4 flex flex-wrap gap-1.5">
        {branches.map((b) => (
          <a
            key={b.anchor}
            href={`#${b.anchor}`}
            className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-[13px] font-semibold text-foreground hover:border-primary/40 hover:text-primary-strong"
          >
            {b.name.replace(/^(MD|MS|Diploma) /, "")}
          </a>
        ))}
      </nav>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="dt w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="w-[26%] px-4 py-2.5 font-semibold">Branch</th>
              <th scope="col" className="w-[15%] px-4 py-2.5 font-semibold">Seats {year ?? ""}</th>
              <th scope="col" className="w-[29%] px-4 py-2.5 font-semibold">Fee a year, 2026-27</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Paid seats at deemed universities, up to</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {branches.map((b) => (
              <tr key={b.anchor} id={b.anchor} className="scroll-mt-28 align-top">
                <th scope="row" className="px-4 py-2.5">
                  <h3 className="font-heading text-[14px] font-bold leading-snug text-foreground">{b.name}</h3>
                </th>
                <td className="tnum px-4 py-2.5 text-[13.5px] text-foreground">
                  {[b.paid ? `${b.paid} paid` : null, b.nri ? `${b.nri} NRI` : null, ...b.other.map((o) => `${o.seats} ${o.quota.toLowerCase()}`)].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="tnum px-4 py-2.5 text-[13.5px] text-foreground">
                  {b.paidFee || b.nriFee ? (
                    <>
                      {b.paidFee && (
                        <span className="block">
                          <span className="font-semibold">{b.paidFee}</span> <span className="text-[12.5px] text-muted-foreground">paid</span>
                        </span>
                      )}
                      {b.nriFee && (
                        <span className="block">
                          <span className="font-semibold">{b.nriFee}</span> <span className="text-[12.5px] text-muted-foreground">NRI</span>
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not published</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-[13.5px] text-foreground">
                  {b.cut ? <span className="tnum font-semibold">AIR {b.cut.toLocaleString("en-IN")}</span> : <span className="text-muted-foreground">Fewer than 3 colleges</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
        Seats from MCC&apos;s {year ?? ""} seat matrix. A fee in exact rupees (or US$) is the college&apos;s own 2026-27 notice; a bracket
        with * is approximate. &quot;Up to&quot; is the last AIR admitted to that branch&apos;s paid seats across all deemed universities in
        MCC&apos;s {round ?? "latest round"} {year ?? ""} — the least competitive of them. Leading deemed universities close far earlier, and
        we never publish one college&apos;s closing rank:{" "}
        <Link href="/neet-college-predictor?course=pg" className="font-semibold text-primary-strong hover:underline dark:text-primary">
          check your own chance here
        </Link>
        . Fees for any other quota are in the fee table below; confirm the fee, deposit and bond for your seat before you pay.
      </p>
    </section>
  );
}
