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

/**
 * For data a page render reads but need not have fresh to the second (the reviewer line's date, the "More on …" block):
 * one shared build at a time, and a caller waits at most `waitMs` for it when an earlier result is in memory — after
 * that it gets the earlier result while the build finishes. Only the first call in a fresh process waits for the build.
 */
export function fastOrLast<T>(fn: () => Promise<T>, waitMs = 250): (() => Promise<T>) & { fresh: () => Promise<T> } {
  let last: { v: T } | null = null;
  const shared = singleFlight(async () => {
    const v = await fn();
    last = { v };
    return v;
  });
  const get = async () => {
    const p = shared();
    if (!last) return p;
    const quick = await Promise.race([p.then((v) => ({ v }), () => null), new Promise<null>((r) => setTimeout(() => r(null), waitMs))]);
    return (quick ?? last).v;
  };
  // Wait for a fresh build (after its cache tag was dropped), so the next caller is served it — lib/pageWatch.ts uses this
  // before it tells search engines a page changed, so the page they fetch carries its new "Updated" time.
  return Object.assign(get, { fresh: () => shared() });
}
