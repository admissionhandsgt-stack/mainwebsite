"use client";

import { useState } from "react";
import { Loader2, Lock, MapPin, Search } from "lucide-react";
import AuthDialog from "@/components/lead/AuthDialog";
import { GATED_CLASS } from "@/lib/paywall";
import type { QuotaSlice } from "@/lib/seatSummary";

/**
 * What stands where the table would be, for a visitor who has not signed in.
 *
 * It has to do two jobs that pull against each other: convince somebody the
 * numbers behind it are real and specific, and not be the numbers. So it shows
 * counts, and **per quota** a rank range and a fee range — which is genuinely
 * the shape of the answer, and cannot be turned back into rows.
 *
 * Per quota rather than overall because a government seat closing at 2,130 and a
 * management seat closing at 2,20,761 are not two ends of one scale. Presenting
 * them as one range is the bug the user caught on 2026-09-25, and it would be
 * the same bug here.
 *
 * The rank range and the fee range are printed in separate columns and never
 * combined into a sentence, because within a quota they are still minima and
 * maxima over different colleges — the cheapest fee does not belong to the
 * widest rank. The footnote says so rather than leaving the reader to pair them.
 */

const inr = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));

const money = (v: number | null | undefined) => {
  if (v == null) return "—";
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};

function span(from: number | null, to: number | null, format: (v: number | null) => string): string {
  if (from == null && to == null) return "not published";
  if (from == null || to == null) return format(from ?? to);
  if (from === to) return format(from);
  return `${format(from)} – ${format(to)}`;
}

export default function LockedSummary({
  total,
  noun,
  what,
  stats,
  quotas,
  states = [],
  showFee = true,
  unitLabel = "colleges",
  level = "pg",
  onUnlocked,
}: {
  /** How many rows are behind the gate. */
  total: number;
  noun: string;
  /** One line naming what a row would contain, so the offer is concrete. */
  what: string;
  stats: [string, string][];
  quotas: QuotaSlice[];
  states?: { state: string; seats: number }[];
  showFee?: boolean;
  /** What a quota's group is counted in — colleges on a branch page, branches on a college's own. */
  unitLabel?: string;
  level?: "ug" | "pg";
  /** Fetch and render the rows, without losing the reader's place. */
  onUnlocked: () => void | Promise<void>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const unlocked = async () => {
    setLoading(true);
    setFailed(false);
    try {
      await onUnlocked();
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        data-testid="locked-summary"
        className={`${GATED_CLASS} mt-5 overflow-hidden rounded-2xl border border-border bg-card`}
      >
        <div className="border-b border-border bg-surface-2 px-5 py-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <Lock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="tnum">{inr(total)}</span> {noun} — {what}
            </span>
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Here is what they add up to. Sign in with your phone number to see the rows themselves.
          </p>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          {stats.map(([label, value]) => (
            <div key={label} className="px-5 py-4">
              <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {label}
              </dt>
              <dd className="tnum font-heading mt-1 text-xl font-extrabold text-foreground">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {quotas.length > 0 && (
          <div className="border-t border-border">
            <p className="px-5 pt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              By quota
            </p>
            <div className="overflow-x-auto px-5 pb-4 pt-2.5">
              <p className="mb-1.5 sticky left-0 text-[12px] text-muted-foreground sm:hidden" aria-hidden="true">Swipe the table sideways for every column →</p>
              <table className="w-full min-w-[500px] border-collapse">
                <thead>
                  <tr>
                    {["Quota", "Seats", "Closing ranks", ...(showFee ? ["Fee a year"] : [])].map(
                      (h, i) => (
                        <th
                          key={h}
                          scope="col"
                          className={`pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${
                            i === 0 ? "text-left" : "text-right"
                          }`}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {quotas.map((q) => (
                    <tr key={q.quota} className="border-t border-border">
                      <td className="py-2.5 pr-3 align-top text-[13.5px] leading-snug text-foreground">
                        {q.quota}
                        {q.colleges > 1 && (
                          <span className="block text-[11.5px] text-muted-foreground">
                            {inr(q.colleges)} {unitLabel}
                          </span>
                        )}
                      </td>
                      <td className="tnum py-2.5 text-right align-top text-[13.5px] text-foreground">
                        {q.seats > 0 ? inr(q.seats) : "—"}
                      </td>
                      <td className="tnum py-2.5 pl-3 text-right align-top text-[13.5px] text-foreground">
                        {span(q.rankFrom, q.rankTo, inr)}
                      </td>
                      {showFee && (
                        <td className="tnum py-2.5 pl-3 text-right align-top text-[13.5px] text-foreground">
                          {span(q.feeFrom, q.feeTo, money)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-border px-5 py-3 text-[12px] leading-relaxed text-muted-foreground">
              Each column is a range in its own right — the cheapest fee is not the widest rank
              {quotas.some((q) => q.colleges > 1) ? ", and they are often different colleges" : ""}.
              Which is which is in the full table.
            </p>
          </div>
        )}

        {states.length > 1 && (
          <div className="border-t border-border px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Where the seats are
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {states.map((s) => (
                <span
                  key={s.state}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-[12.5px] text-foreground"
                >
                  <MapPin className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  {s.state}
                  <span className="tnum text-muted-foreground">{inr(s.seats)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border bg-surface-2 px-5 py-6 text-center">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            disabled={loading}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            Show me all {inr(total)} {noun}
          </button>
          <p className="mx-auto mt-2.5 max-w-[46ch] text-[12.5px] leading-relaxed text-muted-foreground">
            Your phone number, once. No payment, and no password the first time.
          </p>
          {failed && (
            <p className="mt-2 text-[12.5px] font-semibold text-signal-stretch">
              That did not load. Reload the page and it will be there.
            </p>
          )}
        </div>
      </div>

      <AuthDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onUnlocked={unlocked}
        lockedCount={total}
        level={level}
        rank={0}
        category=""
        noun={noun}
        alreadyShown
      />
    </>
  );
}
