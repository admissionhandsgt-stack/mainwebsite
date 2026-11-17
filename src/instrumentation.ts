/** Runs once when the server starts. Node-only work is imported behind the runtime check. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startServerWatch } = await import("@/lib/serverWatch");
    startServerWatch();
    // Build the sitemap groups once in the background, so a page render always has an earlier build to fall back on
    // while a rebuild runs (lib/sitemapData.ts sitemapGroupsForPage; 2026-11-17 slowdown). Off the start-up path.
    setTimeout(() => {
      import("@/lib/sitemapData").then((m) => m.sitemapGroups()).catch(() => undefined);
    }, 15_000);
  }
}
