"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The team's own figures — students guided, years of counselling — in one place (2026-10-21).
 *
 * They were typed into a dozen components ("2100+", "2,100+", "15+", "over 15 years") and the owner
 * asked that the site's numbers stop being typed in. They come from Admin → Content → "Site: the
 * team's own figures", threaded layout → SiteShell → here, so a client component reads them with
 * `useTeamFigures()`; a server component reads the same setting through `pageCopy`. These are the
 * team's claims to make, not figures the data can count — everything the data can count comes from
 * the data.
 */
export interface TeamFigures {
  /** "2100+" */
  students: string;
  /** "15+" */
  years: string;
}

const DEFAULTS: TeamFigures = { students: "2100+", years: "15+" };

const Ctx = createContext<TeamFigures>(DEFAULTS);

export function TeamFiguresProvider({ figures, children }: { figures?: Partial<TeamFigures>; children: ReactNode }) {
  const value: TeamFigures = {
    students: figures?.students?.trim() || DEFAULTS.students,
    years: figures?.years?.trim() || DEFAULTS.years,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTeamFigures = () => useContext(Ctx);

/** The figure itself, for a server component's JSX: `<TeamFigure k="years" /> years of counselling`. */
export function TeamFigure({ k }: { k: keyof TeamFigures }) {
  return <>{useContext(Ctx)[k]}</>;
}
