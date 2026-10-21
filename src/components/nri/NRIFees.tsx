import Link from "@/components/ui/Link";
import { ArrowRight, Building2, Coins, FileText, Info, Landmark, RefreshCw, ShieldAlert } from "lucide-react";
import { getNriColleges, type NriFeeSpread } from "@/lib/nriColleges";
import { getQuotaStates } from "@/lib/quotaQueries";
import { pageCopy } from "@/lib/pageCopy";

/**
 * The NRI page's fee section (rebuilt 2026-10-18).
 *
 * It was three cards of typed figures — MBBS NRI "annual tuition ₹15–25 lakh",
 * "development fee ₹50K–1 lakh", "total ₹85 L–1.35 Cr" — for which no source
 * existed: the UG counselling results publish no fee per quota at all. Now it
 * shows only what was published, for MD/MS, where every NRI seat carries the
 * college's own fee; and says plainly that MBBS is not covered, and why.
 *
 * Middle-80% ranges and medians, never min–max: the extremes are a whole-course
 * dollar figure and a few non-clinical branches, and a range built on them
 * describes no seat anybody is offered.
 */

const money = (v: number | null | undefined) => {
  if (v == null) return "—";
  if (v >= 10_000_000) return `₹${+(v / 10_000_000).toFixed(2)} Cr`;
  if (v >= 100_000) return `₹${+(v / 100_000).toFixed(1)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};

function SpreadCard({ icon: Icon, title, sub, spread }: { icon: typeof Building2; title: string; sub: string; spread?: NriFeeSpread }) {
  if (!spread) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_18px_40px_-22px_rgb(8_145_178/0.45)] md:p-5">
      <span className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-400/25 to-teal-400/10 blur-2xl" aria-hidden="true" />
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-glow" aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">{title}</h3>
          <p className="text-[13px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Middle NRI seat</dt>
          <dd className="tnum font-heading mt-1 text-[1.5rem] font-extrabold leading-tight text-foreground">{money(spread.medianFee)}</dd>
          <dd className="text-[12.5px] text-muted-foreground">median published fee</dd>
        </div>
        <div>
          <dt className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Most seats</dt>
          <dd className="tnum font-heading mt-1 text-[1.15rem] font-extrabold leading-snug text-foreground">
            {/* A narrow card wraps at the dash, never inside "₹1.12 Cr". */}
            <span className="whitespace-nowrap">{money(spread.p10Fee)}</span> – <span className="whitespace-nowrap">{money(spread.p90Fee)}</span>
          </dd>
          <dd className="text-[12.5px] text-muted-foreground">the middle 80% of fees</dd>
        </div>
      </dl>
      <p className="tnum mt-3.5 border-t border-border pt-3 text-[13px] text-muted-foreground">
        Across {spread.colleges.toLocaleString("en-IN")} colleges with NRI MD/MS seats.
      </p>
    </div>
  );
}

export default async function NRIFees() {
  const [nri, states] = await Promise.all([getNriColleges(), getQuotaStates("nri", "pg")]);
  const pg = nri?.streams.pg;
  const copy = await pageCopy("page.nri.fees", { pg: (pg?.colleges ?? 0).toLocaleString("en-IN"), year: nri?.year ?? "" });
  const top = states.filter((s) => s.medianFee != null && s.colleges >= 3).slice(0, 8);
  const max = Math.max(1, ...top.map((s) => s.medianFee ?? 0));

  const points = [
    { icon: FileText, t: copy.c1_t, d: copy.c1_d },
    { icon: Coins, t: copy.c2_t, d: copy.c2_d },
    { icon: RefreshCw, t: copy.c3_t, d: copy.c3_d },
    { icon: ShieldAlert, t: copy.c4_t, d: copy.c4_d },
  ].filter((p) => p.t);

  return (
    <section className="relative overflow-hidden py-12 md:py-16">
      <div className="absolute inset-0 -z-10 bg-surface-1" />
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-primary-strong">{copy.eyebrow}</p>
          <h2 className="font-heading mt-2 text-[1.75rem] font-black leading-tight tracking-tight text-foreground [text-wrap:balance] md:text-4xl">{copy.title}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground md:text-base">{copy.intro}</p>
        </div>

        {/* Three rows on a laptop (2026-10-21): the two fee cards with the MBBS note, the states with the
            two deeper pages, then the checklist — every figure and line as before, 1,659px → about 1,000. */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pg && <SpreadCard icon={Building2} title="Private colleges" sub="NRI seats filled by the state counselling" spread={pg.byOwnership.private} />}
          {pg && <SpreadCard icon={Landmark} title="Deemed universities" sub="NRI seats in deemed universities" spread={pg.byOwnership.deemed} />}
          <div className="rounded-2xl border border-primary/25 bg-primary-soft/60 p-4 md:col-span-2 md:p-5 lg:col-span-1">
            <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
              <Info className="h-5 w-5 text-primary-strong" aria-hidden="true" />
              {copy.mbbs_title}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-foreground/85">{copy.mbbs_note}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4 md:p-5">
          {top.length > 0 && (
            <>
              <h3 className="font-heading text-lg font-bold text-foreground">{copy.states_title}</h3>
              <ul className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
                {top.map((s) => (
                  <li key={s.slug} className="min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14px]">
                      <Link href={`/md-ms-india/states/${s.slug}`} className="font-semibold text-foreground hover:text-primary-strong hover:underline">
                        {s.state}
                      </Link>
                      <span className="tnum shrink-0 font-semibold text-foreground">
                        {money(s.medianFee)} <span className="font-normal text-muted-foreground">· {s.colleges} colleges</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400"
                        style={{ width: `${Math.max(4, ((s.medianFee ?? 0) / max) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
                States with at least three such colleges. Median of the NRI fees published there, every MD/MS branch.
              </p>
            </>
          )}
          {/* The two deeper pages, under the states they go on from. */}
          <div className={`grid gap-3 sm:grid-cols-2 ${top.length > 0 ? "mt-4 border-t border-border pt-4" : ""}`}>
            <Link
              href="/nri-quota/fees"
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-1 px-4 py-3 transition-colors hover:border-primary/50"
            >
              <span>
                <span className="font-heading block font-bold text-foreground">NRI fees, quota by quota</span>
                <span className="text-[13px] text-muted-foreground">Every state and counselling, with closing-rank ranges</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/nri-quota/colleges"
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-1 px-4 py-3 transition-colors hover:border-primary/50"
            >
              <span>
                <span className="font-heading block font-bold text-foreground">Colleges with NRI seats</span>
                <span className="text-[13px] text-muted-foreground">MBBS, BDS and MD/MS, state by state</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {points.length > 0 && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 md:p-6">
            <h3 className="font-heading text-xl font-black tracking-tight text-foreground md:text-2xl">{copy.considerations_title}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {points.map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong" aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-heading text-[16px] font-bold leading-snug text-foreground">{t}</h4>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
