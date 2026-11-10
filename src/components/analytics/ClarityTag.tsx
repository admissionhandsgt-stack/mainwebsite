"use client";

import { useEffect } from "react";

/**
 * Microsoft Clarity — heatmaps and session recordings (2026-11-11, owner: "Microsoft Clarity… kardo isko bhi"). The
 * project ID is Admin → Content → "Site verification" (`analytics.clarity.id`); with none, nothing loads.
 *
 * Students type their name, phone and rank on this site, and the owner's rule is that an exact rank never reaches
 * analytics (CLAUDE.md, 2026-10-17). So:
 * - The project's Masking must be set to **Strict** in Clarity's own settings (every word on the page is masked).
 * - Clarity never loads on the predictor, sign-in, account or admin pages, nor on any page whose address carries a rank,
 *   score, roll number, phone or email.
 * - A click on a link to such a page, from a page Clarity is recording, becomes a full page load. The new page loads
 *   without Clarity, so no in-app navigation carries those addresses into a recording.
 * - If the address turns into one of those anyway (a filter written to the URL), recording is stopped.
 */
const EXCLUDED = /^\/(neet-college-predictor|login|account|admin)(\/|$)|^\/(mbbs-india|md-ms-india)\/colleges\/?$/;
const PERSONAL = /[?&](rank|air|score|roll|phone|mobile|email)=/i;
const allowed = (u: URL) => !EXCLUDED.test(u.pathname) && !PERSONAL.test(u.search);

declare global {
  interface Window {
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

export default function ClarityTag({ id }: { id: string }) {
  useEffect(() => {
    if (!/^[a-z0-9]{6,16}$/i.test(id)) return;
    if (!allowed(new URL(window.location.href))) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const to = new URL(a.href, window.location.href);
      if (to.origin !== window.location.origin || allowed(to)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      window.location.assign(to.href);
    };
    document.addEventListener("click", onClick, true);

    const guard = () => {
      if (!allowed(new URL(window.location.href))) window.clarity?.("stop");
    };
    const push = history.pushState;
    const replace = history.replaceState;
    history.pushState = function (...args: Parameters<History["pushState"]>) {
      const r = push.apply(this, args);
      guard();
      return r;
    };
    history.replaceState = function (...args: Parameters<History["replaceState"]>) {
      const r = replace.apply(this, args);
      guard();
      return r;
    };
    window.addEventListener("popstate", guard);

    // Clarity's own loader, unchanged.
    if (!window.clarity) {
      const c = function (...args: unknown[]) {
        (c.q = c.q || []).push(args);
      } as NonNullable<Window["clarity"]>;
      window.clarity = c;
      const t = document.createElement("script");
      t.async = true;
      t.src = `https://www.clarity.ms/tag/${id}`;
      document.head.appendChild(t);
    }

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", guard);
      history.pushState = push;
      history.replaceState = replace;
    };
  }, [id]);
  return null;
}
