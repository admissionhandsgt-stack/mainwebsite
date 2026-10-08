import type { CategoryCut } from "@/lib/cutoffHubQueries";

const n = (v: number | null) => (v == null ? "—" : v.toLocaleString("en-IN"));

/**
 * One row per category: how many seats, and the two ends of where they closed.
 *
 * The two rank columns are separate on purpose and labelled with what they are:
 * the tightest round-1 close and the furthest any round reached, over the same
 * group of seats. Neither is "the cutoff" of a college — that is on each
 * college's own page.
 */
export default function CategoryCutTable({
  cuts,
  rankLabel = "AIR",
  unit = "colleges",
}: {
  cuts: CategoryCut[];
  rankLabel?: string;
  unit?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Category</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">{unit === "colleges" ? "Colleges" : "Seats"}</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Round 1, tightest close ({rankLabel})</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Last rank admitted, any round ({rankLabel})</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {cuts.map((c) => (
            <tr key={c.category}>
              <th scope="row" className="px-4 py-3 font-semibold text-foreground">{c.category}</th>
              <td className="tnum px-4 py-3 text-right text-muted-foreground">{n(unit === "colleges" ? c.colleges : c.seats)}</td>
              <td className="tnum px-4 py-3 text-right text-foreground">{n(c.bestR1)}</td>
              <td className="tnum px-4 py-3 text-right font-semibold text-foreground">{n(c.widest)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
