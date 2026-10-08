import type { FeeBand } from "@/lib/pgFeeQueries";

export const lakh = (v: number | null | undefined) => {
  if (v == null) return "—";
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};

/** Fee bands by quota family: median, and where most seats sit (10th–90th percentile). */
export default function FeeBandTable({ bands }: { bands: FeeBand[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Quota</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Median a year</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Most seats</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bands.map((b) => (
            <tr key={b.family}>
              <th scope="row" className="px-4 py-3 font-semibold text-foreground">{b.family}</th>
              <td className="tnum px-4 py-3 text-right text-muted-foreground">{b.colleges.toLocaleString("en-IN")}</td>
              <td className="tnum px-4 py-3 text-right font-semibold">{lakh(b.median)}</td>
              <td className="tnum px-4 py-3 text-right text-muted-foreground">
                {lakh(b.p10)} – {lakh(b.p90)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
