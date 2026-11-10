/**
 * Where third-party trackers (Microsoft Clarity, the Meta pixel) may run (2026-11-11). Students type their name, phone
 * and rank on this site, and an exact rank never reaches analytics (CLAUDE.md, 2026-10-17): no tracker loads on the
 * predictor, sign-in, account or admin pages, nor on any address carrying a rank, score, roll number, phone or email.
 * Import-free, for client components.
 */
export const TRACKER_EXCLUDED = /^\/(neet-college-predictor|login|account|admin)(\/|$)|^\/(mbbs-india|md-ms-india)\/colleges\/?$/;
export const TRACKER_PERSONAL = /[?&](rank|air|score|roll|phone|mobile|email)=/i;
export const trackerAllowed = (u: URL) => !TRACKER_EXCLUDED.test(u.pathname) && !TRACKER_PERSONAL.test(u.search);

/**
 * From a page a tracker runs on, a click to a page it may not run on becomes a full page load, so no in-app navigation
 * carries such an address into a tracker. Returns the listener's remover.
 */
export function hardNavigateToExcluded(): () => void {
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    const to = new URL(a.href, window.location.href);
    if (to.origin !== window.location.origin || trackerAllowed(to)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.location.assign(to.href);
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
