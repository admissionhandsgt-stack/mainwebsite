"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

interface Facets {
  states: { name: string; count: number }[];
  ownership: { name: string; count: number }[];
}

interface Current {
  q: string;
  states: string[];
  ownership: string[];
  maxFee: string;
  sort: string;
}

const FEE_STEPS = [
  { value: "", label: "Any fee" },
  { value: "200000", label: "Under ₹2L" },
  { value: "1000000", label: "Under ₹10L" },
  { value: "2500000", label: "Under ₹25L" },
];

const SORTS = [
  { value: "seats", label: "Most seats" },
  { value: "fee", label: "Lowest fee" },
  { value: "stipend", label: "Highest stipend" },
  { value: "rank", label: "Toughest cutoff" },
  { value: "name", label: "Name" },
];

/**
 * Filters write to the URL rather than component state, so a filtered list can
 * be shared, bookmarked and indexed — and the back button behaves.
 */
export default function CollegeFilterBar({
  facets,
  current,
  total,
}: {
  facets: Facets;
  current: Current;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(current.q);
  const [showAllStates, setShowAllStates] = useState(false);

  const push = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: current.q || undefined,
      states: current.states.length ? current.states.join(",") : undefined,
      ownership: current.ownership.length ? current.ownership.join(",") : undefined,
      maxFee: current.maxFee || undefined,
      sort: current.sort !== "seats" ? current.sort : undefined,
      ...patch,
    };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    startTransition(() => router.push(s ? `${pathname}?${s}` : pathname));
  };

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    if (q === current.q) return;
    const t = setTimeout(() => push({ q: q || undefined, page: undefined }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggle = (key: "states" | "ownership", value: string) => {
    const list = current[key];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    push({ [key]: next.length ? next.join(",") : undefined, page: undefined });
  };

  const activeCount = current.states.length + current.ownership.length + (current.maxFee ? 1 : 0);
  const states = showAllStates ? facets.states : facets.states.slice(0, 10);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-grow">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="college-search" className="sr-only">
            Search colleges by name, city or state
          </label>
          <input
            id="college-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by college, city or state"
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-[15px] text-foreground outline-none transition-colors focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="college-sort" className="shrink-0 text-[13px] text-muted-foreground">
            Sort
          </label>
          <select
            id="college-sort"
            value={current.sort}
            onChange={(e) => push({ sort: e.target.value, page: undefined })}
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-[14px] text-foreground outline-none focus:border-primary"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {facets.ownership.map((o) => (
          <button
            key={o.name}
            type="button"
            onClick={() => toggle("ownership", o.name)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium capitalize transition-colors ${
              current.ownership.includes(o.name)
                ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            {o.name}
            <span className="tnum ml-1.5 text-muted-foreground">{o.count}</span>
          </button>
        ))}

        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

        {FEE_STEPS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => push({ maxFee: f.value || undefined, page: undefined })}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              current.maxFee === f.value
                ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {states.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => toggle("states", s.name)}
            className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
              current.states.includes(s.name)
                ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            {s.name}
            <span className="tnum ml-1.5 text-muted-foreground">{s.count}</span>
          </button>
        ))}
        {facets.states.length > 10 && (
          <button
            type="button"
            onClick={() => setShowAllStates((v) => !v)}
            className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-primary"
          >
            {showAllStates ? "Show fewer" : `All ${facets.states.length} states`}
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
        <p className="tnum text-[14px] text-muted-foreground">
          {isPending ? (
            "Updating…"
          ) : (
            <>
              <span className="font-semibold text-foreground">{total.toLocaleString("en-IN")}</span> colleges
            </>
          )}
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => startTransition(() => router.push(pathname))}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary"
          >
            <X className="h-3.5 w-3.5" />
            Clear {activeCount} filter{activeCount > 1 ? "s" : ""}
          </button>
        )}
      </div>
    </div>
  );
}
