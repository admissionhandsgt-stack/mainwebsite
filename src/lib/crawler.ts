/**
 * Is this request a search engine, and can we prove it?
 *
 * The whole gated-depth design rests on this one function, so it is written to
 * fail closed. The seat data is the product: every page that sits on it shows a
 * visitor the shape of the answer and asks them to sign in for the rows, and the
 * only exception is a crawler, because a page Google cannot read is a page
 * nobody arrives at.
 *
 * **A user-agent is not evidence of anything.** `curl -A Googlebot` is one flag.
 * Serving the full table on the strength of a header would be a gate with a
 * sign on it saying how to open it. So a crawler is only believed when the
 * connecting IP is in the list the search engine itself publishes, or when
 * reverse DNS resolves into its domain *and* forward DNS comes back to the same
 * address.
 *
 * Google sanctions this explicitly: a paywall is not cloaking when Googlebot
 * sees what a subscriber sees and the page declares the gate with
 * `isAccessibleForFree: false` (see `src/lib/paywall.ts`). This file is the
 * "Googlebot sees it" half; that file is the "declared" half. Neither works
 * alone — without the declaration this is cloaking, and cloaking is the one SEO
 * mistake that can remove the site from the index entirely.
 *
 * Server-only.
 */

import { promises as dns } from "node:dns";
import { logError } from "@/lib/logger";
import { parseCidr, inRanges, type Range } from "@/lib/ipRange";

/**
 * Where each engine publishes the addresses it crawls from.
 *
 * Fetched rather than vendored because they change, and a stale hardcoded list
 * means a real crawler is quietly refused — which does not raise an error
 * anywhere, it just stops the pages ranking.
 */
const IP_RANGE_SOURCES = [
  "https://developers.google.com/static/search/apis/ipranges/googlebot.json",
  "https://developers.google.com/static/search/apis/ipranges/special-crawlers.json",
  "https://www.bing.com/toolbox/bingbot.json",
];

/**
 * The domains a legitimate crawler's reverse DNS ends in.
 *
 * The fallback path when the published lists cannot be fetched. Slower (two DNS
 * round trips) but self-maintaining.
 */
const CRAWLER_DOMAINS = [".googlebot.com", ".google.com", ".search.msn.com"];

/**
 * User-agents worth spending a verification on.
 *
 * This is a filter, never a decision — matching here only means "go and check",
 * and a request that matches but fails verification is treated as an ordinary
 * visitor. Kept narrow so a spoofed UA cannot make us do DNS work on every
 * request to the site.
 */
const CRAWLER_UA = /(googlebot|google-inspectiontool|storebot-google|bingbot|adidxbot)/i;

let ranges: Range[] | null = null;
let rangesAt = 0;
let rangesPromise: Promise<Range[]> | null = null;
const RANGES_TTL_MS = 24 * 60 * 60 * 1000;

async function loadRanges(): Promise<Range[]> {
  const results = await Promise.all(
    IP_RANGE_SOURCES.map(async (url) => {
      try {
        const res = await fetch(url, {
          // Next's global no-store override would refetch these on every
          // request; the lists change a few times a year.
          cache: "force-cache",
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return [];
        const json = (await res.json()) as { prefixes?: { ipv4Prefix?: string; ipv6Prefix?: string }[] };
        return (json.prefixes ?? [])
          .map((p) => p.ipv4Prefix ?? p.ipv6Prefix)
          .filter((c): c is string => typeof c === "string")
          .map(parseCidr)
          .filter((r): r is Range => r !== null);
      } catch {
        // Offline, rate-limited, DNS down. The reverse-DNS path still works.
        return [];
      }
    }),
  );

  return results.flat();
}

async function crawlerRanges(): Promise<Range[]> {
  const fresh = ranges !== null && Date.now() - rangesAt < RANGES_TTL_MS;
  if (fresh) return ranges as Range[];

  // One in-flight load, however many requests arrive during it.
  if (!rangesPromise) {
    rangesPromise = loadRanges()
      .then((loaded) => {
        if (loaded.length > 0) {
          ranges = loaded;
          rangesAt = Date.now();
        }
        return loaded.length > 0 ? loaded : (ranges ?? []);
      })
      .finally(() => {
        rangesPromise = null;
      });
  }

  // A stale list beats blocking on the network — the addresses barely move.
  if (ranges !== null) return ranges;
  return rangesPromise;
}

/**
 * The address the connection came from.
 *
 * **The right-most entry, not the left-most.** Caddy's `reverse_proxy`
 * *appends* the peer address to any `X-Forwarded-For` the client sent, so on a
 * forged request the header reads `66.249.66.1, <the real address>` and the
 * left-most value is whatever the caller chose to claim. Reading it from the
 * left made a spoofed Googlebot open the gate — caught by the verification
 * script, which sends exactly that.
 *
 * The last entry is the one Caddy observed, and Caddy is the only thing that can
 * reach this app because it binds `127.0.0.1`. If that binding ever changes,
 * this check stops meaning anything.
 */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last;
  }
  return request.headers.get("x-real-ip")?.trim() || null;
}

async function byPublishedRange(ip: string): Promise<boolean> {
  return inRanges(ip, await crawlerRanges());
}

/**
 * Reverse DNS, then forward again.
 *
 * The forward lookup is the half people leave out, and without it the check is
 * useless: anyone controlling their own reverse DNS can claim to be
 * `crawl-1-2-3-4.googlebot.com`. Only the round trip proves the address really
 * belongs to that name.
 */
async function byDoubleDns(ip: string): Promise<boolean> {
  try {
    const names = await dns.reverse(ip);
    const name = names.find((n) => CRAWLER_DOMAINS.some((d) => n.toLowerCase().endsWith(d)));
    if (!name) return false;

    const forward = await dns.lookup(name, { all: true });
    return forward.some((a) => a.address === ip);
  } catch {
    return false;
  }
}

const cache = new Map<string, { verified: boolean; at: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 5000;

/**
 * Whether this request is a search engine we have verified.
 *
 * Cached per address for an hour, because a crawl is thousands of requests from
 * a handful of addresses and each one would otherwise repeat the work.
 */
export async function isVerifiedCrawler(request: Request): Promise<boolean> {
  const ua = request.headers.get("user-agent") ?? "";
  if (!CRAWLER_UA.test(ua)) return false;

  const ip = clientIp(request);
  if (!ip) return false;

  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.verified;

  let verified = false;
  try {
    verified = (await byPublishedRange(ip)) || (await byDoubleDns(ip));
  } catch (error) {
    // Never let a verification failure open the gate.
    logError(error, { route: "crawler-verify" });
    verified = false;
  }

  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(ip, { verified, at: Date.now() });
  return verified;
}
