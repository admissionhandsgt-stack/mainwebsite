"use client";

import { useMemo, useState } from "react";
import Link from "@/components/ui/Link";
import { rankBand, trackEvent, aaTrack } from "@/lib/analytics";

/**
 * Score → the rank range NBEMS gave it → the MD/MS branches whose All India Quota seats in the running
 * counselling's latest round went that far down (marks-vs-rank page). Everything is handed in by the page:
 * the score list is NBEMS's published result, the branch figures are over three or more colleges, so nothing
 * here is one college's cut. Words from Admin → Content ("Page: NEET PG marks vs rank — body").
 */

type Row = [score: number, rankMin: number, rankMax: number, candidates: number | null];
export interface LookupCopy {
  title: string;
  intro: string;
  score: string;
  category: string;
  button: string;
  result: string;
  branches: string;
  none: string;
  cta: string;
}

const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
const n = (v: number) => v.toLocaleString("en-IN");
// The predictor's PG category codes; MCC's lists say Open where our data says GEN.
const PREDICTOR_CAT: Record<string, string> = { Open: "GEN", OBC: "OBC", EWS: "EWS", SC: "SC", ST: "ST" };

export default function MarksRankLookup({
  year,
  outOf,
  rows,
  round,
  cuts,
  copy,
}: {
  year: number;
  outOf: number;
  rows: Row[];
  /** "Round 1", or null when no round of the running counselling has a result yet. */
  round: string | null;
  /** Category → [branch, last rank admitted], most competitive first. */
  cuts: Record<string, [string, number][]>;
  copy: LookupCopy;
}) {
  const cats = Object.keys(cuts);
  const [score, setScore] = useState("");
  const [cat, setCat] = useState(cats[0] ?? "Open");
  const [shown, setShown] = useState<{ score: number; cat: string } | null>(null);
  const [error, setError] = useState("");
  const byScore = useMemo(() => new Map(rows.map((r) => [r[0], r])), [rows]);
  const max = rows[0]?.[0] ?? outOf;
  const min = rows[rows.length - 1]?.[0] ?? 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = Number(score.trim());
    if (!/^-?\d{1,3}$/.test(score.trim())) return setError(`Type your score as a whole number, e.g. 450.`), setShown(null);
    if (s > max || s < min) return setError(`NEET PG ${year} scores ran from ${max} down to ${min} (out of ${outOf}).`), setShown(null);
    if (!byScore.has(s)) return setError(`Nobody scored exactly ${s} in NEET PG ${year} — check the score on your scorecard.`), setShown(null);
    setError("");
    setShown({ score: s, cat });
    const r = byScore.get(s)!;
    trackEvent("marks_rank_lookup", { exam: "pg", rank_band: rankBand(r[2]) });
    aaTrack("marks_rank_lookup", { exam: "pg", rank_band: rankBand(r[2]) ?? "" });
  };

  const r = shown ? byScore.get(shown.score) : null;
  const reached = r && round ? (cuts[shown!.cat] ?? []).filter(([, last]) => last >= r[2]) : [];
  const mid = r ? Math.round((r[1] + r[2]) / 2) : 0;

  return (
    <div className="rounded-3xl border border-primary/25 bg-primary-soft p-5 shadow-sm md:p-7">
      <h2 className="font-heading text-[1.35rem] font-black leading-tight tracking-tight text-foreground md:text-[1.6rem]">{copy.title}</h2>
      <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed text-foreground/80">{copy.intro}</p>
      <form onSubmit={submit} className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-sm font-semibold text-foreground">
          {copy.score}
          <input
            inputMode="numeric"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="450"
            aria-describedby="marks-error"
            className="min-h-12 rounded-xl border border-border bg-background px-4 text-base font-normal text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        {round && cats.length > 0 && (
          <label className="flex min-w-[9rem] flex-col gap-1.5 text-sm font-semibold text-foreground">
            {copy.category}
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="min-h-12 rounded-xl border border-border bg-background px-3 text-base font-normal text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary-strong px-6 text-base font-bold text-primary-foreground shadow-glow transition-colors hover:bg-primary-strong/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {copy.button}
        </button>
      </form>
      <p id="marks-error" role="alert" className="mt-2 min-h-[1.25rem] text-sm font-medium text-destructive">
        {error}
      </p>
      {r && shown && (
        <div className="mt-2 rounded-2xl border border-border bg-card p-4 md:p-5" aria-live="polite" data-aa-mask>
          <p className="text-[16px] font-semibold leading-relaxed text-foreground">
            {fill(copy.result, { score: shown.score, year, min: n(r[1]), max: n(r[2]), cand: r[3] != null ? n(r[3]) : "—" })}
          </p>
          {round && (
            <>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
                {reached.length
                  ? fill(copy.branches, { n: reached.length, cat: shown.cat, round, max: n(r[2]) })
                  : fill(copy.none, { cat: shown.cat, round, max: n(r[2]) })}
              </p>
              {reached.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {reached.map(([b, last]) => (
                    <li key={b} className="rounded-full border border-border bg-surface-1 px-3 py-1 text-[13px] text-foreground">
                      {b} <span className="tnum text-muted-foreground">· up to {n(last)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <Link
            href={`/neet-college-predictor?course=pg&rank=${mid}&category=${PREDICTOR_CAT[shown.cat] ?? "GEN"}`}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-primary px-5 text-sm font-bold text-primary-strong hover:bg-primary hover:text-primary-foreground"
          >
            {fill(copy.cta, { rank: n(mid) })}
          </Link>
        </div>
      )}
    </div>
  );
}
