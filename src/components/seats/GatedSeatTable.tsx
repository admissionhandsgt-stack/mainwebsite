"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, MapPin, Search } from "lucide-react";
import AuthDialog from "@/components/lead/AuthDialog";

/**
 * A seat table whose public slice ships in the HTML and whose depth is gated.
 *
 * The same shape `CollegeCutoffs` uses, and for the same reason: these pages
 * are statically rendered and cached for a day because they carry search
 * traffic, so they cannot read a cookie. A client component solves it —
 * Next server-renders its initial markup, so the preview rows are in the HTML
 * Google indexes, and the browser then asks `/api/seat-rows` whether this
 * visitor may have the rest.
 *
 * The preview is deliberately generous enough to be worth reading and to rank
 * on, and small enough that walking every branch and category is not a way to
 * rebuild the dataset.
 */

export interface SeatRow {
  college: string;
  slug: string;
  state: string | null;
  ownership: string;
  quota: string;
  /** PG branch pages omit this; the quota pages show it. */
  course?: string;
  seats: number;
  r1: number | null;
  widest: number | null;
  feeInr: number | null;
  feeMaxInr?: number | null;
}

const inr = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));

const money = (v: number | null | undefined) => {
  if (v == null) return "—";
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};

export default function GatedSeatTable({
  preview,
  total,
  query,
  collegeBase,
  showCourse = false,
  showFee = true,
  noun,
}: {
  preview: SeatRow[];
  /** How many rows exist, so the gate can say what is behind it. */
  total: number;
  /** Query string for `/api/seat-rows`, e.g. `kind=branch&slug=…&category=GEN`. */
  query: string;
  collegeBase: string;
  showCourse?: boolean;
  showFee?: boolean;
  noun: string;
}) {
  const [rows, setRows] = useState<SeatRow[]>(preview);
  const [state, setState] = useState<"preview" | "loading" | "open">(
    total > preview.length ? "loading" : "open",
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = () => {
    setState("loading");
    fetch(`/api/seat-rows?${query}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.rows) {
          setRows(j.rows);
          setState("open");
        } else setState("preview");
      })
      .catch(() => setState("preview"));
  };

  // One request, and only when something is hidden. The unlock cookie is
  // HttpOnly, so asking the server is the only way to know.
  useEffect(() => {
    if (total <= preview.length) return;
    let cancelled = false;
    fetch(`/api/seat-rows?${query}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) return setState("preview");
        const json = await res.json();
        if (cancelled) return;
        setRows(json.rows ?? preview);
        setState("open");
      })
      .catch(() => !cancelled && setState("preview"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, total]);

  const hidden = Math.max(0, total - rows.length);

  const cols: [string, string][] = [
    ["College", showCourse ? "w-[28%] text-left" : "w-[32%] text-left"],
    ...(showCourse ? ([["Branch", "w-[18%] text-left"]] as [string, string][]) : []),
    ["Quota", showCourse ? "w-[16%] text-left" : "w-[20%] text-left"],
    ["Seats", "w-[10%] text-right"],
    ["R1 close", "w-[12%] text-right"],
    ["Widest", "w-[12%] text-right"],
    ...(showFee ? ([["Fee / yr", "w-[12%] text-right"]] as [string, string][]) : []),
  ];

  return (
    <>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[760px] table-fixed border-collapse">
          <thead>
            <tr className="bg-surface-2">
              {cols.map(([h, cls]) => (
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
              <tr key={`${r.slug}-${r.quota}-${r.course ?? ""}-${i}`} className="border-t border-border hover:bg-surface-2">
                <td className="px-4 py-3 align-top">
                  <Link
                    href={`${collegeBase}/${r.slug}`}
                    className="-my-1.5 block py-1.5 text-[14px] font-semibold leading-snug text-foreground hover:text-primary"
                  >
                    {r.college}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {r.state ?? "—"}
                    {r.ownership !== "other" && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{r.ownership}</span>
                      </>
                    )}
                  </p>
                </td>
                {showCourse && (
                  <td className="px-4 py-3 align-top text-[13.5px] leading-snug text-foreground">{r.course}</td>
                )}
                <td className="px-4 py-3 align-top text-[12.5px] leading-snug text-muted-foreground">{r.quota}</td>
                <td className="tnum px-4 py-3 text-right align-top text-[14px] text-foreground">{r.seats}</td>
                <td className="tnum px-4 py-3 text-right align-top text-[14px] text-muted-foreground">{inr(r.r1)}</td>
                <td className="tnum px-4 py-3 text-right align-top text-[14px] font-semibold text-foreground">
                  {inr(r.widest)}
                </td>
                {showFee && (
                  <td className="tnum px-4 py-3 text-right align-top text-[14px] font-semibold text-foreground">
                    {money(r.feeInr)}
                    {r.feeMaxInr != null && (
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        to {money(r.feeMaxInr)}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state === "loading" && hidden > 0 && (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Checking for the rest…
        </p>
      )}

      {state === "preview" && hidden > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-surface-2 px-5 py-6 text-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary-soft">
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <p className="font-heading mt-3 text-lg font-extrabold text-foreground">
            <span className="tnum">{inr(hidden)}</span> more {noun}
          </p>
          <p className="mx-auto mt-1.5 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground">
            The rows above are yours for free. Sign in to see the rest, each with its own quota,
            closing rank and fee.
          </p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Show me all of them
          </button>
        </div>
      )}

      <AuthDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onUnlocked={load}
        lockedCount={hidden}
        level="pg"
        rank={0}
        category=""
        noun={noun}
        alreadyShown
      />
    </>
  );
}
