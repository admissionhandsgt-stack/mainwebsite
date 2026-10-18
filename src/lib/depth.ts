/**
 * May this request see seat-level detail — a closing rank or an exact fee tied
 * to a named college?
 *
 * **Since 2026-10-12 the answer is: only signed-in staff.** The business
 * decision was that no competitor hands out a college's closing ranks without
 * payment, and neither will we — not to a visitor, not to a signed-in student,
 * and therefore not to a search engine either. Serving a crawler rows that no
 * visitor can ever reach is cloaking, and Google's paywall markup only covers
 * content a subscriber *can* get. So the verified-crawler path that used to
 * live here is gone, and so is the paywall declaration on the pages.
 *
 * What a signed-in, verified student gets instead is the chance view — colleges
 * placed in "High chance / Good chance / Possible / Reach" with an approximate
 * fee range — from `canSeeOptions` in `lib/chanceView.ts`. The ranks behind
 * those words stay on the server.
 *
 * Staff keep the rows: counsellors work from them on the call. An admin session
 * lives on the admin host only, so in practice this is the admin screens.
 */

import { getSessionUser } from "@/lib/auth";

export interface DepthAccess {
  /** Whether the full rows may be served. */
  full: boolean;
  /** Kept for callers that branch on it; always false now. */
  crawler: false;
}

async function staff(): Promise<boolean> {
  try {
    return Boolean(await getSessionUser());
  } catch {
    return false;
  }
}

/** For route handlers. */
export async function canSeeDepth(_request: Request): Promise<DepthAccess> {
  return { full: await staff(), crawler: false };
}

/** For server components. Reads cookies, so it makes the page dynamic. */
export async function canSeeDepthServer(): Promise<DepthAccess> {
  return { full: await staff(), crawler: false };
}
