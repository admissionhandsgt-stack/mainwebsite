import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { buildHunt } from "@/lib/hunt";
import { packMessages, todaysPack } from "@/lib/socialPosts";
import { tellOwner } from "@/lib/telegramBot";
import { logError } from "@/lib/logger";
import { beat } from "@/lib/heartbeat";

/**
 * Daily (server crontab, 06:05 UTC = 11:35 IST): the day's hunt — searched questions with answers ready to post by hand
 * (lib/hunt.ts). Same secret as the other cron routes; anything without it is a 404.
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
  try {
    const result = await buildHunt();
    // Today's data post for the owner to put up himself (lib/socialPosts.ts); never fails the hunt.
    const pack = await todaysPack().catch(() => null);
    if (pack) for (const m of packMessages(pack)) await tellOwner(m).catch(() => undefined);
    await beat("hunt", true, `${result.added} added${pack ? `, data post: ${pack.topic}` : ""}`);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/hunt" });
    await beat("hunt", false, error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "hunt failed" }, { status: 500 });
  }
}
