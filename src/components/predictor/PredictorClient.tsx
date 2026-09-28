"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Lock,
  X,
  Loader2,
} from "lucide-react";
import MultiSelect from "@/components/predictor/MultiSelect";
import AuthDialog from "@/components/lead/AuthDialog";
import ProfileTuner from "@/components/lead/ProfileTuner";
import CounsellingCTA from "@/components/lead/CounsellingCTA";
import { categoryMeaning } from "@/lib/categoryLabels";
import { bandLabel, type ChanceBand } from "@/lib/predictor";
import type { Facets, SeatTypeFacet, SeatTypeId, Stream, StreamSpec } from "@/lib/predictorFacets";

/* ------------------------------------------------------------------ types */

interface SeatResult {
  institute: string;
  instituteSlug: string;
  state: string | null;
  ownership: string;
  course: string;
  quota: string;
  category: string;
  feeInr: number | null;
  widestRank: number | null;
  firstRoundRank: number | null;
  year: number | null;
  band: ChanceBand;
  movement: { delta: number; direction: "easier" | "tighter" | "flat" } | null;
}

/** Aggregate over the whole result, for whoever cannot see the rows. */
interface ResultShape {
  states: number;
  colleges: number;
  branches: number;
  feeMin: number | null;
  feeMax: number | null;
  topStates: { state: string; seats: number }[];
}

interface PredictResponse {
  counts: Record<ChanceBand, number>;
  total: number;
  truncated: boolean;
  locked?: boolean;
  needsVerification?: boolean;
  results: SeatResult[];
  shape?: ResultShape;
  error?: string;
}

interface RoundMove {
  institute: string;
  instituteSlug: string;
  state: string | null;
  course: string;
  quota: string;
  year: number;
  r1: number | null;
  later: number | null;
  laterRound: string | null;
  movement: number | null;
}

interface RoundsResponse {
  openedTotal: number;
  tightenedTotal: number;
  opened: RoundMove[];
  tightened: RoundMove[];
  locked?: boolean;
  error?: string;
}

interface Props {
  streams: StreamSpec[];
  facets: Record<Stream, Facets>;
}

/* ------------------------------------------------------------------ style */

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

const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-IN"));

const money = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

/** Which answer is on screen. Both come from the same rank. */
type View = "seats" | "rounds";

/* ------------------------------------------------------------------- main */

/**
 * One tool, every NEET stream.
 *
 * MBBS, BDS and MD/MS were three pages asking the identical question, and
 * "what opened after round 1" was two more. That is five URLs for one rank,
 * splitting the search traffic and making a visitor retype their rank to ask
 * the obvious follow-up. The course is a filter; the round-1 movement is a
 * tab. Same rank, one page.
 */
export default function PredictorClient({ streams, facets }: Props) {
  const searchParams = useSearchParams();

  const [stream, setStream] = useState<Stream>(
    () => streams.find((s) => s.id === searchParams.get("course"))?.id ?? "pg",
  );
  const spec = streams.find((s) => s.id === stream) ?? streams[0];
  const f = facets[stream];

  const seededRank = searchParams.get("rank") ?? "";
  const [rank, setRank] = useState(seededRank);
  // GEN in PG data, UR in UG data — the default comes from what the chosen
  // course actually publishes rather than a guess.
  const [category, setCategory] = useState(
    () =>
      facets[stream].categories.find((c) => c.code === "GEN" || c.code === "UR")?.code ??
      facets[stream].categories[0]?.code ??
      "GEN",
  );
  /**
   * Which state's colleges — removed on purpose.
   *
   * "State" on a filter bar reads two ways, and both are reasonable: the state
   * you want a seat in, or the state you have domicile in. They lead to
   * different lists and the label could not say which without a sentence. The
   * useful half of it moved to the profile question, where domicile is asked in
   * words and drives the home-state quota advice a counsellor gives.
   */
  const [seatType, setSeatType] = useState<SeatTypeId>("all");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [ownership, setOwnership] = useState<string[]>([]);

  const [view, setView] = useState<View>("seats");
  const [data, setData] = useState<PredictResponse | null>(null);
  const [rounds, setRounds] = useState<RoundsResponse | null>(null);
  // Asked once, right after the seats appear — see ProfileTuner.
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const rankNumber = Number(rank.replace(/[,\s]/g, ""));
  const rankValid = Number.isFinite(rankNumber) && rankNumber >= 1 && rankNumber <= 2000000;

  /** Changing course changes which categories and branches even exist. */
  const switchStream = (next: Stream) => {
    if (next === stream) return;
    setStream(next);
    const cats = facets[next].categories;
    setCategory(cats.find((c) => c.code === "GEN" || c.code === "UR")?.code ?? cats[0]?.code ?? "GEN");
    setSelectedBranches([]);
    setOwnership([]);
    setSeatType("all");
    setData(null);
    setRounds(null);
    setError(null);
  };

  const run = useCallback(async () => {
    if (!rankValid) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ rank: String(rankNumber), stream, category });
      if (seatType !== "all") params.set("seatType", seatType);
      if (selectedBranches.length) params.set("branches", selectedBranches.join(","));
      if (ownership.length) params.set("ownership", ownership.join(","));

      // Both answers are fetched together: the second tab is the same question
      // one step later, and nobody should wait again to ask it.
      const [seats, moves] = await Promise.all([
        fetch(`/api/predict?${params}`).then((r) => r.json()),
        fetch(
          `/api/rounds?rank=${rankNumber}&stream=${stream}&category=${encodeURIComponent(category)}`,
        )
          .then((r) => r.json())
          .catch(() => null),
      ]);

      if (seats?.error) throw new Error(seats.error);
      setData(seats);
      setRounds(moves && !moves.error ? moves : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your colleges. Try again.");
      setData(null);
      setRounds(null);
    } finally {
      setLoading(false);
    }
  }, [rankValid, rankNumber, stream, category, seatType, selectedBranches, ownership]);

  // Arriving with ?rank= from a college page: search immediately rather than
  // showing a form they already filled in.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !seededRank || !rankValid) return;
    seeded.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seededRank, rankValid]);

  // Re-run when a filter changes, but only once a search has happened.
  useEffect(() => {
    if (data || error) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, category, seatType, selectedBranches, ownership]);

  const grouped = useMemo(() => {
    const out: Record<ChanceBand, SeatResult[]> = { safe: [], likely: [], possible: [], stretch: [] };
    data?.results.forEach((r) => out[r.band].push(r));
    return out;
  }, [data]);

  const activeFilters =
    selectedBranches.length + ownership.length + (seatType === "all" ? 0 : 1);

  const clearFilters = () => {
    setSelectedBranches([]);
    setOwnership([]);
    setSeatType("all");
  };

  const locked = Boolean(data?.locked);

  return (
    <>
      {/* ---------------------- branded tool header ---------------------- */}
      <section className="relative overflow-hidden bg-slate-950">
        <div
          className="ambient-blob pointer-events-none absolute -left-32 -top-40 h-[30rem] w-[30rem] opacity-60"
          aria-hidden="true"
        />
        <div
          className="ambient-blob pointer-events-none absolute -bottom-52 right-0 h-[26rem] w-[26rem] opacity-40"
          aria-hidden="true"
        />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true" />

        <div className="relative mx-auto w-full max-w-[calc(var(--page-max)+220px)] px-4 pb-24 pt-10 sm:px-6 md:pt-12 lg:px-8">
          {/* The tool is a product of the brand, and says so. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex items-center gap-3">
              {/* The mark is a wide wordmark (roughly 3:1), so it gets a wide
                  plate. Squeezed into a square it renders as a hairline. */}
              <span className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-3 shadow-lg shadow-cyan-500/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/images/logos/logo.avif"
                  alt="AdmissionHands"
                  width={140}
                  height={35}
                  className="h-[26px] w-auto object-contain"
                />
              </span>
              <span className="h-9 w-px bg-white/15" aria-hidden="true" />
              <span>
                <span className="font-heading block text-[21px] font-extrabold leading-none tracking-tight text-white">
                  NEET College Predictor
                </span>
                <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300/80">
                  by AdmissionHands
                </span>
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-200 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Counselling 2026
            </span>
          </div>

          <h1 className="font-heading mt-8 max-w-[22ch] text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
            Enter your rank.{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-teal-200 bg-clip-text text-transparent">
              See the colleges it reaches.
            </span>
          </h1>

          <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            MBBS, BDS and MD/MS in one place. Every seat placed against the round it actually closed
            in &mdash; round one, the widest the cut went, and how far it has ever reached. Read from
            the counselling authorities&rsquo; own published results. Nothing estimated.
          </p>
        </div>
      </section>

      {/* The search panel lifts off the header rather than sitting under it, so
          the first thing on the page is the thing you came to use. */}
      <div className="relative z-10 mx-auto -mt-12 w-full max-w-[calc(var(--page-max)+220px)] px-4 sm:px-6 lg:px-8">
        <section aria-label="Search" className="rounded-2xl border border-border bg-card shadow-lift">
          {/* The course picker leads, because it decides what everything below
              it means — which categories exist, and whether Branch applies. */}
          <div className="flex flex-wrap gap-1 border-b border-border p-2" role="tablist" aria-label="Course">
            {streams.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === stream}
                onClick={() => switchStream(s.id)}
                className={`min-h-[44px] rounded-xl px-5 py-2.5 text-[14px] font-bold transition-colors ${
                  s.id === stream
                    ? "bg-gradient-brand text-white shadow-glow"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <form
            className="p-4 md:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              run();
              setTimeout(
                () => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
                80,
              );
            }}
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <label
                  htmlFor="rank"
                  className="mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Your NEET {spec.level.toUpperCase()} rank
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="rank"
                    inputMode="numeric"
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    placeholder="e.g. 12450"
                    aria-describedby={rank && !rankValid ? "rank-error" : undefined}
                    className={`tnum font-heading h-14 w-full rounded-xl border-2 bg-background px-4 text-2xl font-extrabold tracking-tight text-foreground outline-none transition-colors sm:max-w-[16rem] ${
                      rank && !rankValid
                        ? "border-signal-stretch"
                        : "border-border focus:border-primary"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!rankValid || loading}
                    className="inline-flex h-14 shrink-0 items-center justify-center gap-2.5 rounded-xl bg-gradient-brand px-8 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-none"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Search className="h-5 w-5" aria-hidden="true" />
                    )}
                    Find my colleges
                  </button>
                </div>
                {rank && !rankValid && (
                  <p id="rank-error" className="mt-2 text-[13px] text-signal-stretch">
                    Rank must be a number between 1 and 20,00,000.
                  </p>
                )}
              </div>

              {/* Visible rather than hidden behind a button — a filter nobody
                  can see is a filter nobody uses. Branch only exists for PG. */}
              <div className="flex flex-wrap items-end gap-2 lg:justify-end">
                {spec.hasBranches && f.branches.length > 0 && (
                  <MultiSelect
                    label="Branch"
                    options={f.branches}
                    selected={selectedBranches}
                    onChange={setSelectedBranches}
                  />
                )}
                {f.seatTypes.length > 1 && (
                  <SeatTypePicker value={seatType} options={f.seatTypes} onChange={setSeatType} />
                )}
                <MultiSelect
                  label="College type"
                  options={f.ownerships}
                  selected={ownership}
                  onChange={setOwnership}
                  align="right"
                />
              </div>
            </div>

            <fieldset className="mt-5 border-t border-border pt-4">
              <legend className="sr-only">Category</legend>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Category
                </span>
                {f.categories.slice(0, 8).map((c) => {
                  const meaning = categoryMeaning(c.code);
                  const chosen = category === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      aria-pressed={chosen}
                      onClick={() => setCategory(c.code)}
                      // The hint is the whole point of the chip: GM is
                      // Karnataka's general merit and MNG costs several times a
                      // government seat, and a bare code says neither.
                      title={`${meaning.label} — ${meaning.hint}`}
                      className={`group relative min-h-[44px] rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors md:min-h-0 md:py-1.5 ${
                        chosen
                          ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {c.code}
                      <span className="tnum ml-1.5 text-[11px] font-normal opacity-70">
                        {c.seats.toLocaleString("en-IN")}
                      </span>
                    </button>
                  );
                })}

                {activeFilters > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-signal-stretch/50 hover:text-foreground md:py-1.5"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Clear {activeFilters} filter{activeFilters === 1 ? "" : "s"}
                  </button>
                )}
              </div>
            </fieldset>
          </form>
        </section>
      </div>

      {/* ------------------------------ results ------------------------------ */}
      <div
        ref={resultsRef}
        className="mx-auto w-full max-w-[calc(var(--page-max)+220px)] scroll-mt-24 px-4 pb-14 pt-8 sm:px-6 lg:px-8"
      >
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-grow space-y-2">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-muted/70" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto max-w-lg rounded-2xl border border-signal-stretch/30 bg-signal-stretch/[0.06] p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-signal-stretch" aria-hidden="true" />
            <h2 className="mt-3 font-heading text-lg font-bold text-foreground">
              That didn&apos;t load
            </h2>
            <p className="mt-1.5 text-[15px] text-muted-foreground">{error}</p>
            <button
              onClick={run}
              className="mt-5 rounded-xl bg-gradient-brand px-5 py-3 text-sm font-bold text-white shadow-glow"
            >
              Try again
            </button>
          </div>
        )}

        {data && !loading && data.total === 0 && (
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
            <h2 className="font-heading text-lg font-bold text-foreground">
              No {spec.label} seat on record reaches this rank
            </h2>
            <p className="mx-auto mt-2 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
              With these filters, no published round has closed at or past{" "}
              <span className="tnum font-semibold text-foreground">{fmt(rankNumber)}</span>. Widening
              the state filter, or trying another course above, is usually what opens it up.
            </p>
            {activeFilters > 0 && (
              <button
                onClick={clearFilters}
                className="mt-5 rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition-colors hover:border-primary/40"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {data && !loading && data.total > 0 && (
          <>
            {/* The counts are the free answer, and a complete one. */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {BANDS.map((b) => (
                <div key={b} className={`rounded-2xl border p-4 md:p-5 ${BAND_STYLE[b].ring}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${BAND_STYLE[b].dot}`} />
                    <span className={`text-[13px] font-bold ${BAND_STYLE[b].text}`}>
                      {bandLabel(b)}
                    </span>
                  </div>
                  <div className="tnum font-heading mt-1.5 text-4xl font-extrabold leading-none text-foreground">
                    {data.counts[b]}
                  </div>
                  <p className="mt-2 hidden text-[12px] leading-snug text-muted-foreground lg:block">
                    {BAND_STYLE[b].blurb}
                  </p>
                </div>
              ))}
            </div>

            {/* The follow-up question, on the same page and the same rank.
                It used to be its own route, which meant retyping the rank to
                ask the thing you ask immediately after seeing the answer. */}
            {rounds && (rounds.openedTotal > 0 || rounds.tightenedTotal > 0) && (
              <div className="mt-8 flex gap-1 rounded-xl border border-border bg-surface-2 p-1" role="tablist">
                {(
                  [
                    ["seats", `Colleges for rank ${fmt(rankNumber)}`, null],
                    ["rounds", "What changed after round 1", rounds.openedTotal],
                  ] as [View, string, number | null][]
                ).map(([id, label, badge]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={view === id}
                    onClick={() => setView(id)}
                    className={`min-h-[44px] flex-1 rounded-lg px-4 py-2.5 text-[14px] font-bold transition-colors ${
                      view === id
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                    {badge != null && badge > 0 && (
                      <span className="tnum ml-2 text-[13px] font-semibold text-accent">
                        +{fmt(badge)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {locked ? (
              <LockedPanel
                total={data.total}
                rank={rankNumber}
                level={spec.level}
                category={category}
                shape={data.shape}
                needsVerification={Boolean(data.needsVerification)}
                extra={rounds ? rounds.openedTotal + rounds.tightenedTotal : 0}
                onUnlocked={() => {
                  setJustUnlocked(true);
                  run();
                }}
              />
            ) : view === "rounds" ? (
              <RoundsView rounds={rounds} rank={rankNumber} level={spec.level} />
            ) : (
              <>
                {justUnlocked && (
                  <div className="mt-6">
                    <ProfileTuner
                      level={spec.level}
                      branches={spec.hasBranches ? f.branches : []}
                      states={f.states}
                      // The rank and category were typed into the tool itself,
                      // so the tuner drops those two questions and asks the
                      // three it does not already have.
                      initial={{ rank: String(rankNumber), category }}
                      source={`Seat predictor (${spec.level.toUpperCase()})`}
                      onDone={() => setJustUnlocked(false)}
                      onSkip={() => setJustUnlocked(false)}
                    />
                  </div>
                )}

                {data.truncated && (
                  <p className="mt-5 rounded-xl border border-border bg-surface-2 px-4 py-3 text-[13px] text-muted-foreground">
                    Showing the {data.total} most competitive seats you reach. Narrow by state
                    {spec.hasBranches ? " or branch" : ""} to see the rest.
                  </p>
                )}

                {BANDS.filter((b) => grouped[b].length > 0).map((band) => (
                  <section key={band} className="mt-8">
                    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${BAND_STYLE[band].dot}`} />
                        <h2 className={`font-heading text-lg font-bold ${BAND_STYLE[band].text}`}>
                          {bandLabel(band)}
                        </h2>
                        <span className="tnum text-[15px] text-muted-foreground">
                          {data.counts[band]}
                        </span>
                      </div>
                      <p className="text-[14px] text-muted-foreground">{BAND_STYLE[band].blurb}</p>
                    </div>
                    <SeatTable rows={grouped[band]} level={spec.level} band={band} />
                  </section>
                ))}

                <p className="mt-8 text-center text-[13px] leading-relaxed text-muted-foreground">
                  These bands are historical, not a forecast. They state where the cut actually
                  landed in published rounds and place your rank against it — nothing here predicts
                  what this year&apos;s cut will do.
                </p>

                <CounsellingCTA
                  className="mt-8"
                  source={`Seat predictor (${spec.level.toUpperCase()})`}
                  headline={
                    data.counts
                      ? `${(data.counts.safe + data.counts.likely).toLocaleString("en-IN")} seats are realistically in reach. Filling them in the right order is the decision.`
                      : undefined
                  }
                />
              </>
            )}
          </>
        )}

        {!data && !loading && !error && <EmptyState />}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ parts */

/**
 * NRI / management / everything.
 *
 * It sits where the State filter used to. NRI is the one people came looking
 * for and could not find, because the chips only ever offered categories and
 * NRI is a quota — 1,400+ seats that the tool held and never surfaced.
 *
 * Segmented rather than a dropdown: three options, and the count on each is
 * the answer to "do you even have these?".
 */
function SeatTypePicker({
  value,
  options,
  onChange,
}: {
  value: SeatTypeId;
  options: SeatTypeFacet[];
  onChange: (v: SeatTypeId) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Seat type"
      className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-card p-0.5"
    >
      {options.map((o) => {
        const chosen = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={chosen}
            onClick={() => onChange(o.id)}
            title={
              o.id === "nri"
                ? "Seats reserved under an NRI quota. The widest ranks and the highest fees."
                : o.id === "management"
                  ? "Management-quota seats. Open to far larger ranks, at several times a government fee."
                  : "Every seat, whatever quota it sits under."
            }
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold transition-colors ${
              chosen
                ? "bg-primary-soft text-primary-strong dark:text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
            {o.id !== "all" && (
              <span className="tnum text-[11px] font-normal opacity-70">
                {o.seats.toLocaleString("en-IN")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-4xl py-6">
      <p className="mx-auto max-w-[56ch] text-center text-[15px] leading-relaxed text-muted-foreground">
        Pick your course above and enter your rank. Every college it reaches, sorted by how safely it
        reaches them.
      </p>

      <ul className="mt-9 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: "Published rounds only",
            body: "Round one, the widest the cut went that year, and how far it has ever reached. No invented scores.",
          },
          {
            icon: SlidersHorizontal,
            title: "Narrow it to your list",
            body: "Filter by branch, state and college type, and the bands recalculate against what is left.",
          },
          {
            icon: TrendingDown,
            title: "And what came after round 1",
            body: "Which seats opened up later and which closed tighter — the float-or-freeze call, on the same page.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <li key={title} className="rounded-2xl border border-border bg-card p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <h2 className="font-heading mt-3.5 text-[15px] font-bold text-foreground">{title}</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * What a locked visitor sees.
 *
 * One panel and one button. The sign-in form used to sit open underneath this,
 * which made a finished search look like it had ended in a form. The form now
 * lives in a dialog behind the button, so the page ends on the answer and the
 * ask is a single deliberate step.
 *
 * The counts above are already a real answer, so this is not hiding whether
 * there is anything. It asks for a number before naming the colleges, and says
 * exactly what is behind it.
 */
function LockedPanel({
  total,
  rank,
  level,
  category,
  shape,
  needsVerification,
  extra,
  onUnlocked,
}: {
  total: number;
  rank: number;
  level: "ug" | "pg";
  category: string;
  shape?: ResultShape;
  needsVerification: boolean;
  extra: number;
  onUnlocked: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const fee =
    shape?.feeMin != null && shape.feeMax != null
      ? shape.feeMin === shape.feeMax
        ? money(shape.feeMin)
        : `${money(shape.feeMin)} – ${money(shape.feeMax)}`
      : null;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid gap-px bg-border md:grid-cols-5">
        {/* ------------------------------------------------------- the ask */}
        <div className="relative bg-surface-2 p-6 md:col-span-3 md:p-8">
          <div
            className="ambient-blob pointer-events-none absolute -right-20 -top-24 h-64 w-64 opacity-40"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary-strong dark:text-primary">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Your result is ready
            </p>

            <h2 className="font-heading mt-3 text-[1.6rem] font-extrabold leading-[1.15] text-foreground md:text-[2rem]">
              <span className="tnum">{fmt(total)}</span> seats match rank{" "}
              <span className="tnum">{rank.toLocaleString("en-IN")}</span>
            </h2>

            <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-muted-foreground">
              The counts above are yours for free. Sign in to see <em>which</em> colleges — each
              seat&rsquo;s round-1 close, the widest the cut reached, the fee, and how it moved
              against last year
              {extra > 0 ? (
                <>
                  {" "}
                  — plus the <span className="tnum font-semibold text-foreground">{fmt(extra)}</span>{" "}
                  seats that opened or tightened after round 1.
                </>
              ) : (
                "."
              )}
            </p>

            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-brand px-8 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow-lg active:translate-y-0 sm:w-auto"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
              Show me these {fmt(total)} seats
            </button>

            <p className="mt-2.5 text-[12.5px] text-muted-foreground">
              {needsVerification
                ? "Your phone number, verified once. No payment."
                : "Your phone number, once. No payment."}
            </p>
          </div>
        </div>

        {/* --------------------------------------------------- what it is */}
        {/*
          This replaces a grey skeleton of the table, which told a candidate
          nothing except that something was hidden. These are aggregates over
          the same result — they cannot be turned back into a row, and they make
          the offer concrete: how far it spreads, and what the seats cost.
        */}
        <dl className="bg-card p-6 md:col-span-2 md:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            What is in it
          </p>

          <div className="mt-4 grid grid-cols-3 gap-4">
            {[
              ["Colleges", shape ? fmt(shape.colleges) : "—"],
              [level === "pg" ? "Branches" : "Courses", shape ? fmt(shape.branches) : "—"],
              ["States", shape ? fmt(shape.states) : "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dd className="tnum font-heading text-2xl font-extrabold leading-none text-foreground">
                  {value}
                </dd>
                <dt className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {label}
                </dt>
              </div>
            ))}
          </div>

          {fee && (
            <div className="mt-5 border-t border-border pt-4">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Fee a year, lowest to highest
              </dt>
              <dd className="tnum font-heading mt-1 text-lg font-extrabold text-foreground">{fee}</dd>
              {/*
                The span is real but the two ends are not the same kind of seat,
                and a reader who attaches the low number to their own rank has
                made exactly the mistake this site was corrected for once
                already. So the sentence names what sits at each end.
              */}
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                Government seats sit at the low end and management or NRI seats at the high end —
                the same rank does not reach both.
              </p>
            </div>
          )}

          {shape && shape.topStates.length > 1 && (
            <div className="mt-5 border-t border-border pt-4">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Mostly in</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {shape.topStates.map((s) => (
                  <span
                    key={s.state}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[12px] text-foreground"
                  >
                    {s.state}
                    <span className="tnum text-muted-foreground">{s.seats}</span>
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <AuthDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onUnlocked={onUnlocked}
        lockedCount={total}
        level={level}
        rank={rank}
        category={category}
        noun="seats"
      />
    </div>
  );
}

/**
 * What happened after round 1, for the rank already entered.
 *
 * This was two standalone pages. It is the decision that comes straight after
 * the predictor answers — you hold a seat, do you float for something better
 * or freeze what you have — so it belongs beside the result, not behind
 * another search box.
 */
function RoundsView({
  rounds,
  rank,
  level,
}: {
  rounds: RoundsResponse | null;
  rank: number;
  level: "ug" | "pg";
}) {
  const base = level === "ug" ? "/mbbs-india/colleges" : "/md-ms-india/colleges";

  if (!rounds) {
    return (
      <p className="mt-8 rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-[14px] text-muted-foreground">
        Round-by-round movement is not available for this search.
      </p>
    );
  }

  const Table = ({ moves, opened }: { moves: RoundMove[]; opened: boolean }) => (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[620px] table-fixed border-collapse">
        <thead>
          <tr className="bg-surface-2">
            {(
              [
                ["College", "w-[36%] text-left"],
                ["Branch", "w-[22%] text-left"],
                ["Round 1", "w-[14%] text-right"],
                ["Later round", "w-[15%] text-right"],
                ["Movement", "w-[13%] text-right"],
              ] as [string, string][]
            ).map(([h, cls]) => (
              <th
                key={h}
                scope="col"
                className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${cls}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {moves.map((m, i) => (
            <tr key={`${m.instituteSlug}-${m.course}-${i}`} className="border-t border-border hover:bg-surface-2">
              <td className="px-4 py-3 align-top">
                <Link
                  href={`${base}/${m.instituteSlug}`}
                  className="text-[14px] font-semibold leading-snug text-foreground hover:text-primary"
                >
                  {m.institute}
                </Link>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {m.state ?? "—"} · {m.year}
                </p>
              </td>
              <td className="px-4 py-3 align-top">
                <p className="text-[14px] leading-snug text-foreground">{m.course}</p>
                <p className="mt-0.5 text-[12px] uppercase tracking-wide text-muted-foreground">
                  {m.quota}
                </p>
              </td>
              <td className="tnum px-4 py-3 text-right align-top text-[14px] text-muted-foreground">
                {fmt(m.r1)}
              </td>
              <td className="tnum px-4 py-3 text-right align-top text-[14px] font-semibold text-foreground">
                {fmt(m.later)}
                {m.laterRound && (
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    {m.laterRound}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right align-top">
                <span
                  className={`tnum inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold ${
                    opened ? "bg-accent-soft text-accent" : "bg-signal-stretch/10 text-signal-stretch"
                  }`}
                >
                  {m.movement == null ? "—" : `${m.movement > 0 ? "+" : ""}${fmt(m.movement)}`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-accent">
            Opened after round 1
          </span>
          <div className="tnum font-heading mt-1 text-3xl font-extrabold leading-none text-foreground">
            {fmt(rounds.openedTotal)}
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Seats round 1 closed above rank {fmt(rank)} that a later round reached. This is the case
            for floating — counted, not promised.
          </p>
        </div>
        <div className="rounded-2xl border border-signal-stretch/30 bg-signal-stretch/5 p-5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-signal-stretch">
            Tightened after round 1
          </span>
          <div className="tnum font-heading mt-1 text-3xl font-extrabold leading-none text-foreground">
            {fmt(rounds.tightenedTotal)}
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Seats within reach in round 1 whose later rounds closed at better ranks only. Give one of
            those up and you could not take it back.
          </p>
        </div>
      </div>

      {rounds.opened.length > 0 && (
        <section className="mt-8">
          <h2 className="font-heading text-lg font-bold text-foreground">What opened up</h2>
          <p className="mt-1 max-w-[74ch] text-[14px] leading-relaxed text-muted-foreground">
            Upgrades free seats, and a freed seat goes to whoever is next — which is why a later
            round can reach much further down than round 1 did.
          </p>
          <div className="mt-4">
            <Table moves={rounds.opened} opened />
          </div>
        </section>
      )}

      {rounds.tightened.length > 0 && (
        <section className="mt-10">
          <h2 className="font-heading text-lg font-bold text-foreground">
            What tightened — why floating is not free
          </h2>
          <p className="mt-1 max-w-[74ch] text-[14px] leading-relaxed text-muted-foreground">
            These were within reach in round 1 and then closed at better ranks only.
          </p>
          <div className="mt-4">
            <Table moves={rounds.tightened} opened={false} />
          </div>
        </section>
      )}

      <p className="mt-8 text-center text-[13px] leading-relaxed text-muted-foreground">
        Float and freeze rules differ by counselling authority. Read your own authority&rsquo;s
        notice before acting on any of this.
      </p>
    </div>
  );
}

/**
 * The results, as a table on desktop and cards on a phone.
 *
 * An earlier version squeezed the college name into a 30%-wide cell with
 * `truncate`, which on a narrow viewport cut names down to "Ja…" — the single
 * most important column rendered useless. Here the name gets the space it
 * needs and the numeric columns are fixed-width, because they are the ones
 * with a predictable size.
 */
function SeatTable({
  rows,
  level,
  band,
}: {
  rows: SeatResult[];
  level: "ug" | "pg";
  band: ChanceBand;
}) {
  const base = level === "ug" ? "/mbbs-india/colleges" : "/md-ms-india/colleges";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* ---------- desktop ---------- */}
      <table className="hidden w-full table-fixed border-collapse lg:table">
        <thead>
          <tr className="bg-surface-2">
            {(
              [
                ["College", "w-[34%] text-left"],
                ["Branch & quota", "w-[20%] text-left"],
                ["R1 close", "w-[11%] text-right"],
                ["Widest", "w-[11%] text-right"],
                ["Fee / yr", "w-[10%] text-right"],
                ["vs last year", "w-[14%] text-right"],
              ] as [string, string][]
            ).map(([h, cls]) => (
              <th
                key={h}
                scope="col"
                className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${cls}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={`${r.instituteSlug}-${r.course}-${r.quota}-${i}`}
              className="border-t border-border transition-colors hover:bg-surface-2"
            >
              <td className="px-4 py-3 align-top">
                <Link
                  href={`${base}/${r.instituteSlug}`}
                  className="text-[14px] font-semibold leading-snug text-foreground hover:text-primary"
                >
                  {r.institute}
                </Link>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  <span className="capitalize">{r.ownership}</span>
                  {r.state ? ` · ${r.state}` : ""}
                </p>
              </td>
              <td className="px-4 py-3 align-top">
                <p className="text-[14px] leading-snug text-foreground">{r.course}</p>
                <p className="mt-0.5 text-[12px] uppercase tracking-wide text-muted-foreground">
                  {r.quota} · {r.category}
                </p>
              </td>
              <td className="tnum px-4 py-3 text-right align-top text-[14px] font-semibold text-foreground">
                {fmt(r.firstRoundRank)}
              </td>
              <td className="tnum px-4 py-3 text-right align-top text-[14px] text-foreground">
                {fmt(r.widestRank)}
                {r.year && <span className="block text-[11px] text-muted-foreground">{r.year}</span>}
              </td>
              <td className="tnum px-4 py-3 text-right align-top text-[14px] text-foreground">
                {money(r.feeInr)}
              </td>
              <td className="px-4 py-3 text-right align-top">
                <Movement m={r.movement} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---------- phone ---------- */}
      <ul className="divide-y divide-border lg:hidden">
        {rows.map((r, i) => (
          <li key={`${r.instituteSlug}-${r.course}-${r.quota}-${i}`} className="p-4">
            <div className="flex items-start gap-2.5">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${BAND_STYLE[band].dot}`} />
              <div className="min-w-0 flex-grow">
                <Link
                  href={`${base}/${r.instituteSlug}`}
                  className="block text-[15px] font-semibold leading-snug text-foreground"
                >
                  {r.institute}
                </Link>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  <span className="capitalize">{r.ownership}</span>
                  {r.state ? ` · ${r.state}` : ""}
                </p>
                <p className="mt-1.5 text-[14px] text-foreground">{r.course}</p>
                <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
                  {r.quota} · {r.category}
                </p>

                <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-2.5">
                  {[
                    ["R1 close", fmt(r.firstRoundRank)],
                    ["Widest", fmt(r.widestRank)],
                    ["Fee / yr", money(r.feeInr)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {k}
                      </dt>
                      <dd className="tnum text-[14px] font-semibold text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-2">
                  <Movement m={r.movement} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Movement({ m }: { m: SeatResult["movement"] }) {
  if (!m) return <span className="text-[13px] text-muted-foreground">one year only</span>;
  const Icon = m.direction === "easier" ? TrendingUp : m.direction === "tighter" ? TrendingDown : Minus;
  const tone =
    m.direction === "easier"
      ? "text-signal-safe"
      : m.direction === "tighter"
        ? "text-signal-stretch"
        : "text-muted-foreground";
  return (
    <span className={`tnum inline-flex items-center gap-1 text-[13px] font-medium ${tone}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {m.direction === "flat"
        ? "flat"
        : `${m.delta > 0 ? "+" : ""}${m.delta.toLocaleString("en-IN")}`}
    </span>
  );
}
