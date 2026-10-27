"use client";

import { useState } from "react";
import Link from "@/components/ui/Link";
import { Building2, MapPin, SlidersHorizontal, Wallet } from "lucide-react";
import { CHANCE, CHANCE_ORDER, FEE_FOOTNOTE, type ChanceBand } from "@/lib/chance";
import { CHANCE_TONE, ChanceBar } from "./ChanceInsight";
import type { CollegeOptionView, PredictData } from "./chanceTypes";
import PowerLine from "./PowerLine";

/**
 * A verified student's colleges, in chance words.
 *
 * Grouped by the best chance each college offers, strongest first, and inside
 * a chance in the order the server sent — the most sought-after college first,
 * as a counsellor would read the list. No closing rank appears anywhere: the
 * words are the answer, the counsellor is the detail.
 */

const PER_BAND = 12;
const inr = (n: number) => n.toLocaleString("en-IN");

const OWNERSHIP: Record<string, string> = {
  government: "Government",
  private: "Private",
  deemed: "Deemed",
};

function Badge({ band }: { band: ChanceBand }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${CHANCE_TONE[band].ring} ${CHANCE_TONE[band].soft} ${CHANCE_TONE[band].text}`}
    >
      {CHANCE[band].label}
    </span>
  );
}

function CollegeCard({ c, base }: { c: CollegeOptionView; base: string }) {
  return (
    <li className="flex flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <Link href={`${base}/${c.slug}`} className="font-heading text-[15.5px] font-bold leading-snug text-foreground hover:text-primary">
          {c.name}
        </Link>
        <Badge band={c.best} />
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
        {c.state && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {c.state}
          </span>
        )}
        {c.ownership && OWNERSHIP[c.ownership] && (
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> {OWNERSHIP[c.ownership]}
          </span>
        )}
        {c.fee && (
          <span className="tnum inline-flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" /> {c.fee}
          </span>
        )}
      </p>
      {c.branches.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {c.branches.slice(0, 4).map((b) => (
            <li
              key={b.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[12px] text-foreground"
            >
              <span className={`h-2 w-2 rounded-full ${CHANCE_TONE[b.best].bar}`} aria-hidden="true" />
              {b.name}
              <span className="sr-only"> — {CHANCE[b.best].label}</span>
            </li>
          ))}
          {c.branches.length > 4 && (
            <li className="rounded-full px-2 py-1 text-[12px] text-muted-foreground">+{c.branches.length - 4} more</li>
          )}
        </ul>
      )}
      <p className="mt-auto pt-3 text-[12px] text-muted-foreground">
        {inr(c.options)} seat option{c.options === 1 ? "" : "s"} for you here
      </p>
    </li>
  );
}

export default function ChanceResults({
  data,
  level,
  courseLabel,
  rank,
  category,
  preferencesOn,
  onTogglePreferences,
  onEdit,
}: {
  data: PredictData;
  level: "ug" | "pg";
  courseLabel: string;
  rank: number;
  category: string;
  preferencesOn: boolean;
  onTogglePreferences: () => void;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState<Record<ChanceBand, boolean>>({ safe: false, likely: false, possible: false, stretch: false });
  const options = data.options ?? [];
  const home = Array.from(new Set(data.query?.home ?? []));
  const base = level === "pg" ? "/md-ms-india/colleges" : "/mbbs-india/colleges";
  const byBand = CHANCE_ORDER.map((b) => ({ band: b, list: options.filter((o) => o.best === b) })).filter((g) => g.list.length);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-primary/25 bg-card p-6 shadow-lift md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p data-aa-mask className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {courseLabel} · rank <span className="tnum">{inr(rank)}</span> · {category}
            </p>
            <h2 className="font-heading mt-1 text-[clamp(1.4rem,3vw,2rem)] font-extrabold leading-tight text-foreground">
              <span className="text-gradient-brand tnum">{inr(options.length)}</span> colleges for you
            </h2>
            <p className="mt-1 text-[14px] text-muted-foreground">
              {inr(data.total)} seat options in {inr(data.shape.states)} states
              {preferencesOn ? ", matched to your preferences" : ", all of India"}.
            </p>
            {preferencesOn && home.length > 0 && (
              <p className="mt-1.5 max-w-[60ch] text-[13px] leading-relaxed text-muted-foreground">
                State-quota seats are shown for {home.join(" and ")} only. All India, deemed and central seats, management
                seats and every seat a state opens to all of India are shown wherever they are.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onTogglePreferences}
              aria-pressed={preferencesOn}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground hover:border-primary/40"
            >
              {preferencesOn ? "Show all of India" : "Use my preferences"}
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary-soft px-4 text-[13.5px] font-semibold text-primary-strong dark:text-primary"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Edit preferences
            </button>
          </div>
        </div>
        <div className="mt-5">
          <ChanceBar counts={data.counts} total={data.total} />
        </div>
      </section>

      <PowerLine lead="This list shows where seats closed. Where you get in depends on the order you fill and the round you freeze." />

      {byBand.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-[15px] text-muted-foreground">
          Nothing matches all of your preferences together. Try “Show all of India”, or widen the budget.
        </p>
      )}

      {byBand.map(({ band, list }) => (
        <section key={band} aria-labelledby={`band-${band}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id={`band-${band}`} className="font-heading text-lg font-extrabold text-foreground">
              <span className={CHANCE_TONE[band].text}>{CHANCE[band].label}</span>{" "}
              <span className="tnum text-muted-foreground">· {inr(list.length)}</span>
            </h3>
            <p className="text-[13px] text-muted-foreground">{CHANCE[band].hint}</p>
          </div>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(open[band] ? list : list.slice(0, PER_BAND)).map((c) => (
              <CollegeCard key={c.slug} c={c} base={base} />
            ))}
          </ul>
          {list.length > PER_BAND && !open[band] && (
            <button
              type="button"
              onClick={() => setOpen({ ...open, [band]: true })}
              className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground hover:border-primary/40"
            >
              Show all {inr(list.length)}
            </button>
          )}
        </section>
      ))}

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Chances come from where the published cuts actually landed in past rounds — history, not a guarantee, and not a
        forecast. {FEE_FOOTNOTE}
      </p>
    </div>
  );
}
