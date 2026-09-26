import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { hasAccess } from "@/lib/userAuth";
import { getBranch, DEFAULT_CATEGORY } from "@/lib/branchQueries";
import { getQuotaOverview, QUOTA_FAMILIES, type QuotaFamilyId } from "@/lib/quotaQueries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The rest of a branch or quota table, for someone who has signed in.
 *
 * The pages themselves are statically rendered and cached for a day, because
 * they carry search traffic and reading a cookie in them would make every one
 * per-request. So they ship a public slice in their HTML — enough to be
 * genuinely useful and to rank — and the remainder comes from here, behind the
 * same gate as everything else.
 *
 * **This closes a hole I opened.** The branch pages shipped 300 rows each and
 * accept a `?category=`, so 101 branches across roughly ten categories was a
 * walk of most of the PG seat data, ranks and fees included — a wider door
 * than `/api/predict` has ever been. The gate is only as strong as the most
 * generous page behind it.
 */

/** Generous for a reader, useless as a harvesting rate. */
const LIMIT = 40;
const WINDOW_MS = 10 * 60 * 1000;

export async function GET(request: Request) {
  const limit = rateLimit(`seat-rows:${clientKey(request)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");

  try {
    if (!(await hasAccess(request))) {
      // 401 rather than a trimmed payload: the page already has the public
      // slice, so there is nothing useful to return and saying so is clearer.
      return NextResponse.json({ error: "Sign in to see the full table." }, { status: 401 });
    }

    if (kind === "branch") {
      const slug = (params.get("slug") ?? "").slice(0, 80);
      const category = (params.get("category") ?? DEFAULT_CATEGORY).toUpperCase().slice(0, 24);
      const branch = await getBranch(slug, category);
      if (!branch) return NextResponse.json({ error: "Not found." }, { status: 404 });
      return NextResponse.json(
        { rows: branch.rowsList, truncated: branch.truncated },
        { headers: rateLimitHeaders(limit, LIMIT) },
      );
    }

    if (kind === "quota") {
      const family = params.get("family") as QuotaFamilyId | null;
      const level = params.get("level") === "ug" ? "ug" : "pg";
      if (!family || !QUOTA_FAMILIES[family]) {
        return NextResponse.json({ error: "Unknown quota." }, { status: 400 });
      }
      const overview = await getQuotaOverview(family, level);
      if (!overview) return NextResponse.json({ error: "Not found." }, { status: 404 });
      return NextResponse.json(
        { rows: overview.rowsList, truncated: overview.truncated },
        { headers: rateLimitHeaders(limit, LIMIT) },
      );
    }

    return NextResponse.json({ error: "Unknown request." }, { status: 400 });
  } catch (error) {
    logError(error, { route: "/api/seat-rows", request });
    return NextResponse.json({ error: "Could not load those rows." }, { status: 500 });
  }
}
