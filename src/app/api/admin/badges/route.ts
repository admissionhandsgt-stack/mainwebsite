import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The counts beside the admin menu — what is waiting on somebody. One cheap
 * query, polled by the sidebar every minute.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  try {
    const [r] = (await db.execute(sql`
      SELECT
        (SELECT count(*) FROM leads WHERE is_read = false)::int AS leads,
        (SELECT count(*) FROM leads WHERE follow_up_on IS NOT NULL
            AND follow_up_on <= (now() AT TIME ZONE 'Asia/Kolkata')::date
            AND lead_status NOT IN ('Converted', 'Not interested', 'Wrong number', 'Lost'))::int AS follow_ups,
        (SELECT count(*) FROM student_documents WHERE status = 'uploaded')::int AS documents,
        (SELECT count(DISTINCT phone) FROM wa_messages WHERE direction = 'in' AND seen_at IS NULL)::int AS whatsapp,
        (SELECT count(*) FROM wa_messages WHERE direction = 'out' AND status = 'failed'
            AND created_at > now() - interval '24 hours')::int AS whatsapp_failed,
        (SELECT count(*) FROM error_log WHERE level = 'error' AND created_at > now() - interval '24 hours')::int AS errors
    `)) as unknown as Record<string, number>[];
    return NextResponse.json(r ?? {});
  } catch (error) {
    logError(error, { route: "/api/admin/badges" });
    return NextResponse.json({}, { status: 500 });
  }
}
