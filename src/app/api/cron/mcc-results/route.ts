import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ingestRound, onDetected, onFailed, roundByName } from "@/lib/mccResults";
import { logError } from "@/lib/logger";

/**
 * The mcc-worker container's half-way house into the app (lib/mccResults.ts):
 *   POST {"action":"detected","year":2026,"round":"Round 1"}   MCC posted a result PDF
 *   POST {"action":"failed",  …}                              it did not read as a result
 *   POST {"action":"ingest",  …, "dryRun": true?}             staged rows → mcc_allotments, page live
 * Header `x-cron-secret` = CRON_SECRET, as for every cron route; unset, everything 404s.
 * The worker reaches the app inside the compose network (http://app:8150), never through the edge.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("x-cron-secret") ?? "";
  if (expected.length < 32 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let body: { action?: string; year?: number; round?: string; dryRun?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const year = Number(body.year);
  const round = String(body.round ?? "");
  if (!Number.isInteger(year) || year < 2020 || year > 2100 || !roundByName(round)) {
    return NextResponse.json({ error: "year or round not recognised" }, { status: 400 });
  }
  try {
    const headers = { "cache-control": "no-store" };
    if (body.action === "detected") return NextResponse.json(await onDetected(year, round), { headers });
    if (body.action === "failed") return NextResponse.json(await onFailed(year, round), { headers });
    if (body.action === "ingest") return NextResponse.json(await ingestRound(year, round, { dryRun: body.dryRun === true }), { headers });
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    logError(error, { route: `cron/mcc-results:${body.action}:${year}:${round}` });
    return NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 500 });
  }
}
