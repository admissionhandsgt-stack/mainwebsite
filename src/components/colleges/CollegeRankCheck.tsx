"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "@/components/ui/Link";
import { checkRank } from "@/lib/neetLimits";

type Course = "mbbs" | "bds" | "pg";

/**
 * Words for the link to the predictor, varied by college so 3,500 pages do not
 * all point at it with one identical anchor (2026-10-17). Picked from the slug,
 * so a page always says the same thing.
 */
const ANCHORS: Record<Course, string[]> = {
  mbbs: [
    "Open the NEET college predictor",
    "See every MBBS college your rank can reach",
    "Try the free NEET UG college predictor",
    "Compare MBBS colleges for your rank",
    "Check your chances across all MBBS colleges",
  ],
  bds: [
    "Open the NEET college predictor for BDS",
    "See every BDS college your rank can reach",
    "Try the free BDS college predictor",
    "Compare dental colleges for your rank",
    "Check your chances across all BDS colleges",
  ],
  pg: [
    "Open the NEET PG college predictor",
    "See every PG seat your rank can reach",
    "Try the free MD/MS college predictor",
    "Compare PG colleges for your rank",
    "Find MD, MS and DNB seats for your rank",
  ],
};
const pick = (list: string[], key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return list[h % list.length];
};

/**
 * "Your chance at this college" — the rank box on every college page, right
 * under the summary.
 *
 * Someone arriving from a search result has one question, and the page cannot
 * answer it from static data — so this hands them straight to the predictor
 * with the course chosen and their rank filled in, rather than making them find
 * the tool and retype it.
 */
export default function CollegeRankCheck({
  collegeName,
  course,
  slug,
  wide = false,
}: {
  collegeName: string;
  course: Course;
  slug: string;
  /** One row across the page (under the summary) rather than a sidebar card. */
  wide?: boolean;
}) {
  const level = course === "pg" ? "pg" : "ug";
  const router = useRouter();
  const [rank, setRank] = useState("");

  const checked = checkRank(rank, level);
  const n = checked.ok ? checked.value : NaN;
  const valid = checked.ok;
  const exam = level === "pg" ? "NEET PG" : "NEET UG";
  const anchor = pick(ANCHORS[course], slug);

  return (
    <section
      aria-labelledby="your-chance"
      className={`rounded-2xl border border-primary/40 bg-card p-5 shadow-lift ${wide ? "md:flex md:items-center md:gap-8 md:p-6" : ""}`}
    >
      <div className={wide ? "md:flex-1" : ""}>
        <h2 id="your-chance" className="font-heading text-[16px] font-bold text-foreground md:text-[18px]">
          Your chance at {collegeName}
        </h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
          Enter your {exam} rank: high, good, possible or reach, from where its seats actually closed in past rounds.
        </p>
        <p className="mt-2 text-[13px]">
          <Link href={`/neet-college-predictor?course=${course}`} className="font-semibold text-primary hover:underline">
            {anchor}
          </Link>
        </p>
      </div>

      <form
        className={wide ? "mt-4 md:mt-0 md:w-[22rem]" : "mt-4"}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) router.push(`/neet-college-predictor?course=${course}&rank=${n}`);
        }}
      >
        <label htmlFor="college-rank" className="sr-only">
          Your {exam} all-India rank
        </label>
        <div className={wide ? "flex flex-col gap-2 sm:flex-row" : ""}>
          <input
            id="college-rank"
            inputMode="numeric"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            placeholder={level === "pg" ? "e.g. 12450" : "e.g. 45000"}
            className={`tnum font-heading w-full rounded-xl border bg-card px-3.5 py-2.5 text-xl font-extrabold text-foreground outline-none transition-colors ${
              rank && !valid ? "border-signal-stretch" : "border-border focus:border-primary"
            }`}
          />
          <button
            type="submit"
            disabled={!valid}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-3 text-[14px] font-bold text-white shadow-glow transition-all hover:shadow-glow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none ${
              wide ? "sm:w-auto sm:shrink-0" : "mt-3"
            }`}
          >
            Check my chance
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {rank && !valid && <p className="mt-1.5 text-[12px] text-signal-stretch">{checked.ok ? "" : checked.error}</p>}
        <p className="mt-2 text-[12px] text-muted-foreground">Free. Sign in with your mobile to see your colleges.</p>
      </form>
    </section>
  );
}
