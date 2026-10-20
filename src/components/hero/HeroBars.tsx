import Link from "@/components/ui/Link";

/**
 * A short ranked bar list for the right side of a DataHero: one measure, one
 * hue, bars from zero, the value written beside every bar so nothing is read
 * off a bar's length alone. A list, not a picture — the words are in the page
 * for screen readers and search engines alike. A phone shows the first four.
 */
export interface HeroBarRow {
  label: string;
  value: number;
  /** The value as printed, e.g. "₹1,00,800". */
  display: string;
  href?: string;
  note?: string;
}

export default function HeroBars({
  title,
  caption,
  rows,
  footnote,
}: {
  title: string;
  caption?: string;
  rows: HeroBarRow[];
  footnote?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure className="glass-hero rounded-3xl p-5 md:p-6">
      <figcaption className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-[11.5px] font-bold uppercase tracking-[0.14em] text-cyan-300">{title}</span>
          {caption && <span className="mt-1 block text-[13px] leading-snug text-slate-400">{caption}</span>}
        </span>
        <span className="mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_12px_2px_rgb(103_232_249/0.7)]" aria-hidden="true" />
      </figcaption>
      <ol className="mt-5 space-y-3.5">
        {rows.map((r, i) => (
          <li key={`${r.label}-${i}`} className={i >= 4 ? "hidden sm:block" : undefined}>
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="tnum w-4 shrink-0 text-[11px] font-bold text-slate-500">{i + 1}</span>
                {r.href ? (
                  <Link href={r.href} className="line-clamp-2 font-semibold leading-snug text-slate-100 hover:text-white hover:underline">
                    {r.label}
                  </Link>
                ) : (
                  <span className="line-clamp-2 font-semibold leading-snug text-slate-100">{r.label}</span>
                )}
              </span>
              <span className="tnum shrink-0 font-bold text-white">{r.display}</span>
            </div>
            <div className="ml-6 mt-1.5 h-2 rounded-full bg-white/[0.08]" aria-hidden="true">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-teal-300 shadow-[0_0_10px_rgb(34_211_238/0.45)]"
                style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }}
              />
            </div>
            {r.note && <p className="ml-6 mt-1 text-[11.5px] text-slate-400">{r.note}</p>}
          </li>
        ))}
      </ol>
      {footnote && <p className="mt-5 border-t border-white/10 pt-3 text-[12px] leading-relaxed text-slate-400">{footnote}</p>}
    </figure>
  );
}
