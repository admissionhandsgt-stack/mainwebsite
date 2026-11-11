"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link2, RotateCcw, Search } from "lucide-react";
import { trackEvent, aaTrack } from "@/lib/analytics";

/**
 * Find, filter and sort on a data page (2026-11-11; owner: "informative pages par smart modern tarike se sort & filtering…
 * user friendly"; plan reviewed through a third lens and a regression lens first). The server renders every row exactly
 * as before — the HTML Google reads and the first paint do not change — and marks them:
 *
 *   data-row            a row (a <tr>, an <li>, or a whole <tbody>/<details> holding a group of sub-rows)
 *   data-sub            a sub-row inside a group row (one seat type of a college); a group shows while any sub shows
 *   data-f-<key>="a b"  the values a chip / select filter matches (on the row, or on its subs for a `sub` filter)
 *   data-s-<key>="123"  a sort key (on the row, or on its subs — then the lowest shown sub's key)
 *   data-date="Y-M-D"   for the days filter
 *   data-dt-span        a cell spanning the group's sub-rows (a college's name): moved and re-spanned as subs hide
 *   data-dt-section     an element hidden when every row inside it is filtered out
 *
 * Filtered-out rows get `data-dt-off` (components.css hides them, beating `.flex`). Nothing is hidden until the visitor
 * chooses; reset brings back the page's own order. The search text never leaves the page — no URL, no analytics; "Copy
 * link" writes only the chosen chips and sort (enumerated values), so a filtered view can be shared without a page view per
 * click. A jump to an anchor (#c-college) resets the filters first. Words: Admin → Content → "Site: data tools".
 */
export type ToolChip = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** "sub": matches data-f-<key> on sub-rows; default "row". */
  level?: "row" | "sub";
  /** Render as a select (many options). */
  select?: boolean;
};
export type ToolSort = { key: string; label: string; dir?: "asc" | "desc"; text?: boolean; requires?: string };
export type ToolLabels = {
  search: string;
  all: string;
  sort: string;
  pageOrder: string;
  reset: string;
  showing: string;
  none: string;
  share: string;
  copied: string;
  days: string;
};

const fold = (s: string) => ` ${s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim()} `;
const todayIst = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export default function DataTools({
  id,
  targets,
  total,
  placement,
  labels,
  search = true,
  chips = [],
  sorts = [],
  days,
  searchSubs = false,
  className = "",
}: {
  id: string;
  /** Element ids that hold the rows. */
  targets: string[];
  /** How many rows the page printed (for the count before the script runs). */
  total: number;
  placement: string;
  labels: ToolLabels;
  search?: boolean;
  chips?: ToolChip[];
  sorts?: ToolSort[];
  /** Day windows for the date filter, e.g. [7, 30]. */
  days?: number[];
  /** Search inside a group: show only the sub-rows that match, unless the group's <summary> does (the bond page). */
  searchSubs?: boolean;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [sort, setSort] = useState("");
  const [win, setWin] = useState(0);
  const [shown, setShown] = useState(total);
  const [said, setSaid] = useState(total);
  const [copied, setCopied] = useState(false);
  const rows = useRef<HTMLElement[]>([]);
  const order = useRef(new Map<HTMLElement, number>());
  const spans = useRef(new Map<HTMLElement, { home: HTMLElement; span: number }>());
  const opened = useRef(new Map<HTMLElement, boolean>());
  const used = useRef(new Set<string>());
  const sortedOnce = useRef(false);

  const touch = (control: string) => {
    if (used.current.has(control)) return;
    used.current.add(control);
    trackEvent("data_tool", { placement, control });
    aaTrack("data_tool", { placement, control });
  };

  // Collect the rows once, after hydration; remember the page's own order and each group's spanning cell.
  useEffect(() => {
    const list: HTMLElement[] = [];
    for (const t of targets) {
      const el = document.getElementById(t);
      if (el) list.push(...(Array.from(el.querySelectorAll("[data-row]")) as HTMLElement[]));
    }
    rows.current = list;
    list.forEach((r, i) => order.current.set(r, i));
    for (const r of list) {
      const cell = r.querySelector("[data-dt-span]") as HTMLElement | null;
      if (cell?.parentElement) spans.current.set(r, { home: cell.parentElement, span: Number(cell.getAttribute("rowspan") ?? 1) });
      if (r instanceof HTMLDetailsElement) opened.current.set(r, r.open);
    }
    // A shared link carries chips and sort (never the search text): enumerated values only.
    const u = new URLSearchParams(window.location.search);
    const next: Record<string, string> = {};
    for (const c of chips) {
      const v = u.get(`dt-${c.key}`);
      if (v && c.options.some((o) => o.value === v)) next[c.key] = v;
    }
    if (Object.keys(next).length) setPicked(next);
    const s = u.get("dt-sort");
    if (s && sorts.some((x) => `${x.key}.${x.dir ?? "asc"}` === s || `${x.key}.${x.dir === "desc" ? "asc" : "desc"}` === s)) setSort(s);
    const d = Number(u.get("dt-days"));
    if (days?.includes(d)) setWin(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => {
    setQ("");
    setPicked({});
    setSort("");
    setWin(0);
  }, []);

  // An anchor (#c-college) must land on its row: filters reset, then the browser's own jump runs again.
  useEffect(() => {
    const onHash = () => {
      reset();
      const target = decodeURIComponent(window.location.hash.slice(1));
      if (target) setTimeout(() => document.getElementById(target)?.scrollIntoView({ block: "start" }), 30);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [reset]);

  // Apply.
  useEffect(() => {
    const list = rows.current;
    if (!list.length) return;
    const needle = fold(q).trim();
    const today = todayIst();
    const rowChips = chips.filter((c) => (c.level ?? "row") === "row" && picked[c.key]);
    const subChips = chips.filter((c) => c.level === "sub" && picked[c.key]);
    let visible = 0;
    for (const r of list) {
      let ok = !needle || fold(r.textContent ?? "").includes(` ${needle}`) || fold(r.textContent ?? "").includes(needle);
      for (const c of rowChips) if (ok && !(r.getAttribute(`data-f-${c.key}`) ?? "").split(" ").includes(picked[c.key])) ok = false;
      if (ok && win) {
        const d = r.getAttribute("data-date");
        ok = !!d && daysBetween(d, today) <= win;
      }
      const subs = Array.from(r.querySelectorAll("[data-sub]")) as HTMLElement[];
      let shownSubs = subs;
      if (subs.length) {
        shownSubs = subs.filter((s) => subChips.every((c) => (s.getAttribute(`data-f-${c.key}`) ?? "").split(" ").includes(picked[c.key])));
        if (searchSubs && needle && !fold(r.querySelector("summary")?.textContent ?? "").includes(needle)) {
          shownSubs = shownSubs.filter((s) => fold(s.textContent ?? "").includes(needle));
        }
        for (const s of subs) s.toggleAttribute("data-dt-off", !shownSubs.includes(s));
        if (!shownSubs.length) ok = false;
        // The college's name spans what is left, in the first row left.
        const sp = spans.current.get(r);
        const cell = r.querySelector("[data-dt-span]") as HTMLElement | null;
        if (sp && cell) {
          const first = ok ? shownSubs[0] : sp.home;
          if (cell.parentElement !== first) first.insertBefore(cell, first.firstChild);
          cell.setAttribute("rowspan", String(ok ? shownSubs.length : sp.span));
        }
      }
      r.toggleAttribute("data-dt-off", !ok);
      if (r instanceof HTMLDetailsElement) r.open = ok && (needle !== "" || subChips.length > 0) ? true : opened.current.get(r) ?? false;
      if (ok) visible++;
    }
    // Sections with nothing left in them.
    const sections = new Set<HTMLElement>();
    for (const r of list) {
      const s = r.closest("[data-dt-section]") as HTMLElement | null;
      if (s) sections.add(s);
    }
    for (const s of sections) s.toggleAttribute("data-dt-off", !s.querySelector("[data-row]:not([data-dt-off])"));

    // Sort within each parent (a tbody of rows, a list, or a table of tbody groups); page order when none.
    const [key, dir] = sort.split(".");
    const spec = sorts.find((x) => x.key === key);
    const keyOf = (r: HTMLElement): number | string | null => {
      const own = r.getAttribute(`data-s-${key}`);
      if (own != null) return spec?.text ? own : Number(own);
      const subs = (Array.from(r.querySelectorAll("[data-sub]")) as HTMLElement[]).filter((s) => !s.hasAttribute("data-dt-off"));
      const ks = subs.map((s) => s.getAttribute(`data-s-${key}`)).filter((v): v is string => v != null).map(Number);
      return ks.length ? Math.min(...ks) : null;
    };
    // Rows are moved only once somebody sorts; until then the page's own order stands untouched.
    if (spec) sortedOnce.current = true;
    const parents = new Map<HTMLElement, HTMLElement[]>();
    if (!sortedOnce.current) {
      setShown(visible);
      return;
    }
    for (const r of list) if (r.parentElement) parents.set(r.parentElement, [...(parents.get(r.parentElement) ?? []), r]);
    for (const [parent, kids] of parents) {
      const sorted = [...kids].sort((a, b) => {
        if (!spec) return (order.current.get(a) ?? 0) - (order.current.get(b) ?? 0);
        const x = keyOf(a);
        const y = keyOf(b);
        if (x == null && y == null) return (order.current.get(a) ?? 0) - (order.current.get(b) ?? 0);
        if (x == null) return 1; // nothing to sort on: last, whichever way
        if (y == null) return -1;
        const c = typeof x === "string" ? String(x).localeCompare(String(y)) : (x as number) - (y as number);
        return dir === "desc" ? -c : c;
      });
      for (const k of sorted) parent.appendChild(k);
    }
    setShown(visible);
  }, [q, picked, sort, win, chips, sorts, searchSubs]);

  // The live count, said after the typing stops.
  useEffect(() => {
    const t = setTimeout(() => setSaid(shown), 500);
    return () => clearTimeout(t);
  }, [shown]);

  const active = q !== "" || Object.values(picked).some(Boolean) || sort !== "" || win !== 0;
  const share = async () => {
    const u = new URL(window.location.href);
    for (const k of [...u.searchParams.keys()]) if (k.startsWith("dt-")) u.searchParams.delete(k);
    for (const [k, v] of Object.entries(picked)) if (v) u.searchParams.set(`dt-${k}`, v);
    if (sort) u.searchParams.set("dt-sort", sort);
    if (win) u.searchParams.set("dt-days", String(win));
    u.hash = "";
    try {
      await navigator.clipboard.writeText(u.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* no clipboard: nothing to do */
    }
    touch("share");
  };

  const sortOptions = useMemo(
    () =>
      sorts.flatMap((s) => {
        const blocked = s.requires && !picked[s.requires];
        return [{ value: `${s.key}.${s.dir ?? "asc"}`, label: s.label, blocked }];
      }),
    [sorts, picked],
  );
  const chip = (on: boolean) =>
    `inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[13px] font-semibold transition-colors ${
      on ? "border-primary bg-primary-strong text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"
    }`;

  return (
    <div id={id} data-aa-ignore className={`print:hidden ${className}`}>
      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-center">
          {search && (
            <label className="relative block lg:w-72">
              <span className="sr-only">{labels.search}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  touch("search");
                }}
                placeholder={labels.search}
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </label>
          )}
          {chips.map((c) =>
            c.select ? (
              <label key={c.key} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <span className="shrink-0 font-semibold">{c.label}</span>
                <select
                  value={picked[c.key] ?? ""}
                  onChange={(e) => {
                    setPicked((p) => ({ ...p, [c.key]: e.target.value }));
                    touch("filter");
                  }}
                  className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-background px-2 text-[13.5px] text-foreground lg:flex-none"
                >
                  <option value="">{labels.all}</option>
                  {c.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div key={c.key} role="group" aria-label={c.label} className="-mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
                <button type="button" aria-pressed={!picked[c.key]} className={chip(!picked[c.key])} onClick={() => setPicked((p) => ({ ...p, [c.key]: "" }))}>
                  {c.label}: {labels.all}
                </button>
                {c.options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={picked[c.key] === o.value}
                    className={chip(picked[c.key] === o.value)}
                    onClick={() => {
                      setPicked((p) => ({ ...p, [c.key]: p[c.key] === o.value ? "" : o.value }));
                      touch("filter");
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ),
          )}
          {days && days.length > 0 && (
            <div role="group" aria-label={labels.days} className="flex flex-nowrap gap-1.5">
              {[0, ...days].map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={win === d}
                  className={chip(win === d)}
                  onClick={() => {
                    setWin(d);
                    touch("date");
                  }}
                >
                  {d === 0 ? `${labels.days}: ${labels.all}` : `${d} days`}
                </button>
              ))}
            </div>
          )}
          {sortOptions.length > 0 && (
            <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="shrink-0 font-semibold">{labels.sort}</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  touch("sort");
                }}
                className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-background px-2 text-[13.5px] text-foreground lg:flex-none"
              >
                <option value="">{labels.pageOrder}</option>
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value} disabled={Boolean(o.blocked)}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-center gap-2 lg:ml-auto">
            <span className="tnum text-[12.5px] text-muted-foreground" aria-hidden="true">
              {labels.showing.replace("{n}", String(shown)).replace("{total}", String(total))}
            </span>
            {active && (
              <>
                <button type="button" onClick={reset} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-primary-strong hover:bg-primary-soft dark:text-primary">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> {labels.reset}
                </button>
                {(Object.values(picked).some(Boolean) || sort || win) && (
                  <button type="button" onClick={share} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-primary-strong hover:bg-primary-soft dark:text-primary">
                    <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> {copied ? labels.copied : labels.share}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {labels.showing.replace("{n}", String(said)).replace("{total}", String(total))}
        </p>
      </div>
      {shown === 0 && (
        <p className="mt-3 rounded-2xl border border-dashed border-border bg-card px-4 py-5 text-center text-[14px] text-muted-foreground">
          {labels.none}{" "}
          <button type="button" onClick={reset} className="font-semibold text-primary-strong underline-offset-2 hover:underline dark:text-primary">
            {labels.reset}
          </button>
        </p>
      )}
    </div>
  );
}
