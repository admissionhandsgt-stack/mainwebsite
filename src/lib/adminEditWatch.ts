/**
 * After an admin save that can change what pages say, queue those pages for the page watcher (lib/pageWatch.ts), so the
 * changed ones get that moment as their lastmod and "Updated" time and Google and Bing hear of it within ten minutes
 * (2026-11-18). Copy, menus, SEO rows and sections reach the hub, state and branch pages; a college row reaches the
 * directories and state pages (its own page is re-read on the nightly college sweep). Leads change no page. Not awaited.
 */
const NOT_PAGES = new Set(["leads"]);
const COLLEGES = /^colleges-/;

export function afterAdminEdit(resource: string): void {
  if (NOT_PAGES.has(resource)) return;
  const groups = COLLEGES.test(resource) ? ["hubs", "states"] : ["hubs", "states", "branches"];
  void import("@/lib/pageWatch").then((m) => m.queueGroups(groups)).catch(() => undefined);
}
