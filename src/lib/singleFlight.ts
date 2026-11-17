/**
 * Concurrent callers of `fn` share one in-flight call (2026-11-17). `unstable_cache` does not de-duplicate a miss: when a
 * tag is revalidated, every request that arrives before the first rebuild finishes runs the whole loader itself. The
 * "More on …" block (lib/indexBoost.ts) is on every page and rebuilds from the full sitemap query, so when the twice-daily
 * index-status job revalidated it, ~20 page requests in one minute each ran it at once — the database saturated and pages
 * took 20–46 s from 21:09 to 21:11 IST. The site is one Node process, so sharing the promise here is enough.
 * For loaders without arguments; the promise is dropped once it settles, so a failure is retried by the next caller.
 */
export function singleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;
  return () => {
    if (!inFlight) {
      inFlight = fn().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };
}
