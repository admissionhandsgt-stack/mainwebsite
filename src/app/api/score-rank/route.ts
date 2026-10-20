import { NextResponse } from "next/server";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { scoreRange } from "@/lib/scoreRank";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/score-rank?exam=pg&score=450 — the rank range a NEET PG score held in the latest result
 * NBEMS published (lib/scoreRank.ts). Public: it is the exam body's own score-and-rank list,
 * aggregated per score, and says nothing about any college.
 */
export async function GET(request: Request) {
  const LIMIT = 60;
  const limit = rateLimit(`score-rank:${clientKey(request)}`, LIMIT, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429, headers: rateLimitHeaders(limit, LIMIT) });
  }
  const url = new URL(request.url);
  const exam = url.searchParams.get("exam");
  const raw = (url.searchParams.get("score") ?? "").trim();
  if (exam !== "pg") return NextResponse.json({ error: "Only NEET PG has a published score list." }, { status: 400 });
  if (!/^-?\d{1,3}$/.test(raw)) return NextResponse.json({ error: "Type your score as a whole number, e.g. 450." }, { status: 400 });

  const r = await scoreRange("pg", Number(raw));
  if (r.ok) return NextResponse.json(r.range, { headers: { "Cache-Control": "public, max-age=3600" } });
  if (r.reason === "no-data") return NextResponse.json({ error: "The score list is not available just now." }, { status: 503 });
  const msg =
    r.reason === "out-of-range"
      ? `NEET PG ${r.year} scores ran from ${r.maxScore} down to ${r.minScore} (out of ${r.outOf}). Check the score on your scorecard.`
      : `No NEET PG ${r.year} result has a score of ${raw}. Check the score on your scorecard.`;
  return NextResponse.json({ error: msg, year: r.year }, { status: 404 });
}
