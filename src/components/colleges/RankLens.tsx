"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

/**
 * The rank lens over a college directory.
 *
 * An alphabetical list of 1,727 colleges answers a question nobody asks. The
 * visitor's question is "which of these can I get into", and that only needs
 * one number. Once it is entered, every card carries a band and the list can
 * be cut down to the ones actually in reach.
 *
 * The bands come from `/api/college-bands`, which returns the band and
 * nothing else — no closing ranks, so this stays useful without handing over
 * the dataset. The real numbers live behind the gate on the predictor.
 */

export type Band = "safe" | "likely" | "possible" | "stretch";

export const BAND_CHIP: Record<Band, { label: string; className: string }> = {
  safe: {
    label: "Safe",
    className: "bg-signal-safe/10 text-signal-safe border-signal-safe/30",
  },
  likely: {
    label: "Likely",
    className: "bg-signal-borderline/10 text-signal-borderline border-signal-borderline/30",
  },
  possible: {
    label: "Possible",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  stretch: {
    label: "Out of reach",
    className: "bg-signal-stretch/10 text-signal-stretch border-signal-stretch/30",
  },
};

export const BAND_ORDER: Band[] = ["safe", "likely", "possible", "stretch"];

interface LensState {
  rank: number | null;
  category: string;
  loading: boolean;
  error: string | null;
  counts: Record<Band, number> | null;
  bandOf: (slug: string | null | undefined) => Band | null;
  apply: (rank: number | null, category?: string) => void;
}

export function useRankLens(level: "ug" | "pg", defaultCategory?: string): LensState {
  const searchParams = useSearchParams();
  const initialRank = Number(searchParams.get("rank") ?? "");
  const fallbackCategory = defaultCategory ?? (level === "ug" ? "UR" : "GEN");

  const [rank, setRank] = useState<number | null>(
    Number.isFinite(initialRank) && initialRank >= 1 ? initialRank : null,
  );
  const [category, setCategory] = useState(searchParams.get("category") || fallbackCategory);
  const [lookup, setLookup] = useState<Map<string, Band> | null>(null);
  const [counts, setCounts] = useState<Record<Band, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A stale response from a rank the visitor has already changed would
  // relabel every card with the wrong band, so only the newest one is kept.
  const latest = useRef(0);

  useEffect(() => {
    if (!rank) {
      setLookup(null);
      setCounts(null);
      return;
    }
    const ticket = ++latest.current;
    setLoading(true);
    setError(null);

    fetch(`/api/college-bands?rank=${rank}&level=${level}&category=${encodeURIComponent(category)}`)
      .then((r) => r.json())
      .then((json) => {
        if (ticket !== latest.current) return;
        if (json.error) throw new Error(json.error);
        const map = new Map<string, Band>();
        const tally: Record<Band, number> = { safe: 0, likely: 0, possible: 0, stretch: 0 };
        for (const band of BAND_ORDER) {
          for (const slug of (json.bands?.[band] ?? []) as string[]) {
            map.set(slug, band);
            tally[band]++;
          }
        }
        setLookup(map);
        setCounts(tally);
      })
      .catch((e) => {
        if (ticket !== latest.current) return;
        setError(e instanceof Error ? e.message : "Could not check your rank.");
        setLookup(null);
        setCounts(null);
      })
      .finally(() => {
        if (ticket === latest.current) setLoading(false);
      });
  }, [rank, category, level]);

  /**
   * The URL carries the rank so a filtered view can be shared, but it is
   * written with `replaceState` rather than a router push: the page itself is
   * cached and does not read these params, so a navigation would cost a round
   * trip and buy nothing.
   */
  const apply = useCallback(
    (nextRank: number | null, nextCategory?: string) => {
      setRank(nextRank);
      if (nextCategory) setCategory(nextCategory);

      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      if (nextRank) url.searchParams.set("rank", String(nextRank));
      else url.searchParams.delete("rank");
      const cat = nextCategory ?? category;
      if (nextRank && cat !== fallbackCategory) url.searchParams.set("category", cat);
      else url.searchParams.delete("category");
      window.history.replaceState(null, "", url.toString());
    },
    [category, fallbackCategory],
  );

  const bandOf = useCallback(
    (slug: string | null | undefined) => (slug && lookup ? lookup.get(slug) ?? null : null),
    [lookup],
  );

  return useMemo(
    () => ({ rank, category, loading, error, counts, bandOf, apply }),
    [rank, category, loading, error, counts, bandOf, apply],
  );
}

/** The input that drives the lens, plus the tally once a rank is in. */
export function RankLensBar({
  lens,
  level,
  categories,
  bandFilter,
  onBandFilter,
}: {
  lens: LensState;
  level: "ug" | "pg";
  categories: string[];
  bandFilter: Band | null;
  onBandFilter: (b: Band | null) => void;
}) {
  const [value, setValue] = useState(lens.rank ? String(lens.rank) : "");
  const parsed = Number(value.replace(/[,\s]/g, ""));
  const valid = Number.isFinite(parsed) && parsed >= 1 && parsed <= 2_000_000;

  return (
    <div className="rounded-2xl border border-primary/25 bg-surface-2 p-4 md:p-5">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) lens.apply(parsed);
        }}
      >
        <div className="flex-grow">
          <label htmlFor="lens-rank" className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">
            Your NEET {level.toUpperCase()} rank — see which of these you can actually get
          </label>
          <input
            id="lens-rank"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 5000"
            className={`tnum font-heading w-full rounded-xl border bg-card px-4 py-3 text-xl font-extrabold text-foreground outline-none transition-colors ${
              value && !valid ? "border-signal-stretch" : "border-border focus:border-primary"
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={!valid || lens.loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-bold text-white shadow-glow transition-all hover:shadow-glow-lg disabled:opacity-40"
        >
          {lens.loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          Check my rank
        </button>
        {lens.rank && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              onBandFilter(null);
              lens.apply(null);
            }}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        )}
      </form>

      {categories.length > 1 && (
        <fieldset className="mt-3">
          <legend className="sr-only">Category</legend>
          <div className="flex flex-wrap gap-1.5">
            {categories.slice(0, 8).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={c === lens.category}
                onClick={() => lens.apply(lens.rank ?? (valid ? parsed : null), c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                  c === lens.category
                    ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {lens.error && (
        <p role="alert" className="mt-3 text-[13px] text-signal-stretch">
          {lens.error}
        </p>
      )}

      {lens.counts && (
        <div className="mt-4 flex flex-wrap gap-2">
          {BAND_ORDER.map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={bandFilter === b}
              onClick={() => onBandFilter(bandFilter === b ? null : b)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-bold transition-all ${
                BAND_CHIP[b].className
              } ${bandFilter === b ? "ring-2 ring-primary/40" : "opacity-90 hover:opacity-100"}`}
            >
              {BAND_CHIP[b].label}
              <span className="tnum">{lens.counts![b].toLocaleString("en-IN")}</span>
            </button>
          ))}
          {bandFilter && (
            <button
              type="button"
              onClick={() => onBandFilter(null)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-semibold text-muted-foreground hover:border-primary/40"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Show all
            </button>
          )}
        </div>
      )}

      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
        Bands come from published closing ranks — where the cut actually landed, not a forecast. For
        the round-by-round numbers behind each one, use the seat predictor.
      </p>
    </div>
  );
}
