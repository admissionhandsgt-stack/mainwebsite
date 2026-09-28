"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import LockedSummary from "@/components/seats/LockedSummary";
import ProfileTuner from "@/components/lead/ProfileTuner";
import CounsellingCTA from "@/components/lead/CounsellingCTA";
import { GATED_CLASS } from "@/lib/paywall";
import type { SeatSummary } from "@/lib/seatSummary";

/**
 * The seat table, or the reason you cannot see it yet.
 *
 * **The server decides, not this component.** A page calls `canSeeDepthServer()`
 * and passes either every row or none — so a visitor who has not signed in never
 * receives a single seat row, in the HTML or anywhere else. There is nothing to
 * read out of the network tab and nothing to find by disabling JavaScript,
 * because it was never sent.
 *
 * An earlier version shipped 40 rows into the HTML and fetched the rest. That
 * was a reasonable compromise for search, and it is now unnecessary: a verified
 * crawler is served the whole table through the same server-side check, and
 * every page carrying one of these declares the gate in its JSON-LD. See
 * `lib/crawler.ts` and `lib/paywall.ts`.
 *
 * What a locked visitor gets instead is `SeatSummary` — counts, and per-quota
 * rank and fee ranges. Enough to know the answer is real and specific to them,
 * and not enough to be the answer.
 */

export interface SeatRow {
  college: string;
  slug: string;
  state: string | null;
  ownership: string;
  quota: string;
  /** PG branch pages omit this; the quota pages show it. */
  course?: string;
  seats: number;
  r1: number | null;
  widest: number | null;
  feeInr: number | null;
  feeMaxInr?: number | null;
}

const inr = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));

const money = (v: number | null | undefined) => {
  if (v == null) return "—";
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};

export default function GatedSeatTable({
  rows: initialRows,
  total,
  summary,
  query,
  collegeBase,
  showCourse = false,
  showFee = true,
  noun,
  level = "pg",
  branches = [],
  states = [],
  presetProfile,
  counsellingHeadline,
}: {
  /** Every row, or none. Never a slice. */
  rows: SeatRow[];
  /** How many rows exist, so the lock can say what is behind it. */
  total: number;
  /** What a locked visitor is shown in place of the rows. */
  summary: SeatSummary;
  /** Query string for `/api/seat-rows`, e.g. `kind=branch&slug=…&category=GEN`. */
  query: string;
  collegeBase: string;
  showCourse?: boolean;
  showFee?: boolean;
  noun: string;
  /** For the tuner: which category set and whether branches apply. */
  level?: "ug" | "pg";
  /** Facets from the page, so the tuner offers what the data actually holds. */
  branches?: string[];
  states?: string[];
  /**
   * What the page already knows about them from the URL they are on.
   *
   * A branch page *is* a branch preference. Asking "which branch?" to somebody
   * reading the General Medicine page wastes the question and looks careless;
   * passing it here records it and drops the step.
   */
  presetProfile?: { preferredBranch?: string };
  counsellingHeadline?: string;
}) {
  const [rows, setRows] = useState<SeatRow[]>(initialRows);
  /**
   * The tuner is shown to somebody who *just* unlocked, not to everybody with a
   * session. That moment is the only one where five questions are obviously
   * worth answering — the seats are on screen and each answer visibly narrows
   * them. Asking a returning visitor the same questions on every page would be
   * a form tax, and they have already been saved to the account anyway.
   */
  const [justUnlocked, setJustUnlocked] = useState(false);

  /**
   * After signing in inside the dialog, fetch the rows rather than reloading.
   *
   * The only reason this endpoint exists now: the server already made the
   * decision for the page render, and this is how the page catches up without
   * throwing away what the visitor was reading.
   */
  const load = async () => {
    const res = await fetch(`/api/seat-rows?${query}`);
    if (!res.ok) throw new Error(`seat-rows ${res.status}`);
    const json = await res.json();
    if (!json?.rows?.length) throw new Error("no rows");
    setRows(json.rows);
    setJustUnlocked(true);
  };

  if (rows.length === 0) {
    return (
      <LockedSummary
        total={total}
        noun={noun}
        what="college, quota, rank and fee on every row"
        stats={[
          ["Seats", inr(summary.seats)],
          ["Colleges", inr(summary.colleges)],
          ["States", inr(summary.states)],
          ["Quotas", inr(summary.quotas.length)],
        ]}
        quotas={summary.quotas}
        states={summary.topStates}
        showFee={showFee}
        onUnlocked={load}
      />
    );
  }

  const cols: [string, string][] = [
    ["College", showCourse ? "w-[28%] text-left" : "w-[32%] text-left"],
    ...(showCourse ? ([["Branch", "w-[18%] text-left"]] as [string, string][]) : []),
    ["Quota", showCourse ? "w-[16%] text-left" : "w-[20%] text-left"],
    ["Seats", "w-[10%] text-right"],
    ["R1 close", "w-[12%] text-right"],
    ["Widest", "w-[12%] text-right"],
    ...(showFee ? ([["Fee / yr", "w-[12%] text-right"]] as [string, string][]) : []),
  ];

  return (
    <>
      {justUnlocked && (
        <div className="mt-5">
          <ProfileTuner
            level={level}
            branches={branches}
            states={states}
            initial={presetProfile}
            source={noun}
            onDone={() => setJustUnlocked(false)}
            onSkip={() => setJustUnlocked(false)}
          />
        </div>
      )}

      <div
        data-testid="seat-table"
        className={`${GATED_CLASS} mt-5 overflow-x-auto rounded-2xl border border-border bg-card`}
      >
      <table className="w-full min-w-[760px] table-fixed border-collapse">
        <thead>
          <tr className="bg-surface-2">
            {cols.map(([h, cls]) => (
              <th
                key={h}
                scope="col"
                className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${cls}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={`${r.slug}-${r.quota}-${r.course ?? ""}-${i}`}
              className="border-t border-border hover:bg-surface-2"
            >
              <td className="px-4 py-3 align-top">
                <Link
                  href={`${collegeBase}/${r.slug}`}
                  className="-my-1.5 block py-1.5 text-[14px] font-semibold leading-snug text-foreground hover:text-primary"
                >
                  {r.college}
                </Link>
                <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {r.state ?? "—"}
                  {r.ownership !== "other" && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{r.ownership}</span>
                    </>
                  )}
                </p>
              </td>
              {showCourse && (
                <td className="px-4 py-3 align-top text-[13.5px] leading-snug text-foreground">
                  {r.course}
                </td>
              )}
              <td className="px-4 py-3 align-top text-[12.5px] leading-snug text-muted-foreground">
                {r.quota}
              </td>
              <td className="tnum px-4 py-3 text-right align-top text-[14px] text-foreground">
                {r.seats}
              </td>
              <td className="tnum px-4 py-3 text-right align-top text-[14px] text-muted-foreground">
                {inr(r.r1)}
              </td>
              <td className="tnum px-4 py-3 text-right align-top text-[14px] font-semibold text-foreground">
                {inr(r.widest)}
              </td>
              {showFee && (
                <td className="tnum px-4 py-3 text-right align-top text-[14px] font-semibold text-foreground">
                  {money(r.feeInr)}
                  {r.feeMaxInr != null && (
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      to {money(r.feeMaxInr)}
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      <CounsellingCTA
        className="mt-6"
        source={noun}
        headline={counsellingHeadline}
      />
    </>
  );
}
