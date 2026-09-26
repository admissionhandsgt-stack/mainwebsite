/**
 * May this request see seat-level detail?
 *
 * `hasAccess` in `userAuth.ts` answers "is this visitor through the gate". This
 * asks the wider question the data surfaces actually need, which is that *or*
 * "is this a search engine we have verified" — and it is deliberately the only
 * place those two are combined, so there is one answer to audit rather than one
 * per page.
 *
 * It lives here rather than in `userAuth.ts` to keep the authentication layer
 * free of DNS and outbound HTTP, and because the dependency only makes sense in
 * one direction: depth needs access, access must not need depth.
 *
 * **What counts as detail.** A row naming an institute, course, quota and
 * category together with a closing rank or a fee. Counts, ranges, band buckets
 * and coverage statements are not detail — they cannot be turned back into rows,
 * and they are what a page shows a visitor who has not signed in.
 */

import { headers } from "next/headers";
import { hasAccess, hasAccessServer } from "@/lib/userAuth";
import { isVerifiedCrawler } from "@/lib/crawler";

export interface DepthAccess {
  /** Whether the full rows may be served. */
  full: boolean;
  /** True when the reason is a verified crawler rather than a session. */
  crawler: boolean;
}

/** For route handlers, which hold the Request. */
export async function canSeeDepth(request: Request): Promise<DepthAccess> {
  // The session first: it is local and cheap, and a signed-in visitor is the
  // common case. Crawler verification can touch the network, so it only runs
  // when the answer would otherwise be no.
  if (await hasAccess(request)) return { full: true, crawler: false };
  const crawler = await isVerifiedCrawler(request);
  return { full: crawler, crawler };
}

/**
 * For server components.
 *
 * **Calling this makes a page dynamic**, because it reads cookies and headers.
 * That is the trade these pages accept: a static page is the same for everyone,
 * so the only way to render the rows for a crawler and withhold them from a
 * visitor is to decide per request. The queries behind them stay cached, so what
 * is paid per request is the render, not the database.
 */
export async function canSeeDepthServer(): Promise<DepthAccess> {
  if (await hasAccessServer()) return { full: true, crawler: false };

  // isVerifiedCrawler only reads headers; a Request is just the shape it takes.
  const request = new Request("https://www.admissionhands.com/", {
    headers: new Headers(headers()),
  });
  const crawler = await isVerifiedCrawler(request);
  return { full: crawler, crawler };
}
