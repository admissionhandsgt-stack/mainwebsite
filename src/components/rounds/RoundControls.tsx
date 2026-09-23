"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

/**
 * Rank and category live in the URL, not in component state.
 *
 * It makes a result shareable — a counsellor can send a student the exact
 * view they were looking at — and it means the page is server-rendered with
 * real content rather than a spinner.
 */
export default function RoundControls({
  basePath,
  rank,
  category,
  categories,
  level,
}: {
  basePath: string;
  rank: number | null;
  category: string;
  categories: string[];
  level: "ug" | "pg";
}) {
  const router = useRouter();
  const [value, setValue] = useState(rank ? String(rank) : "");

  const parsed = Number(value.replace(/[,\s]/g, ""));
  const valid = Number.isFinite(parsed) && parsed >= 1 && parsed <= 2_000_000;

  const go = (nextRank: number, nextCategory: string) =>
    router.push(`${basePath}?rank=${nextRank}&category=${encodeURIComponent(nextCategory)}`);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-lift">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) go(parsed, category);
        }}
      >
        <label htmlFor="round-rank" className="block text-[13px] font-semibold text-muted-foreground">
          Your NEET {level.toUpperCase()} all-India rank
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="round-rank"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 5000"
            className={`tnum font-heading w-full rounded-xl border bg-card px-4 py-3 text-2xl font-extrabold text-foreground outline-none transition-colors ${
              value && !valid ? "border-signal-stretch" : "border-border focus:border-primary"
            }`}
          />
          <button
            type="submit"
            disabled={!valid}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-bold text-white shadow-glow transition-all hover:shadow-glow-lg disabled:opacity-40"
          >
            <Search className="h-4 w-4" />
            Show the movement
          </button>
        </div>
        {value && !valid && (
          <p className="mt-2 text-[13px] text-signal-stretch">
            Enter a rank between 1 and 20,00,000.
          </p>
        )}
      </form>

      <fieldset className="mt-4">
        <legend className="sr-only">Category</legend>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === category}
              onClick={() => valid && go(parsed, c)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                c === category
                  ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
