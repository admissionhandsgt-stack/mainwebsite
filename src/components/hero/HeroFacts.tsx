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
    <section aria-label={title} className="rounded-3xl border border-border bg-card p-5 shadow-lift md:p-6">
      <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-primary-strong">{title}</p>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
        {facts.map((f) => (
          <div
            key={f.label}
            className={`rounded-2xl border border-border bg-surface-2 px-3.5 py-3 ${f.wide ? "col-span-2" : ""}`}
          >
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{f.label}</dt>
            <dd className="tnum font-heading mt-1 text-[1.05rem] font-extrabold leading-snug text-foreground">{f.value}</dd>
            {f.sub && <dd className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{f.sub}</dd>}
          </div>
        ))}
      </dl>
      {footnote && <p className="mt-5 border-t border-border pt-3 text-[12px] leading-relaxed text-muted-foreground">{footnote}</p>}
    </section>
  );
}
