"use client";

import { TelegramIcon } from "@/components/icons/TelegramIcon";
import TelegramLink, { fillRound, useTelegram } from "@/components/engage/TelegramLink";

/**
 * The Telegram channel in one slim row (2026-10-23, owner: "telegram promote hona chahiye") — for the top
 * of the college pages, where most search visitors land and the full TelegramJoin card sat ~6,000px down.
 * While a NEET PG round's result is next it names that result; otherwise the card's everyday words.
 * Words from Admin → Content → "Telegram channel".
 */
export default function TelegramStrip({ placement, className = "" }: { placement: string; className?: string }) {
  const t = useTelegram();
  const r = t.round;
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-5 ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        {/* #fff, not bg-white: base.css repaints .bg-white in dark mode, and the plane is a cut-out. */}
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff] shadow-sm" aria-hidden="true">
          <TelegramIcon size={40} className="text-[#229ED9]" />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-[15px] font-bold leading-snug text-foreground">
            {r ? fillRound(t.roundCopy.title, r) : t.heading}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{t.body}</p>
        </div>
      </div>
      <TelegramLink
        placement={placement}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-primary-strong px-5 text-[14px] font-bold text-white transition-colors hover:bg-primary-strong/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:bg-primary dark:text-primary-foreground sm:self-center"
      >
        {t.roundCopy.button}
      </TelegramLink>
    </div>
  );
}

/**
 * One line to the channel, for the moment a form has just gone through — the visitor has asked for help
 * and is waiting for a call, the likeliest time to want the updates too.
 */
export function TelegramLine({ placement, tone = "light", className = "" }: { placement: string; tone?: "light" | "dark"; className?: string }) {
  const t = useTelegram();
  const r = t.round;
  return (
    <TelegramLink
      placement={placement}
      iconClassName="text-[#229ED9]"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-[14px] font-semibold transition-colors ${
        tone === "dark" ? "border-white/15 bg-white/[0.06] text-white hover:border-cyan-300/50" : "border-border bg-card text-foreground hover:border-primary/40"
      } ${className}`}
    >
      {r ? `${fillRound(t.roundCopy.bar, r)} on Telegram` : "Counselling updates on Telegram"}
    </TelegramLink>
  );
}
