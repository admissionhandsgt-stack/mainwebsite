import { ArrowDownRight, ArrowUpRight, Building2, Landmark, Scale, Sparkles, Users } from "lucide-react";

/**
 * Three to four headline findings under a data page's hero (2026-10-18): each a
 * figure from the page's own data with one line saying what it is. The
 * "takeaway" row a reader screenshots — so every value must be one the tables
 * below also show.
 */
const ICONS = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  compare: Scale,
  college: Building2,
  authority: Landmark,
  people: Users,
  spark: Sparkles,
} as const;
export type InsightIcon = keyof typeof ICONS;

export interface Insight {
  icon: InsightIcon;
  label: string;
  value: string;
  note?: string;
}

export default function InsightCards({ items, className = "" }: { items: Insight[]; className?: string }) {
  return (
    // Two across even on a phone: four full-width cards stacked were 800px before the content began.
    <ul className={`grid grid-cols-2 gap-3 sm:gap-4 ${items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"} ${className}`}>
      {items.map((it) => {
        const Icon = ICONS[it.icon];
        return (
          <li
            key={it.label}
            className="group relative min-w-0 overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(8_145_178/0.35)] transition-transform hover:-translate-y-0.5 sm:p-5"
          >
            <span
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-400/20 to-teal-400/10 blur-2xl"
              aria-hidden="true"
            />
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary-strong sm:h-10 sm:w-10" aria-hidden="true">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:mt-4 sm:text-[11.5px] sm:tracking-[0.12em]">{it.label}</p>
            <p className="tnum font-heading mt-1 text-[1.3rem] font-extrabold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-2xl">{it.value}</p>
            {it.note && <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground sm:text-[13.5px]">{it.note}</p>}
          </li>
        );
      })}
    </ul>
  );
}
