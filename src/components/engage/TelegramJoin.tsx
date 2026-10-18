import React from "react";
import { TelegramIcon } from "@/components/icons/TelegramIcon";
import { CONTACT_INFO } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * "Counselling updates on Telegram" — the invite to the public channel
 * (2026-10-17, owner's request). One component for every page that carries it,
 * so the words and the link cannot drift apart.
 *
 * It is the page's secondary action, never its first: it sits after the lead
 * form or the counsellor block, and its button is quieter than theirs. Clicks
 * are counted by ClickTracker (any t.me link), with `data-placement` saying
 * which copy was clicked.
 *
 *   <TelegramJoin placement="neet_pg_cutoff" />          a band in its own container
 *   <TelegramJoin placement="college_pg" bare />         inside a column that already has one
 *
 * No hooks, so server pages and client components can both render it.
 */
export default function TelegramJoin({
  placement,
  bare = false,
  stacked = false,
  heading = "Counselling updates on Telegram",
  body = "Round dates, allotment results, cutoffs and choice-filling tips, as they come out.",
  className,
}: {
  /** Which copy of the invite this is, for the click event. */
  placement: string;
  /** Render without its own container and section padding. */
  bare?: boolean;
  /** Logo, words and button in one column at every width — for a narrow sidebar. */
  stacked?: boolean;
  heading?: string;
  body?: string;
  className?: string;
}) {
  const box = (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary-soft p-5",
        !stacked && "sm:flex-row sm:items-center sm:gap-5 md:p-6",
        bare && className,
      )}
    >
      {/* #fff, not bg-white: base.css repaints .bg-white in dark mode, and the
          plane is a cut-out that shows whatever sits behind it. */}
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff] shadow-sm">
        <TelegramIcon size={48} className="text-[#229ED9]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-bold uppercase tracking-wide text-primary-strong">Telegram channel · free to join</p>
        <h2 className="font-heading mt-1 text-lg font-bold leading-snug text-foreground [text-wrap:balance] md:text-xl">
          {heading}
        </h2>
        <p className="mt-1 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <a
        href={CONTACT_INFO.telegram}
        target="_blank"
        rel="noopener noreferrer"
        data-placement={placement}
        className={cn(
          "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-primary-strong px-5 text-[15px] font-bold text-white transition-colors hover:bg-primary-strong/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:bg-primary dark:text-primary-foreground",
          !stacked && "sm:self-center",
        )}
      >
        <TelegramIcon size={18} /> Join on Telegram
      </a>
    </div>
  );

  if (bare) return box;
  return <section className={cn("container-custom py-8 md:py-10", className)}>{box}</section>;
}
