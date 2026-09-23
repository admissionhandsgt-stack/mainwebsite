"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Search, SlidersHorizontal, TrendingUp, TrendingDown, Minus, AlertCircle, Phone } from "lucide-react";
import { useCTA } from "@/hooks/useCTA";
import UnlockCard from "@/components/lead/UnlockCard";
import { bandLabel, type ChanceBand } from "@/lib/predictor";

interface SeatResult {
  institute: string;
  instituteSlug: string;
  state: string | null;
  district: string | null;
  ownership: string;
  course: string;
  quota: string;
  counselling: string | null;
  category: string;
  feeInr: number | null;
  bondYears: number | null;
  seats: number | null;
  widestRank: number | null;
  firstRoundRank: number | null;
  previousYearRank: number | null;
  furthestEver: number | null;
  year: number | null;
  lowConfidence: boolean;
  band: ChanceBand;
  score: number;
  reason: string;
  movement: { delta: number; direction: "easier" | "tighter" | "flat" } | null;
}

interface ApiResponse {
  counts: Record<ChanceBand, number>;
  total: number;
  truncated: boolean;
  /** True when only the preview seats came back — see `src/lib/leadGate.ts`. */
  locked?: boolean;
  lockedCount?: number;
  results: SeatResult[];
  error?: string;
}

interface Props {
  level: "ug" | "pg";
  states: string[];
  categories: { code: string; label: string }[];
  seatCount: number;
  rankCount: number;
}

const BANDS: ChanceBand[] = ["safe", "likely", "possible", "stretch"];

const BAND_STYLE: Record<ChanceBand, { dot: string; text: string; ring: string; blurb: string }> = {
  safe: {
    dot: "bg-signal-safe",
    text: "text-signal-safe",
    ring: "border-signal-safe/30 bg-signal-safe/[0.06]",
    blurb: "Round 1 closed past your rank — you would have been allotted straight away.",
  },
  likely: {
    dot: "bg-signal-borderline",
    text: "text-signal-borderline",
    ring: "border-signal-borderline/30 bg-signal-borderline/[0.06]",
    blurb: "The cut reached your rank later in the rounds, once upgrades freed seats.",
  },
  possible: {
    dot: "bg-primary",
    text: "text-primary",
    ring: "border-primary/30 bg-primary/[0.06]",
    blurb: "It has reached your rank in an earlier year, but not in the latest one.",
  },
  stretch: {
    dot: "bg-signal-stretch",
    text: "text-signal-stretch",
    ring: "border-signal-stretch/30 bg-signal-stretch/[0.06]",
    blurb: "No published round has ever reached your rank here.",
  },
};

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-IN");

const money = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function PredictorClient({ level, states, categories, seatCount, rankCount }: Props) {
  const CTA = useCTA();
  const reduce = useReducedMotion();

  const searchParams = useSearchParams();
  const seededRank = searchParams.get("rank") ?? "";

  const [rank, setRank] = useState(seededRank);
  // The general category is coded GEN in PG data and UR in UG data, so the
  // default comes from whichever categories this level actually publishes
  // rather than a hardcoded guess.
  const [category, setCategory] = useState(
    () => categories.find((c) => c.code === "GEN" || c.code === "UR")?.code
      ?? categories[0]?.code
      ?? "GEN",
  );
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [ownership, setOwnership] = useState<string[]>([]);
  const [maxFee, setMaxFee] = useState<number | null>(null);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const rankNumber = Number(rank.replace(/[,\s]/g, ""));
  const rankValid = Number.isFinite(rankNumber) && rankNumber >= 1 && rankNumber <= 2000000;

  const run = useCallback(async () => {
    if (!rankValid) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ rank: String(rankNumber), level, category });
      if (selectedStates.length) params.set("states", selectedStates.join(","));
      if (ownership.length) params.set("ownership", ownership.join(","));
      if (maxFee) params.set("maxFee", String(maxFee));

      const res = await fetch(`/api/predict?${params}`);
      const json: ApiResponse = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Request failed");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your seats. Try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [rankValid, rankNumber, level, category, selectedStates, ownership, maxFee]);

  // Arriving with ?rank= from a college page: run the search straight away so
  // the visitor sees results rather than a form they already filled in.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !seededRank || !rankValid) return;
    seeded.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seededRank, rankValid]);

  // Re-run when a filter changes, but only once a search already happened.
  useEffect(() => {
    if (data || error) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, selectedStates, ownership, maxFee]);

  const grouped = useMemo(() => {
    const out: Record<ChanceBand, SeatResult[]> = { safe: [], likely: [], possible: [], stretch: [] };
    data?.results.forEach((r) => out[r.band].push(r));
    return out;
  }, [data]);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <div className="container-custom py-10 md:py-14">
      {/* ---------------- Search ---------------- */}
      <div className="mx-auto max-w-3xl">
        <div className="panel-glass rounded-2xl border p-5 md:p-6 shadow-lift">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run();
              setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
            }}
          >
            <label htmlFor="rank" className="mb-2 block text-[13px] font-semibold text-muted-foreground">
              Your NEET {level.toUpperCase()} all-India rank
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="rank"
                inputMode="numeric"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                placeholder="e.g. 12450"
                aria-describedby={rank && !rankValid ? "rank-error" : undefined}
                className={`tnum font-heading w-full flex-grow rounded-xl border bg-card px-4 py-3 text-2xl font-extrabold tracking-tight text-foreground outline-none transition-colors sm:text-3xl ${
                  rank && !rankValid ? "border-signal-stretch" : "border-border focus:border-primary"
                }`}
              />
              <button
                type="submit"
                disabled={!rankValid || loading}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-7 py-3.5 text-sm font-bold text-white shadow-glow transition-all hover:shadow-glow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Checking
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Show my seats
                  </>
                )}
              </button>
            </div>
            {rank && !rankValid && (
              <p id="rank-error" className="mt-2 text-[13px] text-signal-stretch">
                Rank must be a number between 1 and 20,00,000.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {categories.slice(0, 6).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCategory(c.code)}
                  className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                    category === c.code
                      ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-primary/40"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {(selectedStates.length + ownership.length + (maxFee ? 1 : 0)) > 0 && (
                  <span className="tnum ml-1 rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">
                    {selectedStates.length + ownership.length + (maxFee ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 space-y-4 border-t border-border pt-4">
                <fieldset>
                  <legend className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Ownership
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {["government", "private", "deemed"].map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => toggle(ownership, setOwnership, o)}
                        className={`rounded-full border px-3 py-1.5 text-[13px] capitalize transition-colors ${
                          ownership.includes(o)
                            ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Yearly fee ceiling
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { v: null, l: "Any" },
                      { v: 200000, l: "Under ₹2L" },
                      { v: 1000000, l: "Under ₹10L" },
                      { v: 2500000, l: "Under ₹25L" },
                    ].map((f) => (
                      <button
                        key={f.l}
                        type="button"
                        onClick={() => setMaxFee(f.v)}
                        className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                          maxFee === f.v
                            ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {f.l}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    State {selectedStates.length > 0 && `(${selectedStates.length})`}
                  </legend>
                  <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                    {states.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggle(selectedStates, setSelectedStates, s)}
                        className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                          selectedStates.includes(s)
                            ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
          </form>
        </div>

        <p className="mt-3 text-center text-[13px] text-muted-foreground">
          Checked against{" "}
          <span className="tnum font-semibold text-foreground">{rankCount.toLocaleString("en-IN")}</span> published
          closing ranks across{" "}
          <span className="tnum font-semibold text-foreground">{seatCount.toLocaleString("en-IN")}</span> seats. Your
          rank and the band counts are free — the seat-by-seat list asks for a number.
        </p>
      </div>

      {/* ---------------- Results ---------------- */}
      <div ref={resultsRef} className="mt-10 scroll-mt-28">
        {loading && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-grow space-y-2">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-muted/70" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
            <p className="pt-2 text-center text-[13px] text-muted-foreground">
              Reading {rankCount.toLocaleString("en-IN")} closing ranks…
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto max-w-lg rounded-2xl border border-signal-stretch/30 bg-signal-stretch/[0.06] p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-signal-stretch" />
            <h2 className="mt-3 font-heading text-lg font-bold text-foreground">That didn&apos;t load</h2>
            <p className="mt-1.5 text-[15px] text-muted-foreground">{error}</p>
            <button
              onClick={run}
              className="mt-5 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-glow"
            >
              Try again
            </button>
          </div>
        )}

        {data && !loading && data.total === 0 && (
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
            <h2 className="font-heading text-lg font-bold text-foreground">No seat on record reaches this rank</h2>
            <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">
              With these filters, no published round has ever closed at or past{" "}
              <span className="tnum font-semibold text-foreground">{fmt(rankNumber)}</span>. Widening the state or fee
              filter is usually what opens it up.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => {
                  setSelectedStates([]);
                  setOwnership([]);
                  setMaxFee(null);
                }}
                className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-primary/40"
              >
                Clear all filters
              </button>
              <button
                onClick={() => CTA.call()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-glow"
              >
                <Phone className="h-4 w-4" />
                Talk to a counsellor
              </button>
            </div>
          </div>
        )}

        {data && !loading && data.total > 0 && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {BANDS.map((b) => (
                <div key={b} className={`rounded-xl border p-4 ${BAND_STYLE[b].ring}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${BAND_STYLE[b].dot}`} />
                    <span className={`text-[13px] font-bold ${BAND_STYLE[b].text}`}>{bandLabel(b)}</span>
                  </div>
                  <div className="tnum font-heading mt-1.5 text-3xl font-extrabold leading-none text-foreground">
                    {data.counts[b]}
                  </div>
                </div>
              ))}
            </div>

            {data.truncated && (
              <p className="mb-5 rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-[13px] text-muted-foreground">
                Showing the {data.total} most competitive seats you reach. Narrow by state or fee to see the rest.
              </p>
            )}

            {BANDS.filter((b) => grouped[b].length > 0).map((band) => (
              <section key={band} className="mb-9">
                <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${BAND_STYLE[band].dot}`} />
                    <h2 className={`font-heading text-lg font-bold ${BAND_STYLE[band].text}`}>{bandLabel(band)}</h2>
                    {/* The band's real size, not how many of it are on screen —
                        behind the gate those differ, and the honest number is
                        the one the search actually found. */}
                    <span className="tnum text-[15px] text-muted-foreground">{data.counts[band]}</span>
                  </div>
                  <p className="text-[14px] text-muted-foreground">{BAND_STYLE[band].blurb}</p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  {grouped[band].map((r, i) => (
                    <motion.article
                      key={`${r.instituteSlug}-${r.course}-${r.quota}-${i}`}
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: Math.min(i * 0.02, 0.3), ease: [0.2, 0, 0, 1] }}
                      className="flex flex-col gap-3 border-b border-border p-4 last:border-b-0 transition-colors hover:bg-surface-2 md:flex-row md:items-center md:gap-4"
                    >
                      <span className={`hidden h-3 w-3 shrink-0 rounded-full md:block ${BAND_STYLE[band].dot}`} />

                      <div className="min-w-0 flex-grow md:w-[30%]">
                        <h3 className="truncate text-[15px] font-semibold leading-snug text-foreground">{r.institute}</h3>
                        <p className="truncate text-[13px] text-muted-foreground">
                          <span className="capitalize">{r.ownership}</span>
                          {r.state ? ` · ${r.state}` : ""}
                          {r.counselling ? ` · ${r.counselling}` : ""}
                        </p>
                      </div>

                      <div className="md:w-[22%]">
                        <p className="text-[14px] text-foreground">{r.course}</p>
                        <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
                          {r.quota} · {r.category}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 md:ml-auto md:flex-nowrap">
                        <div className="md:w-24 md:text-right">
                          <div className="tnum font-semibold text-foreground">{fmt(r.firstRoundRank)}</div>
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">R1 close</div>
                        </div>
                        <div className="md:w-24 md:text-right">
                          <div className="tnum font-semibold text-foreground">{fmt(r.widestRank)}</div>
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            widest {r.year ?? ""}
                          </div>
                        </div>
                        <div className="md:w-20 md:text-right">
                          <div className="tnum text-foreground">{money(r.feeInr)}</div>
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">fee/yr</div>
                        </div>
                        <div className="md:w-24 md:text-right">
                          {r.movement ? (
                            <div
                              className={`tnum inline-flex items-center gap-1 text-[13px] font-medium ${
                                r.movement.direction === "easier"
                                  ? "text-signal-safe"
                                  : r.movement.direction === "tighter"
                                    ? "text-signal-stretch"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {r.movement.direction === "easier" ? (
                                <TrendingUp className="h-3.5 w-3.5" />
                              ) : r.movement.direction === "tighter" ? (
                                <TrendingDown className="h-3.5 w-3.5" />
                              ) : (
                                <Minus className="h-3.5 w-3.5" />
                              )}
                              {r.movement.direction === "flat"
                                ? "flat"
                                : `${r.movement.delta > 0 ? "+" : ""}${r.movement.delta.toLocaleString("en-IN")}`}
                            </div>
                          ) : (
                            <span className="text-[13px] text-muted-foreground">one year</span>
                          )}
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">vs last yr</div>
                        </div>
                        <div className={`tnum font-heading text-xl font-extrabold md:w-14 md:text-right ${BAND_STYLE[band].text}`}>
                          {r.score}%
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </section>
            ))}

            {data.locked && (data.lockedCount ?? 0) > 0 && (
              <UnlockCard
                lockedCount={data.lockedCount ?? 0}
                level={level}
                rank={rankNumber}
                category={category}
                onUnlocked={run}
              />
            )}

            <div className="mt-6 rounded-2xl border border-border bg-slate-950 p-7 md:p-9">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="max-w-[58ch]">
                  <h2 className="font-heading text-xl font-bold text-white md:text-2xl">
                    {data.total} seats found. Ordering them is the part that decides your year.
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-300">
                    A safe seat placed below a stretch one is how students lose a season. We build your preference
                    order from the same closing ranks you just searched.
                  </p>
                </div>
                <button
                  onClick={() => CTA.call()}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition-all hover:shadow-glow-lg hover:-translate-y-0.5"
                >
                  <Phone className="h-4 w-4" />
                  Build my choice order
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-[13px] leading-relaxed text-muted-foreground">
              These bands are historical, not a forecast. They state where the cut actually landed in published
              rounds and place your rank against it — nothing here predicts what this year&apos;s cut will do.
            </p>
          </>
        )}

        {!data && !loading && !error && (
          <div className="mx-auto max-w-lg py-10 text-center">
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Enter your rank above. You will get every seat it reaches, split by how safely it reaches them — with
              the closing rank behind each one, so you can check the number yourself.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
