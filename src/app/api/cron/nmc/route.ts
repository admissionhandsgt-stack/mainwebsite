import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { syncNmc } from "@/lib/nmcSync";
import { logError } from "@/lib/logger";

/**
 * Re-read the NMC college-and-course register (lib/nmcSync.ts). Weekly, from the
 * server's crontab, never from a browser:
 *   curl -fsS -X POST -H "x-cron-secret: $(cat /opt/admissionhands/.cron-secret)" \
 *        http://127.0.0.1:8150/api/cron/nmc
 * Refuses everything when CRON_SECRET is unset. A failed read leaves the last
 * good register in place (the sync checks before it replaces anything).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("x-cron-secret") ?? "";
  if (expected.length < 32 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const result = await syncNmc("cron");
    revalidateTag("nmc");
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/nmc" });
    return NextResponse.json({ error: "sync failed" }, { status: 500 });
  }
}
