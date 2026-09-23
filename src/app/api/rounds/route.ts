import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { accessState } from "@/lib/userAuth";
import { getRoundMoves } from "@/lib/roundQueries";
import { streamSpec } from "@/lib/predictorFacets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * What happened to a seat after round 1, for the same rank the predictor used.
 *
 * This used to be two separate pages. It is the same question asked one step
 * later — "round one did not reach me, does it ever?" — so it belongs beside
 * the results rather than somewhere a visitor has to go and find, retyping
 * their rank when they get there.
 *
 * Gated like the seat list: the two totals are free, the rows are not.
 */

/** Rows shown before the gate. Enough to see the shape of the answer. */
const PREVIEW_ROWS = 3;

export async function GET(request: Request) {
  const LIMIT = 30;
  const limit = rateLimit(`rounds:${clientKey(request)}`, LIMIT, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  const params = new URL(request.url).searchParams;
  const rank = Number(String(params.get("rank") ?? "").replace(/[,\s]/g, ""));
  if (!Number.isFinite(rank) || rank < 1 || rank > 2_000_000) {
    return NextResponse.json({ error: "Invalid rank." }, { status: 400 });
  }

  const spec = streamSpec(params.get("stream"));
  const category =
    (params.get("category") || "").toUpperCase().slice(0, 48) ||
    (spec.level === "ug" ? "UR" : "GEN");

  try {
    const result = await getRoundMoves({ level: spec.level, rank, category, limit: 40 });
    const access = await accessState(request);

    const opened = access.open ? result.opened : result.opened.slice(0, PREVIEW_ROWS);
    const tightened = access.open ? result.tightened : result.tightened.slice(0, PREVIEW_ROWS);

    return NextResponse.json(
      {
        openedTotal: result.openedTotal,
        tightenedTotal: result.tightenedTotal,
        years: result.years,
        opened,
        tightened,
        locked: !access.open,
        hidden: access.open
          ? 0
          : result.opened.length - opened.length + (result.tightened.length - tightened.length),
      },
      { headers: rateLimitHeaders(limit, LIMIT) },
    );
  } catch (error) {
    logError(error, { route: "/api/rounds", request });
    return NextResponse.json({ error: "Could not read the round data." }, { status: 500 });
  }
}
