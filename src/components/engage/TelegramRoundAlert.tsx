"use client";

import { TelegramIcon } from "@/components/icons/TelegramIcon";
import TelegramLink, { fillRound, useTelegram, type TelegramRound } from "@/components/engage/TelegramLink";

/**
 * "Get the Round 2 result alert on Telegram, the moment it's out" — the big box on the NEET PG round pages
 * (owner, 2026-10-22). The day a result is due is the day people search for it, and the strongest reason
 * anybody has to join the channel. Unlike TelegramJoin, which is always the page's quiet second action,
 * this one is meant to be seen: a full-width band high on the page, one large button.
 *
 * `round` is the round it is about — a page that knows (its own result still awaited, or the round after
 * a live one) passes it; leave it out for the counselling's next result (TelegramLink `round`), and pass
 * null where there is nothing to wait for. `withYear` names the counselling in the heading too — on an
 * earlier year's result page, "the Round 1 result" alone would read as that year's. Words from Admin →
 * Content → "Telegram channel".
 */
export default function TelegramRoundAlert({
  round,
  placement,
  withYear = false,
  className = "",
}: {
  round?: Pick<TelegramRound, "year" | "label" | "short"> | null;
  placement: string;
  withYear?: boolean;
  className?: string;
}) {
  const telegram = useTelegram();
  const r = round === undefined ? telegram.round : round;
  if (!r) return null;
  const c = telegram.roundCopy;
  const named = withYear ? { ...r, label: `NEET PG ${r.year} ${r.label}` } : r;
  return (
    <section className={`container-custom ${className}`} aria-labelledby={`tg-alert-${placement}`}>
      <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-primary-soft p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-7">
          {/* #fff, not bg-white: base.css repaints .bg-white in dark mode, and the plane is a cut-out. */}
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fff] shadow-sm md:h-[72px] md:w-[72px]" aria-hidden="true">
            <TelegramIcon size={56} className="text-[#229ED9]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-primary-strong dark:text-primary">{fillRound(c.eyebrow, r)}</p>
            <h2 id={`tg-alert-${placement}`} className="font-heading mt-1.5 text-[1.45rem] font-black leading-tight tracking-tight text-foreground [text-wrap:balance] md:text-[1.85rem]">
              {fillRound(c.title, named)}
            </h2>
            <p className="mt-2 max-w-[64ch] text-[15px] leading-relaxed text-foreground/80">{fillRound(c.body, named)}</p>
          </div>
          <TelegramLink
            placement={placement}
            iconSize={22}
            className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-primary-strong px-7 text-[17px] font-bold text-white shadow-glow transition-colors hover:bg-primary-strong/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:bg-primary dark:text-primary-foreground"
          >
            {c.button}
          </TelegramLink>
        </div>
      </div>
    </section>
  );
}
