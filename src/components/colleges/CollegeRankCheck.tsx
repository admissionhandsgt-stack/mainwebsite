"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * The inline rank box on every college page.
 *
 * Someone arriving here from a search result has one question, and the page
 * cannot answer it from static data — so this hands them straight to the
 * predictor with their rank already filled in, rather than making them find
 * the tool and retype it.
 */
export default function CollegeRankCheck({
  collegeName,
  level = "pg",
}: {
  collegeName: string;
  level?: "ug" | "pg";
}) {
  // One tool covers every course, so the level only picks the tab it opens on.
  const course = level === "ug" ? "mbbs" : "pg";
  const router = useRouter();
  const [rank, setRank] = useState("");

  const n = Number(rank.replace(/[,\s]/g, ""));
  const valid = Number.isFinite(n) && n >= 1 && n <= 2000000;

  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-5 shadow-lift">
      <h2 className="font-heading text-[15px] font-bold text-foreground">Can you get in here?</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
        Checked against this college&apos;s own published closing ranks.
      </p>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) router.push(`/neet-college-predictor?course=${course}&rank=${n}`);
        }}
      >
        <label htmlFor="college-rank" className="sr-only">
          Your NEET {level.toUpperCase()} all-India rank
        </label>
        <input
          id="college-rank"
          inputMode="numeric"
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          placeholder="e.g. 12450"
          className={`tnum font-heading w-full rounded-xl border bg-card px-3.5 py-2.5 text-xl font-extrabold text-foreground outline-none transition-colors ${
            rank && !valid ? "border-signal-stretch" : "border-border focus:border-primary"
          }`}
        />
        {rank && !valid && (
          <p className="mt-1.5 text-[12px] text-signal-stretch">Enter a rank between 1 and 20,00,000.</p>
        )}
        <button
          type="submit"
          disabled={!valid}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-3 text-[14px] font-bold text-white shadow-glow transition-all hover:shadow-glow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
        >
          Check my chance
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-3 text-center text-[12px] text-muted-foreground">
        Free to check. The seat-by-seat list asks for a number.
      </p>
      <span className="sr-only">{collegeName}</span>
    </div>
  );
}
