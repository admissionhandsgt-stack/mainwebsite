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
  seats: number | null;
  widestRank: number | null;
  firstRoundRank: number | null;
  previousYearRank: number | null;
  year: number | null;
  band: ChanceBand;
  score: number;
  reason: string;
  movement: { delta: number; direction: "easier" | "tighter" | "flat" } | null;
}

interface ApiResponse {
  counts: Record<ChanceBand, number>;
  total: number;
  truncated: boolean;
  locked?: boolean;
  lockedCount?: number;
  needsVerification?: boolean;
  signedIn?: boolean;
  results: SeatResult[];
  error?: string;
}

interface Props {
  level: "ug" | "pg";
  states: string[];
  categories: string[];
  branches: string[];
  ownerships: string[];
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

const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-IN"));

const money = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function PredictorClient({
  level,
  states,
  categories,
  branches,
  ownerships,
}: Props) {
  const searchParams = useSearchParams();
  const seededRank = searchParams.get("rank") ?? "";

  const [rank, setRank] = useState(seededRank);
  // GEN in PG data, UR in UG data — the default comes from what this level
  // actually publishes rather than a guess.
  const [category, setCategory] = useState(
    () => categories.find((c) => c === "GEN" || c === "UR") ?? categories[0] ?? "GEN",
  );
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [ownership, setOwnership] = useState<string[]>([]);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      if (selectedBranches.length) params.set("branches", selectedBranches.join(","));
      if (ownership.length) params.set("ownership", ownership.join(","));

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
  }, [rankValid, rankNumber, level, category, selectedStates, selectedBranches, ownership]);

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
  }, [category, selectedStates, selectedBranches, ownership]);

  const grouped = useMemo(() => {
    const out: Record<ChanceBand, SeatResult[]> = { safe: [], likely: [], possible: [], stretch: [] };
    data?.results.forEach((r) => out[r.band].push(r));
    return out;
  }, [data]);

  const activeFilters =
    selectedStates.length + selectedBranches.length + ownership.length;

  const clearFilters = () => {
    setSelectedStates([]);
    setSelectedBranches([]);
    setOwnership([]);
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

        <div className="relative mx-auto w-full max-w-[1600px] px-4 pb-24 pt-10 sm:px-6 md:pt-12 lg:px-8">
          {/* The tool is a product of the brand, and says so. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg shadow-cyan-500/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/images/logos/logo-4k.avif"
                  alt="AdmissionHands"
                  width={44}
                  height={44}
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="h-9 w-px bg-white/15" aria-hidden="true" />
              <span>
                <span className="font-heading block text-[21px] font-extrabold leading-none tracking-tight text-white">
                  SeatPredict
                </span>
                <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300/80">
                  by AdmissionHands
                </span>
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-200 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              NEET {level.toUpperCase()} 2026
            </span>
          </div>

          <h1 className="font-heading mt-8 max-w-[20ch] text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
            Enter your rank.{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-teal-200 bg-clip-text text-transparent">
              See the seats it reaches.
            </span>
          </h1>

          <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            Every seat placed against the round it actually closed in &mdash; round one, the widest
            the cut went, and how far it has ever reached. Read from the counselling
            authorities&rsquo; own published results. Nothing estimated.
          </p>
        </div>
      </section>

      {/* The search panel lifts off the header rather than sitting under it, so
          the first thing on the page is the thing you came to use. */}
      <div className="relative z-10 mx-auto -mt-12 w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <section
          aria-label="Search"
          className="rounded-2xl border border-border bg-card p-4 shadow-lift md:p-6"
        >
          <form
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
                    Find my seats
                  </button>
                </div>
                {rank && !rankValid && (
                  <p id="rank-error" className="mt-2 text-[13px] text-signal-stretch">
                    Rank must be a number between 1 and 20,00,000.
                  </p>
                )}
              </div>

              {/* Visible rather than hidden behind a button — a filter nobody
                  can see is a filter nobody uses. */}
              <div className="flex flex-wrap items-end gap-2 lg:justify-end">
                <MultiSelect
                  label="Branch"
                  options={branches}
                  selected={selectedBranches}
                  onChange={setSelectedBranches}
                />
                <MultiSelect
                  label="State"
                  options={states}
                  selected={selectedStates}
                  onChange={setSelectedStates}
                />
                <MultiSelect
                  label="College type"
                  options={ownerships}
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
                {categories.slice(0, 8).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={c === category}
                    onClick={() => setCategory(c)}
                    className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors md:py-1.5 ${
                      category === c
                        ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {c}
                  </button>
                ))}

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

      <div className="mx-auto w-full max-w-[1600px] px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      {/* ------------------------------ results ------------------------------ */}
      <div ref={resultsRef} className="mt-8 scroll-mt-24">
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
              No seat on record reaches this rank
            </h2>
            <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">
              With these filters, no published round has ever closed at or past{" "}
              <span className="tnum font-semibold text-foreground">{fmt(rankNumber)}</span>.
              Widening the branch or state filter is usually what opens it up.
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

            {locked ? (
              <LockedPanel
                total={data.total}
                rank={rankNumber}
                level={level}
                category={category}
                needsVerification={Boolean(data.needsVerification)}
                onUnlocked={run}
              />
            ) : (
              <>
                {data.truncated && (
                  <p className="mt-5 rounded-xl border border-border bg-surface-2 px-4 py-3 text-[13px] text-muted-foreground">
                    Showing the {data.total} most competitive seats you reach. Narrow by branch or
                    state to see the rest.
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
                    <SeatTable rows={grouped[band]} level={level} band={band} />
                  </section>
                ))}

                <p className="mt-8 text-center text-[13px] leading-relaxed text-muted-foreground">
                  These bands are historical, not a forecast. They state where the cut actually
                  landed in published rounds and place your rank against it — nothing here predicts
                  what this year&apos;s cut will do.
                </p>
              </>
            )}
          </>
        )}

        {!data && !loading && !error && (
          <div className="mx-auto max-w-4xl py-6">
            <p className="mx-auto max-w-[56ch] text-center text-[15px] leading-relaxed text-muted-foreground">
              Enter your rank above. Every seat it reaches, sorted by how safely it reaches them.
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
                  title: "See which way it moved",
                  body: "Each seat carries last year's cut beside this year's, so you can see the direction.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <li
                  key={title}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </span>
                  <h2 className="font-heading mt-3.5 text-[15px] font-bold text-foreground">{title}</h2>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

/**
 * What a locked visitor sees.
 *
 * One panel and one button. The sign-in form used to sit open underneath this,
 * which made a finished search look like it had ended in a form — two stacked
 * cards, a heading repeated, and fields demanding attention before the visitor
 * had read their own result. The form now lives in a dialog behind the button,
 * so the page ends on the answer and the ask is a single deliberate step.
 *
 * The counts above are already a real answer, so this is not hiding whether
 * there is anything. It is asking for a number before naming the colleges, and
 * saying exactly what is behind it.
 */
function LockedPanel({
  total,
  rank,
  level,
  category,
  needsVerification,
  onUnlocked,
}: {
  total: number;
  rank: number;
  level: "ug" | "pg";
  category: string;
  needsVerification: boolean;
  onUnlocked: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface-2">
      <div className="relative px-6 py-10 text-center md:px-8 md:py-12">
        <div
          className="ambient-blob pointer-events-none absolute -right-24 -top-28 h-72 w-72 opacity-40"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-2xl">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary-soft">
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>

          <h2 className="font-heading mt-4 text-2xl font-extrabold text-foreground md:text-3xl">
            <span className="tnum">{total}</span> seats match rank{" "}
            <span className="tnum">{rank.toLocaleString("en-IN")}</span>
          </h2>

          <p className="mx-auto mt-2.5 max-w-[58ch] text-[15px] leading-relaxed text-muted-foreground">
            The counts above are yours for free. Sign in to see <em>which</em> colleges — each
            seat&rsquo;s round-1 close, the widest the cut reached, the fee, and how it moved
            against last year.
          </p>

          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="mt-7 inline-flex h-14 items-center justify-center gap-2.5 rounded-xl bg-gradient-brand px-8 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow-lg active:translate-y-0"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            Find my seats
          </button>

          <p className="mt-3 text-[13px] text-muted-foreground">
            {needsVerification
              ? "Takes one tap on WhatsApp. No password."
              : "Takes a few seconds. No password."}
          </p>

          {/* The columns that are behind the gate, sketched — so what is being
              asked for is concrete rather than a mystery. */}
          <div
            className="mx-auto mt-9 max-w-xl overflow-hidden rounded-xl border border-border bg-card/50"
            aria-hidden="true"
          >
            <div className="grid grid-cols-4 gap-2 border-b border-border bg-surface-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="col-span-2 text-left">College &amp; branch</span>
              <span className="text-right">R1 close</span>
              <span className="text-right">Fee / yr</span>
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-4 items-center gap-2 px-4 py-3">
                <span
                  className="col-span-2 h-3 rounded bg-muted/60"
                  style={{ width: `${72 - i * 14}%` }}
                />
                <span className="ml-auto h-3 w-12 rounded bg-muted/60" />
                <span className="ml-auto h-3 w-10 rounded bg-muted/60" />
              </div>
            ))}
          </div>
        </div>
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
 * The results, as a table on desktop and cards on a phone.
 *
 * The previous version squeezed the college name into a 30%-wide cell with
 * `truncate`, which on a narrow viewport cut names down to "Ja…" and "Go…" —
 * the single most important column rendered useless. Here the name gets the
 * space it needs and the numeric columns are fixed-width, because they are the
 * ones with a predictable size.
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
            <th scope="col" className="w-[34%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              College
            </th>
            <th scope="col" className="w-[20%] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Branch &amp; quota
            </th>
            <th scope="col" className="w-[11%] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              R1 close
            </th>
            <th scope="col" className="w-[11%] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Widest
            </th>
            <th scope="col" className="w-[10%] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fee / yr
            </th>
            <th scope="col" className="w-[14%] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              vs last year
            </th>
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
                {r.year && (
                  <span className="block text-[11px] text-muted-foreground">{r.year}</span>
                )}
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
