import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncCounselor, syncSheet } from "@/lib/leadSheet";
import { refreshBranchCatalogue } from "@/lib/branchCatalogue";
import { sendDueReminders } from "@/lib/staffAlerts";
import { logError } from "@/lib/logger";

/**
 * Every 2 minutes: the counsellors' Google Sheet both ways (lib/leadSheet.ts),
 * then PG students into the AH Counselor app, then any follow-up reminder whose time has come (lib/staffAlerts.ts). Same
 * secret as the other cron routes; anything without it is a 404.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("x-cron-secret") ?? "";
  if (expected.length < 32 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const sheet = await syncSheet();
    // After the sheet, so a new student already has a row for the link to land in.
    const counselor = await syncCounselor();
    const reminders = await sendDueReminders();
    const branches = await refreshBranchCatalogue();
    return NextResponse.json({ sheet, counselor, reminders, branches }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "cron/sheets" });
    return NextResponse.json({ error: "sheet sync failed" }, { status: 500 });
  }
}
