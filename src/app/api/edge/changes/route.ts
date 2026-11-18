import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { recentChanges } from "@/lib/pageWatch";

/**
 * The pages whose words changed in the last 48 hours, path → epoch ms (lib/pageWatch.ts), for the edge worker
 * (deploy/edge/_worker.js): a cached copy stored before its page's change is not served — not to a visitor, not to
 * Googlebot — so a search engine told about a change reads the change. Only for the edge (its shared key); anything else
 * is a 404. Answered from memory for 15 seconds, so every edge location asking once a minute costs nothing.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let memo: { at: number; body: string } | null = null;

function fromEdge(request: Request): boolean {
  const expected = process.env.EDGE_SHARED_SECRET ?? "";
  const given = request.headers.get("x-ah-edge-key") ?? "";
  if (expected.length < 16 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!fromEdge(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!memo || Date.now() - memo.at > 15_000) {
    const c = await recentChanges(48).catch(() => null);
    if (c) memo = { at: Date.now(), body: JSON.stringify({ at: Date.now(), c }) };
  }
  return new NextResponse(memo?.body ?? JSON.stringify({ at: Date.now(), c: {} }), {
    headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
