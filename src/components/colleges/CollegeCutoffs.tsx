"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Loader2, Lock, Search } from "lucide-react";
import AuthDialog from "@/components/lead/AuthDialog";

/**
 * A college's cutoff table, with the gate on the deep end of it.
 *
 * The page that renders this is static and cached for a day — it is one of
 * around 3,500 that carry the site's search traffic — so it hands this
 * component a **preview** of the rows, which ships in the HTML and is what
 * Google indexes. Enough of a table to be genuinely useful and to rank; not
 * enough to be worth harvesting.
 *
 * The remainder is fetched from `/api/college-cutoffs`, which answers 401
 * unless the visitor has unlocked. So the page stays static, the content stays
 * indexed, and the depth still costs a phone number.
 */

export interface CutoffRow {
  course: string;
  quota: string;
  category: string;
  counselling?: string | null;
  r1Latest: number | null;
  widestLatest: number | null;
  widestPrevious: number | null;
  seats: number | null;
}

const num = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-IN"));

function Movement({ row }: { row: CutoffRow }) {
  const delta =
    row.widestLatest != null && row.widestPrevious != null
      ? row.widestLatest - row.widestPrevious
      : null;

  if (delta == null) return <span className="text-[13px] text-muted-foreground">one year</span>;

  return (
    <span
      className={`tnum inline-flex items-center gap-1 text-[13px] font-medium ${
        delta > 0 ? "text-signal-safe" : delta < 0 ? "text-signal-stretch" : "text-muted-foreground"
      }`}
    >
      {delta > 0 ? (
        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
      ) : delta < 0 ? (
        <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
      ) : null}
      {delta > 0 ? "+" : ""}
      {delta.toLocaleString("en-IN")}
    </span>
  );
}

export default function CollegeCutoffs({
  slug,
  level,
  preview,
  total,
  showCounselling = false,
  collegeName,
}: {
  slug: string;
  level: "ug" | "pg";
  preview: CutoffRow[];
  /** How many rows exist in total, so the gate can say what is behind it. */
  total: number;
  showCounselling?: boolean;
  collegeName: string;
}) {
  const [rows, setRows] = useState<CutoffRow[]>(preview);
  const [state, setState] = useState<"preview" | "loading" | "open">(
    total > preview.length ? "loading" : "open",
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  /** Fetch the full table. Used on mount and again after signing in. */
  const loadAll = useCallback(() => {
    setState("loading");
    fetch(`/api/college-cutoffs?slug=${encodeURIComponent(slug)}&level=${level}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.rows) {
          setRows(j.rows);
          setState("open");
        } else {
          setState("preview");
        }
      })
      .catch(() => setState("preview"));
  }, [slug, level]);

  // One request, and only when something is actually hidden. The unlock cookie
  // is HttpOnly so the browser cannot check it itself — asking the server is
  // the check.
  useEffect(() => {
    if (total <= preview.length) return;
    let cancelled = false;

    fetch(`/api/college-cutoffs?slug=${encodeURIComponent(slug)}&level=${level}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setState("preview");
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        setRows(json.rows ?? preview);
        setState("open");
      })
      .catch(() => !cancelled && setState("preview"));

    return () => {
      cancelled = true;
    };
  }, [slug, level, total, preview]);

  const hidden = total - rows.length;

  return (
    <>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] border-collapse">
          <caption className="sr-only">
            Published closing ranks for {collegeName}
          </caption>
          <thead>
            <tr className="bg-surface-2">
              {[
                "Branch",
                "Quota",
                "Cat.",
                ...(showCounselling ? ["Counselling"] : []),
                "R1 close",
                "Widest",
                "Movement",
                "Seats",
              ].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${
                    i >= (showCounselling ? 4 : 3) ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr
                key={`${c.course}-${c.quota}-${c.category}-${i}`}
                className="border-t border-border transition-colors hover:bg-surface-2"
              >
                <td className="px-4 py-3 text-[14px] font-medium text-foreground">{c.course}</td>
                <td className="max-w-[180px] truncate px-4 py-3 text-[13px] text-muted-foreground">
                  {c.quota}
                </td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground">{c.category}</td>
                {showCounselling && (
                  <td className="max-w-[160px] truncate px-4 py-3 text-[13px] text-muted-foreground">
                    {c.counselling ?? "—"}
                  </td>
                )}
                <td className="tnum px-4 py-3 text-right text-[14px] font-semibold text-foreground">
                  {num(c.r1Latest)}
                </td>
                <td className="tnum px-4 py-3 text-right text-[14px] text-foreground">
                  {num(c.widestLatest)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Movement row={c} />
                </td>
                <td className="tnum px-4 py-3 text-right text-[14px] text-muted-foreground">
                  {num(c.seats)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {state === "loading" && hidden > 0 && (
          <p className="flex items-center gap-2 border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Checking for the rest…
          </p>
        )}

        {state === "open" && rows.length > preview.length && (
          <p className="border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
            Showing all <span className="tnum font-semibold text-foreground">{rows.length}</span>{" "}
            published seat rows.
          </p>
        )}
      </div>

      {state === "preview" && hidden > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-surface-2 px-6 py-8 text-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary-soft">
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <h3 className="font-heading mt-3 text-lg font-bold text-foreground">
            <span className="tnum">{hidden}</span> more seat rows for {collegeName}
          </h3>
          <p className="mx-auto mt-1.5 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground">
            Every branch and quota published for this college, with the round each one closed in.
          </p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-7 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow-lg active:translate-y-0"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Show all {hidden + rows.length} rows
          </button>
        </div>
      )}

      <AuthDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onUnlocked={loadAll}
        lockedCount={hidden}
        level={level}
        // No rank here — the visitor is reading one college, not searching.
        rank={0}
        category=""
        noun="seat rows"
        alreadyShown
      />
    </>
  );
}
