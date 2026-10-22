import { ArrowDownRight, ArrowUpRight, Building2, Landmark, Scale, Sparkles, Users } from "lucide-react";

/**
 * Three to four headline findings under a data page's hero (2026-10-18): each a
 * figure from the page's own data with one line saying what it is. The
 * "takeaway" row a reader screenshots — so every value must be one the tables
 * below also show. `compact` is the version inside a DataHero, under its words:
 * two across (three when there are three), tighter.
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

export default function InsightCards({
  items,
  className = "",
  compact = false,
  across = false,
}: {
  items: Insight[];
  className?: string;
  compact?: boolean;
  /** Compact only: four in one row — for a hero that already carries a row of stat tiles. */
  across?: boolean;
}) {
  const n = items.length;
  const cols = compact
    ? n === 4
      ? across
        ? "sm:grid-cols-4"
        : ""
      : n >= 3
        ? "sm:grid-cols-3"
        : ""
    : n >= 4
      ? "sm:gap-4 lg:grid-cols-4"
      : "sm:gap-4 lg:grid-cols-3";
  return (
    // Two across even on a phone: four full-width cards stacked were 800px before the content began.
    <ul className={`grid grid-cols-2 gap-3 ${cols} ${className}`}>
      {items.map((it) => {
        const Icon = ICONS[it.icon];
        return (
          <li
            key={it.label}
            className={`group relative min-w-0 overflow-hidden border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(8_145_178/0.35)] transition-transform hover:-translate-y-0.5 ${
              compact ? "rounded-2xl p-4" : "rounded-3xl p-4 sm:p-5"
            }`}
          >
            <span
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-400/20 to-teal-400/10 blur-2xl"
              aria-hidden="true"
            />
            {/* Compact: the icon beside the number from a tablet up; a phone's half-width card keeps it above,
                where "₹1,00,800" has the whole width. */}
            <div className={compact ? "sm:flex sm:items-center sm:gap-2.5" : ""}>
              <span
                className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong ${compact ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"}`}
                aria-hidden="true"
              >
                <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
              </span>
              {/* Number first: a label that wrapped used to push its number below the next card's. */}
              <p
                className={`tnum font-heading font-extrabold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] ${
                  compact ? "mt-2.5 text-[1.3rem] sm:mt-0 sm:text-[1.45rem]" : "mt-3 text-[1.3rem] sm:mt-4 sm:text-2xl"
                }`}
              >
                {it.value}
              </p>
            </div>
            <p className="mt-1 text-[13px] font-semibold leading-snug text-muted-foreground">{it.label}</p>
            {it.note && <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground sm:text-[13.5px]">{it.note}</p>}
          </li>
        );
      })}
    </ul>
  );
}
