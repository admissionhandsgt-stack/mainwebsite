import type { ReactNode } from "react";

/**
 * "At a glance" for the right side of a DataHero: a handful of labelled facts
 * about the page's subject — a state, a branch, a college — each from the
 * page's own data or an official source named in the footnote.
 */
export interface HeroFact {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Spans both columns (for a longer value, e.g. a counselling's name). */
  wide?: boolean;
}

export default function HeroFacts({
  title,
  facts,
  footnote,
}: {
  title: string;
  facts: HeroFact[];
  footnote?: ReactNode;
}) {
  return (
    <section aria-label={title} className="glass-hero rounded-3xl p-5 md:p-6">
      <p className="flex items-center justify-between gap-3 text-[11.5px] font-bold uppercase tracking-[0.14em] text-cyan-300">
        {title}
        <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_12px_2px_rgb(103_232_249/0.7)]" aria-hidden="true" />
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
        {facts.map((f) => (
          <div
            key={f.label}
            className={`rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 ${f.wide ? "col-span-2" : ""}`}
          >
            <dt className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">{f.label}</dt>
            <dd className="tnum font-heading mt-1 text-[1.05rem] font-extrabold leading-snug text-white">{f.value}</dd>
            {f.sub && <dd className="mt-0.5 text-[11.5px] leading-snug text-slate-400">{f.sub}</dd>}
          </div>
        ))}
      </dl>
      {footnote && <p className="mt-5 border-t border-white/10 pt-3 text-[12px] leading-relaxed text-slate-400">{footnote}</p>}
    </section>
  );
}
