"use client";

import { createContext, useContext, type ReactNode } from "react";
import { TelegramIcon } from "@/components/icons/TelegramIcon";
import { CONTACT_INFO } from "@/lib/constants";

/**
 * The Telegram channel — its address and the words that invite people to it —
 * set in the admin (Admin → Content → Text & numbers, group "Telegram channel":
 * `social.telegram`, `telegram.card.heading`, `telegram.card.body`,
 * `telegram.nudge.text`) and handed down by SiteShell, so changing the channel
 * or its pitch is an edit, not a deploy. Blank settings fall back to the
 * defaults below, as does anything rendered outside the shell.
 */
export interface TelegramCopy {
  url: string;
  heading: string;
  body: string;
  nudge: string;
  /**
   * The NEET PG round whose result is next (lib/mccResults.ts `getTelegramCue`, 2026-10-22). While there
   * is one, the alerts bar, the pop-up and the round pages' box invite people to that round's result
   * alert instead of "counselling updates". Null between counsellings.
   */
  round: TelegramRound | null;
  /** The words for it — "Telegram channel" in Admin → Content; {round}, {short}, {year} filled in. */
  roundCopy: TelegramRoundCopy;
}
export interface TelegramRound {
  year: number;
  label: string;
  short: string;
  path: string;
}
export interface TelegramRoundCopy {
  eyebrow: string;
  title: string;
  body: string;
  button: string;
  bar: string;
  barShort: string;
  nudge: string;
}

const ROUND_DEFAULTS: TelegramRoundCopy = {
  eyebrow: "NEET PG {year} · result alert",
  title: "Get the {round} result alert on Telegram, the moment it's out",
  body: "MCC's {round} result and allotment PDF on the Admission Hands Telegram channel as soon as MCC publishes it, with every counselling notice in between. Free to join, leave any time.",
  button: "Join on Telegram",
  bar: "{round} result alert",
  barShort: "{short} alert",
  nudge: "NEET PG {year} {round} result: get the alert on Telegram the moment MCC publishes it. Free, leave any time.",
};

export const TELEGRAM_DEFAULTS: TelegramCopy = {
  url: CONTACT_INFO.telegram,
  heading: "Counselling updates on Telegram",
  body: "Round dates, allotment results, cutoffs and choice-filling tips, as they come out.",
  nudge: "Round dates, results, cutoffs and choice-filling tips on the Admission Hands Telegram channel.",
  round: null,
  roundCopy: ROUND_DEFAULTS,
};

/** "{round} result alert" → "Round 1 result alert". */
export const fillRound = (text: string, round: Pick<TelegramRound, "year" | "label" | "short">) =>
  text.replace(/\{round\}/g, round.label).replace(/\{short\}/g, round.short).replace(/\{year\}/g, String(round.year));

const TelegramContext = createContext<TelegramCopy>(TELEGRAM_DEFAULTS);

export function TelegramProvider({
  copy,
  children,
}: {
  copy?: Partial<Omit<TelegramCopy, "roundCopy">> & { roundCopy?: Partial<TelegramRoundCopy> };
  children: ReactNode;
}) {
  const url = copy?.url?.trim();
  const roundCopy = Object.fromEntries(
    Object.entries(ROUND_DEFAULTS).map(([k, v]) => [k, copy?.roundCopy?.[k as keyof TelegramRoundCopy]?.trim() || v]),
  ) as unknown as TelegramRoundCopy;
  const value: TelegramCopy = {
    url: url && /^https:\/\/(t\.me|telegram\.me)\//i.test(url) ? url : TELEGRAM_DEFAULTS.url,
    heading: copy?.heading?.trim() || TELEGRAM_DEFAULTS.heading,
    body: copy?.body?.trim() || TELEGRAM_DEFAULTS.body,
    nudge: copy?.nudge?.trim() || TELEGRAM_DEFAULTS.nudge,
    round: copy?.round ?? null,
    roundCopy,
  };
  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

export const useTelegram = () => useContext(TelegramContext);

/**
 * A link to the channel. `placement` becomes data-placement, which
 * ClickTracker sends with every telegram_click.
 */
export default function TelegramLink({
  placement,
  className,
  iconClassName,
  iconSize = 18,
  ariaLabel,
  onClick,
  children,
}: {
  placement: string;
  className?: string;
  iconClassName?: string;
  iconSize?: number;
  ariaLabel?: string;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const { url } = useTelegram();
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" data-placement={placement} aria-label={ariaLabel} onClick={onClick} className={className}>
      <TelegramIcon size={iconSize} className={iconClassName} />
      {children}
    </a>
  );
}
