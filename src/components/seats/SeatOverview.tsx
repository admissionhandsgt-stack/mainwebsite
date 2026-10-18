import Link from "@/components/ui/Link";
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { approxFee, FEE_FOOTNOTE } from "@/lib/chance";
import type { SeatSummary } from "@/lib/seatSummary";

/**
 * What a branch or quota page shows in place of a seat table (2026-10-12).
 *
 * There is no seat table behind it any more: no closing rank for a named
 * college is shown to anyone (lib/depth.ts). This is the same for every
 * visitor and every crawler, so there is nothing to declare and nothing to
 * gate — the per-college answer is the chance view after sign-in, and the
 * counsellor.
 *
 * A quota's rank range is printed only when at least `MIN_COLLEGES` colleges
 * sit in it. A "range" over one college is that college's cut under another
 * name; over two it is still nearly so.
 */
const MIN_COLLEGES = 3;

const inr = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));

function rankSpan(from: number | null, to: number | null): string {
  if (from == null && to == null) return "—";
  if (from == null || to == null || from === to) return inr(from ?? to);
  return `${inr(from)} – ${inr(to)}`;
}

export default function SeatOverview({
  summary,
  noun = "seat options",
  showFee = true,
  unitLabel = "colleges",
  ctaHref,
  ctaLabel = "See my chance at these colleges",
}: {
  summary: SeatSummary;
  noun?: string;
  showFee?: boolean;
  unitLabel?: string;
  ctaHref: string;
  ctaLabel?: string;
}) {
  const stats: [string, string][] = [
    [noun, inr(summary.rows)],
    ["Seats", summary.seats > 0 ? inr(summary.seats) : "—"],
    [unitLabel, inr(summary.colleges)],
    ["States", inr(summary.states)],
  ];

  return (
    <div data-testid="seat-overview" className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
      <dl className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        {stats.map(([label, value]) => (
          <div key={label} className="px-5 py-4">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
            <dd className="tnum font-heading mt-1 text-xl font-extrabold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      {summary.quotas.length > 0 && (
        <div className="border-t border-border">
          <p className="px-5 pt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            By quota
          </p>
          <div className="overflow-x-auto px-5 pb-4 pt-2.5">
            <p className="sticky left-0 mb-1.5 text-[12px] text-muted-foreground sm:hidden" aria-hidden="true">
              Swipe the table sideways for every column →
            </p>
            <table className="w-full min-w-[500px] border-collapse">
              <thead>
                <tr>
                  {["Quota", "Seats", `Ranks across ${unitLabel}`, ...(showFee ? ["Tuition a year*"] : [])].map(
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
                {summary.quotas.map((q) => (
                  <tr key={q.quota} className="border-t border-border">
                    <td className="py-2.5 pr-3 align-top text-[13.5px] leading-snug text-foreground">
                      {q.quota}
                      <span className="block text-[11.5px] text-muted-foreground">
                        {inr(q.colleges)} {q.colleges === 1 ? unitLabel.replace(/s$/, "") : unitLabel}
                      </span>
                    </td>
                    <td className="tnum py-2.5 text-right align-top text-[13.5px] text-foreground">
                      {q.seats > 0 ? inr(q.seats) : "—"}
                    </td>
                    <td className="tnum py-2.5 pl-3 text-right align-top text-[13.5px] text-foreground">
                      {q.colleges >= MIN_COLLEGES ? rankSpan(q.rankFrom, q.rankTo) : "With counsellor"}
                    </td>
                    {showFee && (
                      <td className="tnum py-2.5 pl-3 text-right align-top text-[13.5px] text-foreground">
                        {approxFee(q.feeFrom, q.feeTo)?.replace(/ \/yr\*$/, "") ?? "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-5 py-3 text-[12px] leading-relaxed text-muted-foreground">
            Ranks are a range across many {unitLabel} — the tightest round-1 close to the furthest any round reached —
            never one college&apos;s cut. Your chance at each college is shown after you sign in.
            {showFee ? ` ${FEE_FOOTNOTE}` : ""}
          </p>
        </div>
      )}

      {summary.topStates.length > 1 && (
        <div className="border-t border-border px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Where the seats are</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {summary.topStates.map((s) => (
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
        <Link
          href={ctaHref}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-[12.5px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          Free. Sign in with your mobile number — no payment.
        </p>
      </div>
    </div>
  );
}
