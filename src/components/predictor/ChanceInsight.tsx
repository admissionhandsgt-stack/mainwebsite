"use client";

import { Lock, MapPin, ShieldCheck, Sparkles, TrendingUp, ArrowRight, Award } from "lucide-react";
import { CHANCE, CHANCE_ORDER, type ChanceBand } from "@/lib/chance";
import type { PredictData, RoundsData } from "./chanceTypes";
import PowerLine from "./PowerLine";

/**
 * What anybody gets for a rank, before signing in — and the reason to sign in.
 *
 * Everything here is a count or a share over the whole result: how many seat
 * options and colleges the rank reached, how they split by chance, where the
 * rank stands among everyone who sat the paper, and how much moves after
 * round 1. None of it names a college; the list itself is the step after.
 */

export const CHANCE_TONE: Record<ChanceBand, { bar: string; text: string; soft: string; ring: string }> = {
  safe: { bar: "bg-signal-safe", text: "text-signal-safe", soft: "bg-signal-safe/10", ring: "border-signal-safe/30" },
  likely: {
    bar: "bg-signal-borderline",
    text: "text-signal-borderline",
    soft: "bg-signal-borderline/10",
    ring: "border-signal-borderline/30",
  },
  possible: { bar: "bg-primary", text: "text-primary", soft: "bg-primary/10", ring: "border-primary/30" },
  stretch: {
    bar: "bg-signal-stretch",
    text: "text-signal-stretch",
    soft: "bg-signal-stretch/10",
    ring: "border-signal-stretch/30",
  },
};

const inr = (n: number) => n.toLocaleString("en-IN");

/** The share of candidates this rank is ahead of, as a ring. */
function Ring({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, value));
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0" role="img" aria-label={`Ahead of ${filled}% of candidates`}>
      <circle cx="60" cy="60" r={r} className="fill-none stroke-border" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        className="fill-none stroke-primary"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${(filled / 100) * c} ${c}`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="58" textAnchor="middle" className="fill-foreground font-heading text-[22px] font-extrabold">
        {filled >= 99.95 ? "99.9" : filled.toFixed(1)}%
      </text>
      <text x="60" y="76" textAnchor="middle" className="fill-muted-foreground text-[11.5px] font-semibold">
        AHEAD OF
      </text>
    </svg>
  );
}

export function ChanceBar({ counts, total }: { counts: Record<ChanceBand, number>; total: number }) {
  if (!total) return null;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-border" aria-hidden="true">
        {CHANCE_ORDER.map((b) =>
          counts[b] ? (
            <span key={b} className={CHANCE_TONE[b].bar} style={{ width: `${(counts[b] / total) * 100}%` }} />
          ) : null,
        )}
      </div>
      <ul
        className={`mt-3 grid grid-cols-2 gap-2 ${
          ["sm:grid-cols-1", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-4"][
            CHANCE_ORDER.filter((b) => counts[b] > 0).length
          ]
        }`}
      >
        {CHANCE_ORDER.filter((b) => counts[b] > 0).map((b) => (
          <li key={b} className={`rounded-xl border ${CHANCE_TONE[b].ring} ${CHANCE_TONE[b].soft} px-3 py-2`}>
            <span className={`text-[11px] font-bold uppercase tracking-wide ${CHANCE_TONE[b].text}`}>{CHANCE[b].label}</span>
            <span className="tnum font-heading block text-xl font-extrabold text-foreground">{inr(counts[b])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A college card with nothing in it, to show the shape of what is waiting. */
function GhostCard({ band }: { band: ChanceBand }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <span className="h-4 w-2/3 rounded bg-muted" />
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${CHANCE_TONE[band].soft} ${CHANCE_TONE[band].text}`}>
          {CHANCE[band].label}
        </span>
      </div>
      <span className="mt-2 block h-3 w-1/3 rounded bg-muted" />
      <div className="mt-4 flex gap-2">
        <span className="h-6 w-20 rounded-full bg-muted" />
        <span className="h-6 w-24 rounded-full bg-muted" />
      </div>
    </div>
  );
}

export default function ChanceInsight({
  data,
  rounds,
  rank,
  category,
  courseLabel,
  onUnlock,
}: {
  data: PredictData;
  rounds: RoundsData | null;
  rank: number;
  category: string;
  courseLabel: string;
  onUnlock: () => void;
}) {
  const reach = data.counts.safe + data.counts.likely + data.counts.possible;
  const ghostBands = CHANCE_ORDER.filter((b) => data.counts[b] > 0).slice(0, 3);

  if (!data.total) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center md:p-8">
        <h2 className="font-heading text-xl font-bold text-foreground">No published seat reached this rank</h2>
        <p className="mx-auto mt-2 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
          In {courseLabel}, {category}, no seat we hold went as far as rank {inr(rank)} in the published rounds. That is not
          the end of it — management, NRI and state-specific routes work differently, and a counsellor can tell you which
          ones are realistic.
        </p>
        <button
          type="button"
          onClick={onUnlock}
          className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 text-[15px] font-bold text-white shadow-glow"
        >
          Talk to a counsellor <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ---------------- the headline ---------------- */}
      <section className="overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-lift">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:p-8">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary-strong dark:text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Your possibility report · {courseLabel}
            </p>
            <h2 data-aa-mask className="font-heading mt-3 text-[clamp(1.5rem,3.4vw,2.2rem)] font-extrabold leading-tight text-foreground">
              Rank <span className="tnum">{inr(rank)}</span> reached{" "}
              <span className="text-gradient-brand tnum">{inr(data.total)}</span> seat options
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              in <b className="tnum text-foreground">{inr(data.shape.colleges)} colleges</b> across{" "}
              <b className="tnum text-foreground">{inr(data.shape.states)} states</b> for the {category} category, judged
              against where the published cuts actually landed.
            </p>
          </div>
          <div className="flex items-center gap-4 md:flex-col md:items-center md:justify-center">
            <Ring value={data.insight.aheadOf} />
            <p className="max-w-[18ch] text-[12.5px] leading-snug text-muted-foreground md:text-center">
              of the <b className="tnum text-foreground">{inr(data.insight.appeared)}</b> who sat {data.insight.exam}
            </p>
          </div>
        </div>
        <div className="border-t border-border bg-surface-2 px-6 py-5 md:px-8">
          <ChanceBar counts={data.counts} total={data.total} />
        </div>
      </section>

      <PowerLine lead="Two students with your rank can end up a whole tier apart — one choice order, one round, one quota apart." />

      {/* ---------------- three facts ---------------- */}
      <section className="grid gap-4 md:grid-cols-3">
        {rounds && rounds.openedTotal > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <TrendingUp className="h-5 w-5 text-accent" aria-hidden="true" />
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              <b className="tnum font-heading text-2xl font-extrabold text-foreground">{inr(rounds.openedTotal)}</b>
              <br />
              seats that had closed above your rank in round 1 reached ranks like yours in later rounds. Freezing too early is
              how families lose these.
            </p>
          </div>
        )}
        {data.insight.topStates.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
            <p className="mt-2 text-[13px] font-semibold text-foreground">Where your rank goes furthest</p>
            <ul className="mt-2 space-y-1.5">
              {data.insight.topStates.map((s) => (
                <li key={s.state} className="flex items-center justify-between gap-3 text-[13.5px]">
                  <span className="truncate text-foreground">{s.state}</span>
                  <span className="tnum shrink-0 text-muted-foreground">{inr(s.colleges)} colleges</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.shape.fee ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <Award className="h-5 w-5 text-signal-borderline" aria-hidden="true" />
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              <b className="font-heading text-2xl font-extrabold text-foreground">{data.shape.fee}</b>
              <br />
              the spread of tuition across these options. Two seats a rank apart can differ by lakhs a year.
            </p>
          </div>
        ) : rounds && rounds.tightenedTotal > 0 ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <Award className="h-5 w-5 text-signal-borderline" aria-hidden="true" />
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              <b className="tnum font-heading text-2xl font-extrabold text-foreground">{inr(rounds.tightenedTotal)}</b>
              <br />
              seats within reach of your rank in round 1 closed tighter in later rounds. Let one go, and it may not come
              back.
            </p>
          </div>
        ) : null}
      </section>

      {/* ---------------- what is waiting ---------------- */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface-2 p-5 md:p-6">
        <div className="pointer-events-none grid select-none gap-3 opacity-60 blur-[3px] sm:grid-cols-2 lg:grid-cols-3">
          {ghostBands.map((b) => (
            <GhostCard key={b} band={b} />
          ))}
          {ghostBands.map((b) => (
            <GhostCard key={`${b}-2`} band={b} />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/95 via-background/70 to-background/30 p-4">
          <div className="max-w-md rounded-2xl border border-primary/30 bg-card p-6 text-center shadow-lift">
            <Lock className="mx-auto h-6 w-6 text-primary" aria-hidden="true" />
            <h3 className="font-heading mt-2 text-lg font-extrabold text-foreground">
              Your list of {inr(reach)} reachable options is ready
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
              See which colleges, your chance at each, and an approximate fee — then shape it to your budget, states and
              preferences.
            </p>
            <button
              type="button"
              onClick={onUnlock}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5"
            >
              See my colleges — free <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Sign in with your mobile. No payment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
