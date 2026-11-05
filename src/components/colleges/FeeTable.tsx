import type { CollegeFee } from "@/lib/collegeQueries";
import { approxFee, approxFeeFor, exactFeeFor, exactInr, feeKind, FEE_TABLE_NOTE } from "@/lib/chance";

/**
 * A PG college's fees, one row per branch and one column per quota (owner, 2026-11-04). The old table listed one
 * row per branch × quota, cheapest first, and stopped at 40 — so at 274 colleges the dearest seats, NRI and
 * management, never appeared (11,135 rows). Now every fee is on the page: quota columns whose cells match on
 * every branch are one column ("KAR Govt Quota-Open / KAR Govt Quota-InS"), so a KEA college reads in four or
 * five columns rather than seven.
 */

/** Column order: All India, state / government, private, management / paid, NRI, minority, National Board. */
function familyRank(code: string): number {
  if (/^AIQ$/i.test(code)) return 0;
  if (/NRI/i.test(code)) return 4;
  if (/^MNG$|Mgmt|Management|Mgt|Others|Inst|Paid|^MQ/i.test(code)) return 3;
  if (/Priv/i.test(code)) return 2;
  if (/Min/i.test(code)) return 5;
  if (/DNB|NBE/i.test(code)) return 6;
  return 1;
}

const money = (n: number | null) => {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

/** The value seen most often, ignoring empty ones — a branch's stipend and hostel rarely differ by quota. */
function mode(values: (number | null)[]): number | null {
  const counts = new Map<number, number>();
  for (const v of values) if (v != null && v > 0) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: number | null = null;
  for (const [v, n] of counts) if (best == null || n > (counts.get(best) ?? 0)) best = v;
  return best;
}

/** What a fee cell shows, as one comparable string — two columns merge only when every branch reads the same. */
const cellKey = (f: CollegeFee | undefined) =>
  f
    ? JSON.stringify([f.feeInr, f.feeUsd, f.feePeriodicity, f.feeLabel, f.feeCurrency, f.feeNullReason, f.official, f.carried, f.year])
    : "";

/**
 * Under a fee bracket: what the figure is (tuition is called tuition only when it is the tuition alone), the
 * currency the college charges in, and "2025-26" for a fee not yet published for 2026-27.
 */
function FeeWhat({ fee }: { fee: CollegeFee }) {
  const { short, detail } = feeKind(fee.feeLabel);
  const earlier = !fee.official && (fee.carried || (fee.year ?? 0) <= 2025);
  // A dollar fee printed exactly carries its rupee conversion here; a bracketed one says it is charged in dollars.
  const dollars = fee.feeCurrency === "USD";
  const rupees = dollars && fee.official && fee.feeUsd != null && fee.feeUsd > 0 && fee.feeInr != null && fee.feeInr > 0;
  const bits = [
    short,
    fee.feePeriodicity === "not stated" ? "per year or whole course not stated" : null,
    rupees ? `≈ ${exactInr(fee.feeInr!)}` : dollars ? "charged in US$" : null,
    fee.official ? "2026-27" : earlier ? "2025-26" : null,
  ].filter(Boolean);
  if (!bits.length && !detail) return null;
  return (
    <span className="mt-0.5 block text-[11.5px] font-normal leading-snug text-muted-foreground">
      {bits.join(" · ")}
      {detail ? <span className="block">{detail}</span> : null}
    </span>
  );
}

function FeeCell({ fee }: { fee: CollegeFee | undefined }) {
  if (!fee) return <span className="text-muted-foreground">—</span>;
  if (fee.feeInr != null && fee.feeInr > 0) {
    // A 2026-27 notice's figure is printed as the notice gives it; anything else stays an approximate bracket.
    const exact = fee.official ? exactFeeFor(fee.feeInr, fee.feePeriodicity, fee.feeUsd, fee.feeCurrency) : null;
    return (
      <>
        {exact ?? approxFeeFor(fee.feeInr, fee.feePeriodicity)}
        <FeeWhat fee={fee} />
      </>
    );
  }
  return <span className="text-[13px] text-muted-foreground">{fee.feeNullReason ?? "Not published"}</span>;
}

export default function FeeTable({ fees }: { fees: CollegeFee[] }) {
  const branches = Array.from(new Set(fees.map((f) => f.course))).sort((a, b) => a.localeCompare(b));
  const byKey = new Map(fees.map((f) => [`${f.course}\u0000${f.quota}`, f]));
  const codes = Array.from(new Set(fees.map((f) => f.quota))).sort(
    (a, b) => familyRank(a) - familyRank(b) || a.localeCompare(b),
  );

  // Merge quota columns whose cells are identical on every branch.
  const columns: { codes: string[]; sig: string }[] = [];
  for (const code of codes) {
    const sig = branches.map((b) => cellKey(byKey.get(`${b}\u0000${code}`))).join("|");
    const same = columns.find((c) => c.sig === sig && familyRank(c.codes[0]) === familyRank(code));
    if (same) same.codes.push(code);
    else columns.push({ codes: [code], sig });
  }

  const th = "px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
  return (
    <>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse" style={{ minWidth: `${220 + columns.length * 170 + 220}px` }}>
          <thead>
            <tr className="bg-surface-2">
              <th scope="col" className={`${th} text-left`}>Branch</th>
              {columns.map((c) => (
                <th key={c.codes.join("/")} scope="col" className={`${th} text-right normal-case tracking-normal`}>
                  {c.codes.join(" / ")}
                </th>
              ))}
              <th scope="col" className={`${th} text-right`}>Hostel</th>
              <th scope="col" className={`${th} text-right`}>Stipend / mo</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => {
              const rows = fees.filter((f) => f.course === b);
              return (
                <tr key={b} className="border-t border-border align-top transition-colors hover:bg-surface-2">
                  <th scope="row" className="px-4 py-3 text-left text-[14px] font-medium text-foreground">{b}</th>
                  {columns.map((c) => (
                    <td key={c.codes.join("/")} className="tnum px-4 py-3 text-right text-[14px] text-foreground">
                      <FeeCell fee={byKey.get(`${b}\u0000${c.codes[0]}`)} />
                    </td>
                  ))}
                  <td className="tnum px-4 py-3 text-right text-[14px] text-muted-foreground">
                    {approxFee(mode(rows.map((r) => r.hostelMinInr))) ?? "—"}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-[14px] font-semibold text-signal-safe">
                    {money(mode(rows.map((r) => r.stipendY1Inr)))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] text-muted-foreground">{FEE_TABLE_NOTE}</p>
    </>
  );
}
