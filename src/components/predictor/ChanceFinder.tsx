"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BadgeCheck, Loader2, MapPin, ShieldCheck, Users } from "lucide-react";
import AuthFlow from "@/components/auth/AuthFlow";
import CounsellingCTA from "@/components/lead/CounsellingCTA";
import TelegramJoin from "@/components/engage/TelegramJoin";
import { checkRank } from "@/lib/neetLimits";
import { BUDGET_BANDS, type Stream } from "@/lib/counsellingOptions";
import ChanceInsight, { ChanceBar } from "./ChanceInsight";
import ChanceResults from "./ChanceResults";
import ProfileWizard, { draftFrom, essentialsDone, type Draft } from "./ProfileWizard";
import type { PredictData, RoundsData, StreamFacets, Viewer } from "./chanceTypes";
import { aaTrack, aaCourse, trackLead } from "@/lib/analytics";
import { TeamFigure } from "@/components/engage/TeamFigures";

/**
 * The Admission Chance flow (2026-10-12) — what /neet-college-predictor is now.
 *
 *   start ─▶ insight (anybody: counts, standing, what moves after round 1)
 *         ─▶ sign in (a code, so the number is real)
 *         ─▶ profile (course by course, a few questions a step, the count moving)
 *         ─▶ results (colleges in chance words, approximate fees)
 *
 * No closing rank is shown at any stage — see lib/depth.ts for the decision
 * and lib/chanceView.ts for what the server sends instead. The point of the
 * order is that every step gives something before it asks for something.
 */

type Stage = "start" | "insight" | "auth" | "profile" | "results";

const STREAMS: { id: Stream; label: string; level: "ug" | "pg"; course: string }[] = [
  { id: "mbbs", label: "MBBS", level: "ug", course: "MBBS" },
  { id: "bds", label: "BDS", level: "ug", course: "BDS" },
  { id: "pg", label: "MD / MS", level: "pg", course: "MD/MS" },
];

const inr = (n: number) => n.toLocaleString("en-IN");

/** Ownership values the PG seat data actually carries; UG has none. */
const FILTERABLE_OWNERSHIP = ["government", "private", "deemed"];

export default function ChanceFinder({
  facets,
  allStates,
  viewer,
  hero,
}: {
  facets: Record<Stream, StreamFacets>;
  allStates: string[];
  viewer: Viewer;
  /** The page's pitch, shown beside the form on the first screen. */
  hero?: React.ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const profile = viewer.profile;

  const [stream, setStream] = useState<Stream>(() => {
    const fromUrl = params.get("course");
    if (fromUrl === "mbbs" || fromUrl === "bds" || fromUrl === "pg") return fromUrl;
    return profile?.stream ?? "mbbs";
  });
  const spec = STREAMS.find((s) => s.id === stream)!;
  const categories = facets[stream].categories.map((c) => c.code);
  // The open category by default. The facets are ordered by seats, which put SC
  // first for MBBS and opened the form on the wrong category for most people.
  const defaultCategory =
    ["UR", "GEN", "OPEN"].find((c) => categories.includes(c)) ?? categories[0] ?? (spec.level === "ug" ? "UR" : "GEN");

  const [rankText, setRankText] = useState(params.get("rank") ?? (profile?.rank ? String(profile.rank) : ""));
  const [category, setCategory] = useState(params.get("category") ?? profile?.category ?? "");
  const [stage, setStage] = useState<Stage>("start");
  const [data, setData] = useState<PredictData | null>(null);
  const [rounds, setRounds] = useState<RoundsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => {
    const d = draftFrom(profile, viewer.name);
    const branch = params.get("branch");
    if (branch && !d.branches.includes(branch)) d.branches = [...d.branches, branch].slice(0, 5);
    const seat = params.get("seatType");
    if ((seat === "nri" || seat === "management") && !d.seatTypes.includes(seat)) d.seatTypes = [...d.seatTypes, seat];
    return d;
  });
  const [matching, setMatching] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [preferencesOn, setPreferencesOn] = useState(true);
  const verified = viewer.verified;
  const top = useRef<HTMLDivElement>(null);

  const checked = checkRank(rankText, spec.level);
  const rank = checked.ok ? checked.value : 0;
  const cat = category && categories.includes(category) ? category : defaultCategory;

  // Score first, for MD/MS (owner's request, 2026-10-20): the score shows the rank range it held in
  // NBEMS's published result (/api/score-rank), and the student types the exact rank inside it.
  // MBBS/BDS stay rank-first — NTA publishes no complete marks-to-rank list.
  const [scoreText, setScoreText] = useState(profile?.neetScore != null && stream === "pg" ? String(profile.neetScore) : "");
  const [scoreRange, setScoreRange] = useState<{ year: number; score: number; outOf: number; rankMin: number; rankMax: number; candidates: number | null } | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  useEffect(() => {
    setScoreRange(null);
    setScoreError(null);
    const s = scoreText.trim();
    if (stream !== "pg" || !/^-?\d{1,3}$/.test(s)) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/score-rank?exam=pg&score=${encodeURIComponent(s)}`);
        const json = await res.json();
        if (res.ok) setScoreRange(json);
        else setScoreError(json.error ?? null);
      } catch {
        /* the rank field still works without it */
      }
    }, 350);
    return () => clearTimeout(t);
  }, [scoreText, stream]);
  const rankOutside = !!scoreRange && rank > 0 && (rank < scoreRange.rankMin || rank > scoreRange.rankMax);

  // The category list differs by course (UG publishes UR, PG publishes GEN).
  useEffect(() => {
    if (category && !categories.includes(category)) setCategory("");
  }, [stream]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollTop = () => top.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  /** The query the student's own answers imply. */
  const preferenceQuery = useCallback(
    (d: Draft, on: boolean) => {
      const q = new URLSearchParams();
      if (!on) return q;
      if (!d.anywhere && d.preferredStates.length) q.set("states", d.preferredStates.join(","));
      // Home states: another state's own quota is not this student's (lib/categoryScope.ts).
      const home = [d.domicileState, spec.level === "pg" ? d.mbbsState : ""].filter(Boolean);
      if (home.length) q.set("home", home.join(","));
      if (spec.level === "pg") {
        const own = d.collegeTypes.filter((t) => FILTERABLE_OWNERSHIP.includes(t));
        if (own.length) q.set("ownership", own.join(","));
        if (d.branches.length) q.set("branches", d.branches.join(","));
      }
      const band = BUDGET_BANDS.find((b) => b.id === d.budget);
      if (band?.max) q.set("maxFee", String(band.max));
      const seat = d.seatTypes;
      if (seat.length === 1 && (seat[0] === "nri" || seat[0] === "management")) q.set("seatType", seat[0]);
      return q;
    },
    [spec.level],
  );

  const predict = useCallback(
    async (extra?: URLSearchParams): Promise<PredictData> => {
      const q = new URLSearchParams(extra);
      q.set("stream", stream);
      q.set("rank", String(rank));
      q.set("category", cat);
      const res = await fetch(`/api/predict?${q}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not read the counselling data.");
      return json as PredictData;
    },
    [stream, rank, cat],
  );

  /** Step one: the free answer. */
  const run = async () => {
    if (!checked.ok) return setError(checked.error);
    aaTrack("cutoff_search", { course: aaCourse(stream), category: cat, state: draft.domicileState || undefined });
    setError(null);
    setLoading(true);
    try {
      const [d, r] = await Promise.all([
        predict(verified ? preferenceQuery(draft, preferencesOn) : undefined),
        fetch(`/api/rounds?stream=${stream}&rank=${rank}&category=${encodeURIComponent(cat)}`)
          .then((x) => (x.ok ? x.json() : null))
          .catch(() => null),
      ]);
      setData(d);
      setRounds(r ? { openedTotal: r.openedTotal ?? 0, tightenedTotal: r.tightenedTotal ?? 0 } : null);
      setMatching(d.total);
      // Keep the URL shareable.
      const url = new URL(window.location.href);
      url.searchParams.set("course", stream);
      url.searchParams.set("rank", String(rank));
      url.searchParams.set("category", cat);
      window.history.replaceState(null, "", url.toString());
      if (!verified) setStage("insight");
      else if (essentialsDone(stream, draft) && profile?.stream === stream) setStage("results");
      else setStage("profile");
      scrollTop();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Arriving with a rank in the link — from a college page, a WhatsApp reply, a
  // returning visitor — goes straight to the answer.
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    if (checked.ok && (params.get("rank") || (verified && profile?.rank))) {
      ran.current = true;
      void run();
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  /** After each wizard step: save, then recount against everything answered. */
  const onStepSaved = async (fields: Record<string, unknown>, last: boolean) => {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...fields,
        stream,
        rank,
        category: cat,
        // The score typed on the first screen (MD/MS) — a counsellor reads it beside the rank.
        ...(stream === "pg" && scoreRange ? { neetScore: scoreRange.score } : {}),
        ...(last ? { notify: true, source: `Admission Chance (${spec.label})`, optionsSeen: matching ?? undefined } : {}),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Could not save that.");
    if (last) {
      trackLead({
        form: "predictor_profile",
        course: stream,
        state: typeof fields.domicileState === "string" ? fields.domicileState : undefined,
        rank,
      });
    }
    setCounting(true);
    try {
      const d = await predict(preferenceQuery(draft, true));
      setData(d);
      setMatching(d.total);
    } catch (e) {
      // A daily rank limit or a blip must not lose the answers just saved.
      if (e instanceof Error && /different ranks today/.test(e.message)) setError(e.message);
    } finally {
      setCounting(false);
    }
  };

  const togglePreferences = async () => {
    const next = !preferencesOn;
    setPreferencesOn(next);
    setLoading(true);
    try {
      setData(await predict(preferenceQuery(draft, next)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const signedInDone = async () => {
    router.refresh();
    setStage("profile");
    setLoading(true);
    try {
      const d = await predict();
      setData(d);
      setMatching(d.total);
    } catch {
      /* the wizard recounts on its first save */
    } finally {
      setLoading(false);
    }
    scrollTop();
  };

  const trust = useMemo(
    () => (
      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-muted-foreground">
        <li className="inline-flex items-center gap-1.5">
          <BadgeCheck className="h-4 w-4 text-accent" aria-hidden="true" /> <TeamFigure k="years" /> years of counselling
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Users className="h-4 w-4 text-primary" aria-hidden="true" /> Expert counsellors
        </li>
        <li className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" aria-hidden="true" /> Office in Noida
        </li>
        <li className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" /> Free to check, no payment
        </li>
      </ul>
    ),
    [],
  );

  /** The three inputs — stacked inside the first-screen card, in a row once there is an answer. */
  const renderForm = (stacked: boolean) => (
    <>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className={
          stacked
            ? "mt-5 grid gap-4"
            : "grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,0.8fr)_auto] md:items-end"
        }
      >
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-foreground">Course</legend>
          <div className={`grid grid-cols-3 gap-1.5 rounded-xl bg-surface-2 p-1 ${stacked ? "" : "md:flex"}`}>
            {STREAMS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={stream === s.id}
                onClick={() => {
                  if (s.id === stream) return;
                  setStream(s.id);
                  // A different course is a different set of questions and a
                  // different answer — start that course from the top.
                  setStage("start");
                  setData(null);
                  setMatching(null);
                }}
                className={`min-h-11 rounded-lg px-3.5 text-[14px] font-bold transition-colors ${
                  stream === s.id ? "bg-card text-primary-strong shadow-sm dark:text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
        {stacked && stream === "pg" && (
          <div>
            <label className="block">
              <span className="text-[13px] font-semibold text-foreground">NEET PG score</span>
              <input
                value={scoreText}
                onChange={(e) => setScoreText(e.target.value.replace(/[^\d-]/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="e.g. 450"
                className="tnum font-heading mt-1.5 h-12 w-full rounded-xl border border-border bg-background px-4 text-lg font-extrabold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            {scoreRange ? (
              <p className="mt-2 rounded-xl bg-primary-soft px-3.5 py-2.5 text-[13.5px] leading-snug text-foreground" aria-live="polite">
                Score <b className="tnum">{scoreRange.score}</b> in NEET PG {scoreRange.year} = rank{" "}
                <b className="tnum">
                  {inr(scoreRange.rankMin)}
                  {scoreRange.rankMax !== scoreRange.rankMin ? ` – ${inr(scoreRange.rankMax)}` : ""}
                </b>
                {scoreRange.candidates && scoreRange.candidates > 1 ? (
                  <span className="text-muted-foreground"> · {inr(scoreRange.candidates)} candidates had this score</span>
                ) : null}
                {!rankText && (
                  <button
                    type="button"
                    onClick={() => setRankText(String(Math.round((scoreRange.rankMin + scoreRange.rankMax) / 2)))}
                    className="mt-1.5 block text-[13px] font-semibold text-primary-strong underline-offset-2 hover:underline dark:text-primary"
                  >
                    Rank not handy? Use {inr(Math.round((scoreRange.rankMin + scoreRange.rankMax) / 2))}
                  </button>
                )}
              </p>
            ) : scoreError ? (
              <p className="mt-2 text-[12.5px] text-signal-stretch">{scoreError}</p>
            ) : null}
          </div>
        )}
        <div className={stacked ? "grid gap-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : "contents"}>
          <label className="block">
            <span className="text-[13px] font-semibold text-foreground">
              {stacked && scoreRange ? "Your exact rank" : `NEET ${spec.level.toUpperCase()} all-India rank`}
            </span>
            <input
              value={rankText}
              onChange={(e) => setRankText(e.target.value)}
              inputMode="numeric"
              placeholder={scoreRange ? `${inr(scoreRange.rankMin)} – ${inr(scoreRange.rankMax)}` : spec.level === "pg" ? "e.g. 25000" : "e.g. 45000"}
              className={`tnum font-heading mt-1.5 h-12 w-full rounded-xl border bg-background px-4 text-lg font-extrabold text-foreground outline-none transition-colors focus:ring-2 focus:ring-primary/20 ${
                (rankText && !checked.ok) || rankOutside ? "border-signal-stretch" : "border-border focus:border-primary"
              }`}
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold text-foreground">Category</span>
            <select
              value={cat}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-xl border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-primary"
            >
              {categories.slice(0, 14).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        {stacked && (
          <p className="-mt-2 text-[12px] text-muted-foreground">
            {stream === "pg"
              ? "Your score and your rank are both on your NEET PG scorecard."
              : "Your all-India rank is on your NEET scorecard — not your marks."}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-70 ${
            stacked ? "w-full text-[16px]" : ""
          }`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {stage === "start" ? "Show my possibilities" : "Update"}
          {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </form>
      {rankText && !checked.ok && <p className="mt-2 text-[12.5px] text-signal-stretch">{checked.error}</p>}
      {checked.ok && rankOutside && scoreRange && (
        <p className="mt-2 text-[12.5px] text-signal-stretch">
          A score of {scoreRange.score} held ranks {inr(scoreRange.rankMin)} – {inr(scoreRange.rankMax)} in NEET PG {scoreRange.year}. Check the rank or the score on your scorecard.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[13.5px] font-medium text-destructive">
          {error}
        </p>
      )}
    </>
  );

  return (
    <div ref={top} className="container-custom scroll-mt-24 py-8 md:py-12">
      {/* ---------------- start: the three things that decide everything ----------------
          On the first screen the form sits beside the page's pitch (the `hero`
          the page passes in), so the fold is one composed block rather than a
          heading floating over a small card. Once there is an answer, the form
          becomes a slim bar above it. */}
      {stage === "start" ? (
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div>{hero}</div>
          <section className="relative rounded-3xl border border-primary/25 bg-card p-5 shadow-glow-lg sm:p-7">
            <span
              className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-glow"
              aria-hidden="true"
            >
              Free · 10 seconds
            </span>
            <h2 className="font-heading mt-2 text-[1.35rem] font-extrabold leading-tight text-foreground">
              Get your possibility report
            </h2>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              {stream === "pg" ? "Your score, rank and category." : "Your rank and category."} No sign-in needed for the first answer.
            </p>
            {renderForm(true)}
            <div className="mt-5 border-t border-border pt-4">{trust}</div>
          </section>
        </div>
      ) : (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-lift md:p-6">{renderForm(false)}</section>
      )}

      <div className="mt-6">
        {stage === "insight" && data && (
          <ChanceInsight
            data={data}
            rounds={rounds}
            rank={rank}
            category={cat}
            courseLabel={spec.label}
            onUnlock={() => {
              setStage("auth");
              scrollTop();
            }}
          />
        )}

        {stage === "auth" && (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-10">
            {/* The sign-in card first on a phone, beside what it unlocks on a desktop. */}
            <div className="lg:order-2">
              <AuthFlow
                level={spec.level}
                rank={rank}
                category={cat}
                noun="colleges"
                lockedCount={data ? data.shape.colleges : 0}
                skipProfile
                onDone={signedInDone}
              />
            </div>

            <aside className="rounded-3xl border border-primary/20 bg-card p-6 shadow-lift md:p-8 lg:order-1">
              <p data-aa-mask className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Your possibility report · {spec.label} · rank <span className="tnum">{rank.toLocaleString("en-IN")}</span> · {cat}
              </p>
              {data ? (
                <>
                  <h2 className="font-heading mt-2 text-[clamp(1.4rem,2.6vw,1.9rem)] font-extrabold leading-tight text-foreground">
                    <span className="text-gradient-brand tnum">
                      {(data.counts.safe + data.counts.likely + data.counts.possible).toLocaleString("en-IN")}
                    </span>{" "}
                    reachable options across{" "}
                    <span className="tnum">{data.shape.colleges.toLocaleString("en-IN")}</span> colleges
                  </h2>
                  <div className="mt-5">
                    <ChanceBar counts={data.counts} total={data.total} />
                  </div>
                </>
              ) : (
                <h2 className="font-heading mt-2 text-[1.6rem] font-extrabold leading-tight text-foreground">Your list is ready</h2>
              )}

              <div className="mt-7 grid gap-6 border-t border-border pt-6 sm:grid-cols-2">
                <div>
                  <p className="font-heading text-[15.5px] font-bold text-foreground">After you sign in</p>
                  <ul className="mt-3 space-y-2.5">
                    {[
                      "Every college on your list, with your chance at each",
                      "An approximate fee for each college",
                      "A shortlist tuned to your budget, states and quota",
                      "A counsellor's round-by-round roadmap, when you want it",
                    ].map((t) => (
                      <li key={t} className="flex gap-2.5 text-[14px] leading-snug text-foreground">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-surface-2 p-4">
                  <p className="flex items-center gap-1.5 font-heading text-[15px] font-bold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" /> Why your number
                  </p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    A one-time code proves the number is yours, so your list stays yours. A counsellor uses it to reach you
                    about counselling — nothing else. It is never sold or passed on.
                  </p>
                </div>
              </div>
              <div className="mt-6 border-t border-border pt-5">{trust}</div>
            </aside>
          </div>
        )}

        {stage === "profile" && (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
            <ProfileWizard
              stream={stream}
              facets={facets[stream]}
              allStates={allStates}
              draft={draft}
              setDraft={setDraft}
              matching={matching}
              counting={counting}
              onStepSaved={onStepSaved}
              onFinish={() => {
                setPreferencesOn(true);
                setStage("results");
                scrollTop();
              }}
            />
            <aside className="space-y-4 lg:sticky lg:top-[calc(var(--site-top,112px)_+_1rem)] lg:self-start">
              <div className="rounded-3xl border border-primary/20 bg-card p-6 shadow-lift">
                <p data-aa-mask className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {spec.label} · rank <span className="tnum">{rank.toLocaleString("en-IN")}</span> · {cat}
                </p>
                <p className="tnum font-heading mt-2 text-[2.2rem] font-extrabold leading-none text-foreground">
                  {matching == null ? "—" : matching.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-[13.5px] text-muted-foreground">seat options match your answers so far</p>
                {data && (
                  <div className="mt-4">
                    <ChanceBar counts={data.counts} total={data.total} />
                  </div>
                )}
              </div>
              <div className="rounded-3xl border border-border bg-surface-2 p-6">
                <p className="font-heading text-[15.5px] font-bold text-foreground">Why we ask</p>
                <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  <li className="flex gap-2.5">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    Domicile, gender and PwD decide which quotas are yours to take.
                  </li>
                  <li className="flex gap-2.5">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    Budget and states turn a long list into a shortlist you would actually join.
                  </li>
                  <li className="flex gap-2.5">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    Your counsellor reads these first — so the call starts with your plan, not with questions.
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        )}

        {stage === "results" && data && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <ChanceResults
              data={data}
              level={spec.level}
              courseLabel={spec.label}
              rank={rank}
              category={cat}
              preferencesOn={preferencesOn}
              onTogglePreferences={togglePreferences}
              onEdit={() => {
                setStage("profile");
                scrollTop();
              }}
            />
            <aside className="space-y-5 lg:sticky lg:top-[calc(var(--site-top,112px)_+_1rem)] lg:self-start">
              <CounsellingCTA
                headline={`${inr((data.options ?? []).length)} colleges are on your list. Which order to fill them in is the decision.`}
                source={`Admission Chance results (${spec.label})`}
                level={spec.level === "pg" ? "pg" : "ug"}
              />
              {/* The first screen after the sign-in code — the WhatsApp code
                  itself cannot carry it (Meta fixes an authentication template's text). */}
              <TelegramJoin placement="results" bare stacked />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
