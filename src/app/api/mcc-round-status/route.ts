import { NextResponse } from "next/server";
import { getRoundState, roundByName } from "@/lib/mccResults";

/**
 * Where a round's result stands — for components/mcc/RoundWatch, which reloads an open round page
 * the moment MCC's result is seen or read. Public: it says only what the page itself says.
 *   GET /api/mcc-round-status?year=2026&round=Round%201
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const year = Number(p.get("year"));
  const round = p.get("round") ?? "";
  if (!Number.isInteger(year) || year < 2020 || year > 2100 || !roundByName(round)) {
    return NextResponse.json({ error: "year or round not recognised" }, { status: 400 });
  }
  const s = await getRoundState(year, round);
  return NextResponse.json({ status: s.status, updating: s.updating }, { headers: { "cache-control": "no-store" } });
}
