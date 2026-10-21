"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Link from "@/components/ui/Link";
import { CUT_CATS, CUT_QUOTAS, type BranchCut, type CutCat, type CutQuota } from "@/lib/mccRoundTypes";

/**
 * A round's branch table (2026-10-21): pick the seat family, type part of a branch's name, read the
 * last rank admitted per category — and last year's, for the same round, under it. Every rank is a
 * branch-wide figure over three or more colleges (lib/mccResults); a cell with fewer is "–".
 */

type Prev = Partial<Record<CutQuota, Record<string, Partial<Record<CutCat, number>>>>>;

const n = (v: number) => v.toLocaleString("en-IN");
const FIRST = 15;
const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
// What people type, against how MCC names the course.
const ALIAS: Record<string, string> = {
  radiology: "radio",
  radiodiagnosis: "radio",
  xray: "radio",
  gynae: "gyn",
  gynaecology: "gyn",
  gynecology: "gyn",
  obg: "obst",
  ortho: "orth",
  orthopaedics: "orth",
  orthopedics: "orth",
  anaesthesia: "anaes",
  anesthesia: "anes",
  anesthesiology: "anes",
  paediatrics: "paed",
  pediatrics: "pediat",
  peds: "paed",
  skin: "derm",
  derma: "derm",
  psychiatry: "psych",
  ent: "oto",
  tb: "respir",
  chest: "respir",
  pulmonology: "respir",
  medicine: "medicine",
  surgery: "surg",
};

function matches(course: string, query: string): boolean {
  const words = query.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (!words.length) return true;
  const hay = letters(course);
  return words.every((w) => hay.includes(ALIAS[w] ?? w) || (w.length >= 3 && hay.includes(w.slice(0, Math.max(3, w.length - 2)))));
}

export default function RoundCuts({
  cuts,
  prev,
  prevYear,
  branchPages,
  labels,
}: {
  cuts: Record<CutQuota, BranchCut[]>;
  prev: Prev | null;
  prevYear: number | null;
  branchPages: string[];
  /** `more` takes {count}. */
  labels: { search: string; none: string; note: string; more: string };
}) {
  const families = CUT_QUOTAS.filter((q) => cuts[q.key].length > 0);
  const [family, setFamily] = useState<CutQuota>(families[0]?.key ?? "aiq");
  const [query, setQuery] = useState("");
  // The largest branches first; the full hundred on request. On a phone the whole table put
  // everything after it — what to do next, the counsellors — out of anybody's reach.
  const [open, setOpen] = useState(false);
  const pages = useMemo(() => new Set(branchPages), [branchPages]);

  const all = cuts[family] ?? [];
  // Only the categories this seat family actually admits in (deemed seats are all Open).
  const cats = CUT_CATS.filter((c) => all.some((b) => b.last[c]));
  const found = all.filter((b) => matches(b.course, query));
  const shown = open || query.trim() ? found : found.slice(0, FIRST);
  const before = prev?.[family] ?? {};

  if (!families.length) return null;
  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <fieldset>
          <legend className="sr-only">Seat type</legend>
          <div className="flex flex-wrap gap-1.5">
            {families.map((q) => (
              <button
                key={q.key}
                type="button"
                aria-pressed={q.key === family}
                onClick={() => setFamily(q.key)}
                className={`rounded-full border px-3.5 py-2.5 text-xs font-bold transition-colors md:py-1.5 ${
                  q.key === family
                    ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {q.label}
                <span className="tnum ml-1.5 font-semibold opacity-70">{cuts[q.key].length}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <label className="relative block sm:w-72">
          <span className="sr-only">{labels.search}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.search}
            className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="dt w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="sticky left-0 z-[1] bg-surface-1 px-4 py-3 font-semibold shadow-[1px_0_0_hsl(var(--border))]">Branch</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Seats</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
              {cats.map((c) => (
                <th key={c} scope="col" className="px-4 py-3 text-right font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((b) => (
              <tr key={b.course}>
                {/* The branch stays in view while a phone scrolls across to the categories. */}
                <th scope="row" className="sticky left-0 z-[1] min-w-[9.5rem] max-w-[13rem] bg-card px-4 py-2.5 font-medium shadow-[1px_0_0_hsl(var(--border))]">
                  {pages.has(b.slug) ? (
                    <Link href={`/md-ms-india/branches/${b.slug}`} className="text-foreground hover:text-primary hover:underline">
                      {b.course}
                    </Link>
                  ) : (
                    <span className="text-foreground">{b.course}</span>
                  )}
                </th>
                <td className="tnum px-4 py-2.5 text-right font-semibold">{n(b.seats)}</td>
                <td className="tnum px-4 py-2.5 text-right text-muted-foreground">{n(b.colleges)}</td>
                {cats.map((c) => {
                  const was = before[b.course]?.[c];
                  return (
                    <td key={c} className="tnum px-4 py-2.5 text-right align-top">
                      {b.last[c] ? <span className="font-semibold text-foreground">{n(b.last[c] as number)}</span> : <span className="text-muted-foreground">–</span>}
                      {prevYear && was ? (
                        <span className="block text-[11px] leading-tight text-muted-foreground">
                          {prevYear}: {n(was)}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={3 + cats.length} className="px-4 py-8 text-center text-muted-foreground">
                  {labels.none}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {shown.length < found.length && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex min-h-11 items-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {labels.more.replace("{count}", String(found.length))}
        </button>
      )}
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{labels.note}</p>
    </div>
  );
}
