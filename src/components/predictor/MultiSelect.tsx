"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";

/**
 * A filter that can hold several values at once.
 *
 * Built rather than borrowed because the lists here are long and uneven — 101
 * PG branches, 35 states, three ownership types — and the same control has to
 * work for all of them. Anything over a dozen options gets a search box; the
 * short ones do not need one and would look cluttered with it.
 *
 * Keyboard and screen-reader behaviour is the reason this is not a `<div>` with
 * click handlers: it is a real `aria-expanded` button owning a listbox, Escape
 * closes it, and a click outside dismisses it.
 */
export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  searchAfter = 12,
  align = "left",
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Show the search box once the list is at least this long. */
  searchAfter?: number;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  if (options.length === 0) return null;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className={`inline-flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-[14px] font-semibold transition-colors sm:w-auto ${
          selected.length
            ? "border-primary/50 bg-primary-soft text-primary-strong dark:text-primary"
            : "border-border bg-card text-foreground hover:border-primary/40"
        }`}
      >
        <span className="truncate">
          {label}
          {selected.length > 0 && (
            <span className="tnum ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[11px] text-primary-foreground">
              {selected.length}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={id}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className={`absolute z-40 mt-2 max-h-[22rem] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-lift ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.length >= searchAfter && (
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}`}
                  // 16px stops iOS zooming the page when this gets focus.
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-base text-foreground outline-none focus:border-primary md:text-sm"
                />
              </div>
            </div>
          )}

          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex w-full items-center gap-1.5 border-b border-border px-3.5 py-2.5 text-left text-[13px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear {selected.length} selected
            </button>
          )}

          <div className="max-h-64 overflow-y-auto overscroll-contain py-1">
            {shown.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-[13px] text-muted-foreground">
                Nothing matches “{query}”.
              </p>
            ) : (
              shown.map((o) => {
                const on = selected.includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => toggle(o)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[14px] transition-colors hover:bg-surface-2"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        on ? "border-primary bg-primary" : "border-border"
                      }`}
                    >
                      {on && <Check className="h-3 w-3 text-primary-foreground" aria-hidden="true" />}
                    </span>
                    <span className={`truncate ${on ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {o}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
