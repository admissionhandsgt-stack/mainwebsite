"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowRight, Building2, FileText, Loader2, MapPin, Search, Stethoscope, X } from "lucide-react";
import type { NavItem } from "@/lib/content";
import { useFocusTrap } from "@/hooks/useFocusTrap";

/**
 * The site search (2026-10-21) — opened from the header, or with "/" or Ctrl+K. Pages come from the
 * menus already in hand (so a page added in Admin → Navigation is findable at once); colleges,
 * branches and states from /api/search. Arrow keys move, Enter opens, Escape closes.
 */
interface Hit {
  label: string;
  sub?: string | null;
  url: string;
}
type Group = { key: string; title: string; icon: typeof Search; hits: Hit[] };

const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function pagesFrom(nav: NavItem[]): Hit[] {
  const out: Hit[] = [];
  const walk = (items: NavItem[], section?: string) => {
    for (const i of items) {
      if (i.url && i.url !== "#") out.push({ label: i.label, sub: i.description ?? section ?? null, url: i.url });
      if (i.children.length) walk(i.children, i.url === "#" ? section ?? i.label : i.label);
    }
  };
  walk(nav);
  const seen = new Set<string>();
  return out.filter((h) => (seen.has(h.url) ? false : (seen.add(h.url), true)));
}

export default function SiteSearch({ open, onOpen, onClose, nav }: { open: boolean; onOpen: () => void; onClose: () => void; nav: NavItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<{ colleges: Hit[]; branches: Hit[]; states: Hit[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, open);
  const pages = useMemo(() => pagesFrom(nav), [nav]);

  // "/" or Ctrl/Cmd+K opens it from anywhere, unless somebody is typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable=true]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen]);

  useEffect(() => {
    if (open) {
      setActive(0);
      requestAnimationFrame(() => input.current?.focus());
      document.body.classList.add("no-scroll");
    } else document.body.classList.remove("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, [open]);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // The database half, a moment after typing stops; a newer query cancels the older one.
  useEffect(() => {
    const term = q.trim();
    if (fold(term).length < 2) {
      setRemote(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (r.ok) setRemote(await r.json());
      } catch {
        /* aborted or offline: keep what is shown */
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const words = fold(q).split(" ").filter(Boolean);
  const pageHits = words.length
    ? pages.filter((p) => words.every((w) => fold(`${p.label} ${p.sub ?? ""}`).includes(w))).slice(0, 5)
    : pages.slice(0, 8);
  const groups: Group[] = [
    { key: "pages", title: words.length ? "Pages" : "Popular pages", icon: FileText, hits: pageHits },
    { key: "colleges", title: "Colleges", icon: Building2, hits: remote?.colleges ?? [] },
    { key: "branches", title: "Branches", icon: Stethoscope, hits: remote?.branches ?? [] },
    { key: "states", title: "States", icon: MapPin, hits: remote?.states ?? [] },
  ].filter((g) => g.hits.length);
  const flat = groups.flatMap((g) => g.hits);

  useEffect(() => {
    setActive(0);
  }, [q, remote]);

  if (!open) return null;

  const go = (h: Hit | undefined) => {
    if (!h) return;
    onClose();
    router.push(h.url);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(flat[active]);
    }
  };

  let index = -1;
  return (
    <div className="fixed inset-0 z-[130] flex items-start justify-center px-3 pt-[8vh] sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search the site">
      <button type="button" aria-label="Close search" onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm dark:bg-slate-950/70" />
      <div ref={panel} className="relative w-full max-w-[640px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="A college, a branch or a state"
            aria-label="Search colleges, branches, states and pages"
            aria-controls="site-search-results"
            aria-activedescendant={flat.length ? `site-search-hit-${active}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />}
          <button type="button" onClick={onClose} aria-label="Close search" className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div id="site-search-results" role="listbox" aria-label="Results" className="max-h-[min(60vh,520px)] overflow-y-auto overscroll-contain p-2">
          {groups.map((g) => (
            <div key={g.key} className="py-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{g.title}</p>
              {g.hits.map((h) => {
                index += 1;
                const i = index;
                const on = i === active;
                return (
                  <button
                    key={`${g.key}-${h.url}`}
                    id={`site-search-hit-${i}`}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(h)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${on ? "bg-primary-soft" : "hover:bg-surface-2"}`}
                  >
                    <g.icon className={`h-4 w-4 shrink-0 ${on ? "text-primary-strong dark:text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-foreground">{h.label}</span>
                      {h.sub && <span className="block truncate text-[12.5px] text-muted-foreground">{h.sub}</span>}
                    </span>
                    {on && <ArrowRight className="h-4 w-4 shrink-0 text-primary-strong dark:text-primary" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          ))}
          {words.length > 0 && !loading && !flat.length && (
            <p className="px-3 py-8 text-center text-[14px] text-muted-foreground">
              Nothing found for “{q.trim()}”. Try part of the name — “kasturba”, “radiology”, “kerala”.
            </p>
          )}
        </div>
        <div className="hidden items-center justify-between border-t border-border bg-surface-1 px-4 py-2 text-[12px] text-muted-foreground sm:flex">
          <span>↑ ↓ to move · Enter to open · Esc to close</span>
          <span>
            Press <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[11px]">/</kbd> or{" "}
            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[11px]">Ctrl&nbsp;K</kbd> anywhere
          </span>
        </div>
      </div>
    </div>
  );
}
