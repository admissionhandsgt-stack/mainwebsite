import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * One band per college for a given rank — what turns the directory from a
 * list into an answer.
 *
 * A plain A-to-Z list of 1,727 colleges is something every competitor has and
 * nobody reads. The same list with "safe / borderline / out of reach" against
 * the visitor's own rank is the thing they came for, and it is derivable from
 * data already loaded.
 *
 * **This deliberately returns no closing ranks.** Four buckets per college is
 * coarse — it cannot be turned back into the cutoff table, which is why it can
 * stay outside the gate on `/api/predict` without giving the dataset away. It
 * is also the hook that sends people to the predictor, where the real numbers
 * and the gate are.
 */

type Band = "safe" | "likely" | "possible" | "stretch";

export async function GET(request: Request) {
  const LIMIT = 60;
  const limit = rateLimit(`bands:${clientKey(request)}`, LIMIT, 60_000);
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
  const level = params.get("level") === "ug" ? "ug" : "pg";
  const category = (params.get("category") || (level === "ug" ? "UR" : "GEN"))
    .toUpperCase()
    .slice(0, 48);

  try {
    // A college is scored by its most reachable seat, not its average one —
    // the question is "could I get in here", and one seat is enough for yes.
    const rows = (await db.execute(sql`
      SELECT
        i.slug                        AS slug,
        MAX(so.r1_latest)             AS best_r1,
        MAX(so.widest_latest)         AS best_widest,
        MAX(so.furthest_ever)         AS best_ever
      FROM seat_options so
      JOIN institutes i  ON i.id = so.institute_id
      JOIN categories ct ON ct.id = so.category_id
      JOIN courses cs    ON cs.id = so.course_id
      WHERE so.level = ${level} AND ct.code = ${category}
        -- The UG extract covers every stream NEET feeds. Without this the
        -- tally counts dental and ayurveda colleges that the MBBS directory
        -- does not list, and the two numbers disagree on screen.
        ${level === "ug" ? sql`AND cs.name ILIKE 'MBBS'` : sql``}
      GROUP BY i.slug
    `)) as unknown as Record<string, number | string | null>[];

    // Sent as four lists of slugs rather than an object of slug→band: the
    // payload is a third of the size and the client only ever needs lookup.
    const out: Record<Band, string[]> = { safe: [], likely: [], possible: [], stretch: [] };

    for (const r of rows) {
      const slug = r.slug as string;
      if (!slug) continue;
      const r1 = r.best_r1 as number | null;
      const widest = r.best_widest as number | null;
      const ever = r.best_ever as number | null;

      if (r1 != null && rank <= r1) out.safe.push(slug);
      else if (widest != null && rank <= widest) out.likely.push(slug);
      else if (ever != null && rank <= ever) out.possible.push(slug);
      else out.stretch.push(slug);
    }

    return NextResponse.json(
      { rank, level, category, bands: out },
      { headers: rateLimitHeaders(limit, LIMIT) },
    );
  } catch (error) {
    logError(error, { route: "/api/college-bands", request });
    return NextResponse.json({ error: "Could not read the cutoff data." }, { status: 500 });
  }
}
