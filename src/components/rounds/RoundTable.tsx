import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { RoundMove } from "@/lib/roundQueries";

const num = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-IN"));

/**
 * One side of the round-1 story.
 *
 * `direction` decides the colour and the arrow, but the numbers are the same
 * either way: where round 1 closed, where a later round reached, and the gap.
 */
export default function RoundTable({
  moves,
  direction,
  collegeHref,
  emptyNote,
}: {
  moves: RoundMove[];
  direction: "opened" | "tightened";
  collegeHref: (slug: string) => string;
  emptyNote: string;
}) {
  const opened = direction === "opened";

  if (moves.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-[14px] leading-relaxed text-muted-foreground">
        {emptyNote}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[720px] border-collapse">
        <caption className="sr-only">
          {opened
            ? "Seats out of reach in round 1 that a later round reached"
            : "Seats reachable in round 1 whose later rounds closed tighter"}
        </caption>
        <thead>
          <tr className="bg-surface-2">
            {["Institute", "Course", "Quota", "Year", "Round 1", "Later round", "Movement"].map(
              (h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${
                    i >= 4 ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {moves.map((m, i) => (
            <tr key={i} className="border-t border-border transition-colors hover:bg-surface-2">
              <td className="max-w-[240px] px-4 py-3">
                <Link
                  href={collegeHref(m.instituteSlug)}
                  className="block truncate text-[14px] font-medium text-foreground hover:text-primary"
                >
                  {m.institute}
                </Link>
                <span className="text-[12px] text-muted-foreground">{m.state ?? "—"}</span>
              </td>
              <td className="max-w-[140px] truncate px-4 py-3 text-[13px] text-muted-foreground">
                {m.course}
              </td>
              <td className="max-w-[150px] truncate px-4 py-3 text-[13px] text-muted-foreground">
                {m.quota}
              </td>
              <td className="tnum px-4 py-3 text-right text-[13px] text-muted-foreground">{m.year}</td>
              <td className="tnum px-4 py-3 text-right text-[14px] text-muted-foreground">
                {num(m.r1)}
              </td>
              <td className="tnum px-4 py-3 text-right text-[14px] font-semibold text-foreground">
                {num(m.later)}
                {m.laterRound && (
                  <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                    {m.laterRound}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <span
                  className={`tnum inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold ${
                    opened
                      ? "bg-accent-soft text-accent"
                      : "bg-signal-stretch/10 text-signal-stretch"
                  }`}
                >
                  {opened ? (
                    <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {m.movement == null ? "—" : `${m.movement > 0 ? "+" : ""}${num(m.movement)}`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
