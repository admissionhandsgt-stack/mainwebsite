import Link from "@/components/ui/Link";
import { ArrowRight, Lock, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { BAND_FOOTNOTE } from "@/lib/chance";
import { TREND_LABEL, type BandRow } from "@/lib/cutoffBands";
import PowerLine from "@/components/predictor/PowerLine";

/**
 * "What is the cutoff here?", answered for search without giving the rank
 * away: general category, merit quotas, as a band (2026-10-12). Every other
 * category, NRI and management, and the round-by-round detail are the chance
 * view after sign-in, and the counsellor.
 */
export default function CutoffBands({
  rows,
  collegeName,
  level,
  ctaHref,
}: {
  rows: BandRow[];
  collegeName: string;
  level: "ug" | "pg";
  ctaHref: string;
}) {
  if (!rows.length) return null;
  const year = rows.find((r) => r.year)?.year;
  const courseHead = level === "pg" ? "Branch" : "Course";
  const hub = level === "pg" ? "/neet-pg-cutoff" : "/neet-ug-cutoff";

  return (
    <section aria-labelledby="bands-h">
      <h2 id="bands-h" className="font-heading text-xl font-bold text-foreground md:text-2xl">
        {collegeName} cutoff{year ? ` ${year}` : ""} — approximate band
      </h2>
      <p className="mt-1.5 max-w-[72ch] text-[14.5px] leading-relaxed text-muted-foreground">
        Where the last general-category seat was taken across all rounds, shown as a band. Other categories, NRI and
        management seats, and your own chance, are a free sign-in away.
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="bg-surface-2">
              {[courseHead, "Quota", "General closing band", "Trend"].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${
                    i >= 2 ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.course}|${r.quota}`} className="border-t border-border">
                <td className="px-4 py-3 text-[14px] font-medium text-foreground">{r.course}</td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground">{r.quota}</td>
                <td className="tnum px-4 py-3 text-right text-[14.5px] font-bold text-foreground">{r.band}</td>
                <td className="px-4 py-3 text-right text-[12.5px] text-muted-foreground">
                  {r.trend ? (
                    <span className="inline-flex items-center gap-1">
                      {r.trend === "easier" ? (
                        <TrendingUp className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                      ) : r.trend === "tighter" ? (
                        <TrendingDown className="h-3.5 w-3.5 text-signal-borderline" aria-hidden="true" />
                      ) : (
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {TREND_LABEL[r.trend]}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border bg-primary-soft/40">
              <td colSpan={4} className="px-4 py-3.5">
                <Link
                  href={ctaHref}
                  className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-primary-strong hover:underline dark:text-primary"
                >
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  OBC, SC, ST, EWS, PwD, NRI and management — see your own chance, free
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
        {BAND_FOOTNOTE} National category-wise cutoffs are on the{" "}
        <Link href={hub} className="text-primary hover:underline">
          {level === "pg" ? "NEET PG" : "NEET UG"} cutoff page
        </Link>
        .
      </p>
      <div className="mt-5">
        <PowerLine
          lead="A band shows where the last seat closed. Whether you get in depends on your quota, your choice order and the round you freeze."
          cta="See my chance here"
          href={ctaHref}
        />
      </div>
    </section>
  );
}
