"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import LockedSummary from "@/components/seats/LockedSummary";
import { GATED_CLASS } from "@/lib/paywall";
import { branchSlug } from "@/lib/branchSlug";
import type { SeatSummary } from "@/lib/seatSummary";

/**
 * A college's cutoff table, or the shape of it.
 *
 * These ~3,500 pages carry the site's search traffic, and they used to publish
 * eight rows each into the HTML — about 28,000 rows of the product, free. They
 * now publish none: the page decides server-side and passes every row or no row.
 *
 * The rows are still indexed, because `canSeeDepthServer()` serves them to a
 * crawler whose IP is in Google's published ranges and the page declares the
 * gate with `isAccessibleForFree: false`. That is Google's own paywall pattern,
 * not a trick — and the declaration is what makes it one, so it is not optional.
 *
 * A visitor without a session gets the per-quota summary instead: how many
 * branches and seats sit under each quota and what ranks they closed at. It
 * tells them the answer exists and is about their situation, and leaves the
 * question of *which branch* to us.
 */

export interface CutoffRow {
  course: string;
  quota: string;
  category: string;
  counselling?: string | null;
  r1Latest: number | null;
  widestLatest: number | null;
  widestPrevious: number | null;
  seats: number | null;
}

const num = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-IN"));

function Movement({ row }: { row: CutoffRow }) {
  const delta =
    row.widestLatest != null && row.widestPrevious != null
      ? row.widestLatest - row.widestPrevious
      : null;

  if (delta == null) return <span className="text-[13px] text-muted-foreground">one year</span>;

  return (
    <span
      className={`tnum inline-flex items-center gap-1 text-[13px] font-medium ${
        delta > 0 ? "text-signal-safe" : delta < 0 ? "text-signal-stretch" : "text-muted-foreground"
      }`}
    >
      {delta > 0 ? (
        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
      ) : delta < 0 ? (
        <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
      ) : null}
      {delta > 0 ? "+" : ""}
      {delta.toLocaleString("en-IN")}
    </span>
  );
}

export default function CollegeCutoffs({
  slug,
  level,
  rows: initialRows,
  total,
  summary,
  years,
  showCounselling = false,
  collegeName,
}: {
  slug: string;
  level: "ug" | "pg";
  /** Every row, or none. Never a slice. */
  rows: CutoffRow[];
  /** How many rows exist in total, so the gate can say what is behind it. */
  total: number;
  /** What a locked visitor sees in place of the rows. */
  summary: SeatSummary;
  /** Which years the rows cover, for the summary's fourth stat. */
  years: string;
  showCounselling?: boolean;
  collegeName: string;
}) {
  const [rows, setRows] = useState<CutoffRow[]>(initialRows);

  /** After signing in, fetch the rows rather than making them reload the page. */
  const load = async () => {
    const res = await fetch(`/api/college-cutoffs?slug=${encodeURIComponent(slug)}&level=${level}`);
    if (!res.ok) throw new Error(`college-cutoffs ${res.status}`);
    const json = await res.json();
    if (!json?.rows?.length) throw new Error("no rows");
    setRows(json.rows);
  };

  if (rows.length === 0) {
    return (
      <LockedSummary
        total={total}
        noun="cutoff rows"
        what="branch, quota, category and the rank it closed at"
        stats={[
          ["Branches", summary.colleges.toLocaleString("en-IN")],
          ["Seats", summary.seats.toLocaleString("en-IN")],
          ["Quotas", summary.quotas.length.toLocaleString("en-IN")],
          ["Years", years],
        ]}
        quotas={summary.quotas}
        showFee={false}
        unitLabel="branches"
        level={level}
        onUnlocked={load}
      />
    );
  }

  return (
    <div className={`${GATED_CLASS} mt-5 overflow-x-auto rounded-2xl border border-border bg-card`}>
        <table className="w-full min-w-[720px] border-collapse">
          <caption className="sr-only">
            Published closing ranks for {collegeName}
          </caption>
          <thead>
            <tr className="bg-surface-2">
              {[
                "Branch",
                "Quota",
                "Cat.",
                ...(showCounselling ? ["Counselling"] : []),
                "R1 close",
                "Widest",
                "Movement",
                "Seats",
              ].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${
                    i >= (showCounselling ? 4 : 3) ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr
                key={`${c.course}-${c.quota}-${c.category}-${i}`}
                className="border-t border-border transition-colors hover:bg-surface-2"
              >
                <td className="px-4 py-3 text-[14px] font-medium text-foreground">
                  {/* PG branches have a page of their own; UG does not. The
                      link is also the reader's next question — "where else is
                      this branch within reach?" */}
                  {level === "pg" ? (
                    <Link
                      href={`/md-ms-india/branches/${branchSlug(c.course)}`}
                      className="hover:text-primary hover:underline"
                    >
                      {c.course}
                    </Link>
                  ) : (
                    c.course
                  )}
                </td>
                <td className="max-w-[180px] truncate px-4 py-3 text-[13px] text-muted-foreground">
                  {c.quota}
                </td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground">{c.category}</td>
                {showCounselling && (
                  <td className="max-w-[160px] truncate px-4 py-3 text-[13px] text-muted-foreground">
                    {c.counselling ?? "—"}
                  </td>
                )}
                <td className="tnum px-4 py-3 text-right text-[14px] font-semibold text-foreground">
                  {num(c.r1Latest)}
                </td>
                <td className="tnum px-4 py-3 text-right text-[14px] text-foreground">
                  {num(c.widestLatest)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Movement row={c} />
                </td>
                <td className="tnum px-4 py-3 text-right text-[14px] text-muted-foreground">
                  {num(c.seats)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
          Showing all <span className="tnum font-semibold text-foreground">{rows.length}</span>{" "}
          published seat rows for {collegeName}.
        </p>
      </div>
  );
}
