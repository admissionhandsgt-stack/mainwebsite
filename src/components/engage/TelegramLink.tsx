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
}

export const TELEGRAM_DEFAULTS: TelegramCopy = {
  url: CONTACT_INFO.telegram,
  heading: "Counselling updates on Telegram",
  body: "Round dates, allotment results, cutoffs and choice-filling tips, as they come out.",
  nudge: "Round dates, results, cutoffs and choice-filling tips on the Admission Hands Telegram channel.",
};

const TelegramContext = createContext<TelegramCopy>(TELEGRAM_DEFAULTS);

export function TelegramProvider({ copy, children }: { copy?: Partial<TelegramCopy>; children: ReactNode }) {
  const url = copy?.url?.trim();
  const value: TelegramCopy = {
    url: url && /^https:\/\/(t\.me|telegram\.me)\//i.test(url) ? url : TELEGRAM_DEFAULTS.url,
    heading: copy?.heading?.trim() || TELEGRAM_DEFAULTS.heading,
    body: copy?.body?.trim() || TELEGRAM_DEFAULTS.body,
    nudge: copy?.nudge?.trim() || TELEGRAM_DEFAULTS.nudge,
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
