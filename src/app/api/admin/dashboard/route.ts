import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const rows = <T,>(r: unknown) => r as unknown as T[];

/** "Today" is an Indian day — the team works in IST and the server runs in UTC. */
const IST_TODAY = sql`date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')`;
const ist = (col: string) => sql.raw(`(${col} AT TIME ZONE 'Asia/Kolkata')`);

/**
 * Numbers for the admin home, in the order somebody acts on them: what is
 * waiting on a person, how this week compares with last, where leads come
 * from and where they have got to, then the state of the data behind the site.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const [counts, trend, pipeline, sources, recent, health] = await Promise.all([
      db.execute(sql`
        SELECT
          (SELECT count(*) FROM leads WHERE is_read = false)::int AS unread_leads,
          (SELECT min(created_at) FROM leads WHERE is_read = false) AS oldest_unread,
          (SELECT count(*) FROM leads WHERE follow_up_on IS NOT NULL
              AND follow_up_on <= (now() AT TIME ZONE 'Asia/Kolkata')::date
              AND lead_status NOT IN ('Converted', 'Not interested', 'Wrong number', 'Lost'))::int AS follow_ups_due,
          (SELECT count(*) FROM leads WHERE lead_status = 'New' AND created_at < now() - interval '24 hours')::int AS stale_new,
          (SELECT count(*) FROM student_documents WHERE status = 'uploaded')::int AS docs_pending,
          (SELECT count(DISTINCT phone) FROM wa_messages WHERE direction = 'in' AND seen_at IS NULL)::int AS wa_unread,
          (SELECT count(*) FROM wa_messages WHERE direction = 'out' AND status = 'failed'
              AND created_at > now() - interval '24 hours')::int AS wa_failed,
          (SELECT count(*) FROM wa_messages WHERE direction = 'out' AND status = 'accepted'
              AND created_at BETWEEN now() - interval '24 hours' AND now() - interval '10 minutes')::int AS wa_no_receipt,
          (SELECT count(*) FROM error_log WHERE level = 'error' AND created_at > now() - interval '24 hours')::int AS errors,

          (SELECT count(*) FROM leads WHERE ${ist("created_at")} >= ${IST_TODAY})::int AS leads_today,
          (SELECT count(*) FROM leads WHERE ${ist("created_at")} >= ${IST_TODAY} - interval '1 day'
              AND ${ist("created_at")} < ${IST_TODAY})::int AS leads_yesterday,
          (SELECT count(*) FROM leads WHERE created_at >= now() - interval '7 days')::int AS leads_7,
          (SELECT count(*) FROM leads WHERE created_at >= now() - interval '14 days'
              AND created_at < now() - interval '7 days')::int AS leads_prev_7,
          (SELECT count(*) FROM users WHERE verified_at IS NOT NULL AND created_at >= now() - interval '7 days')::int AS signups_7,
          (SELECT count(*) FROM users WHERE verified_at IS NOT NULL AND created_at >= now() - interval '14 days'
              AND created_at < now() - interval '7 days')::int AS signups_prev_7,
          (SELECT count(*) FROM wa_messages WHERE kind = 'otp' AND created_at > now() - interval '24 hours'
              AND status <> 'unknown')::int AS codes_sent,
          (SELECT count(*) FROM wa_messages WHERE kind = 'otp' AND created_at > now() - interval '24 hours'
              AND status IN ('delivered', 'read'))::int AS codes_delivered,
          (SELECT count(*) FROM leads)::int AS leads_total
      `),
      db.execute(sql`
        SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
               (SELECT count(*) FROM leads l WHERE date_trunc('day', ${ist("l.created_at")}) = d.day)::int AS leads,
               (SELECT count(*) FROM users u WHERE u.verified_at IS NOT NULL
                   AND date_trunc('day', ${ist("u.created_at")}) = d.day)::int AS signups
          FROM generate_series(${IST_TODAY} - interval '13 days', ${IST_TODAY}, interval '1 day') AS d(day)
         ORDER BY d.day
      `),
      db.execute(sql`
        SELECT lead_status AS status, count(*)::int AS n FROM leads GROUP BY 1
      `),
      db.execute(sql`
        SELECT split_part(split_part(COALESCE(NULLIF(source_page, ''), 'Unknown'), ' (', 1), ' — ', 1) AS source,
               count(*)::int AS n
          FROM leads WHERE created_at >= now() - interval '30 days'
         GROUP BY 1 ORDER BY 2 DESC LIMIT 6
      `),
      db.execute(sql`
        SELECT id, name, phone, level::text AS level, rank, category, preferred_branch, source_page,
               lead_status, is_read, assigned_to, created_at
          FROM leads ORDER BY created_at DESC LIMIT 8
      `),
      db.execute(sql`
        SELECT
          (SELECT count(*) FROM closing_ranks)::int AS closing_ranks,
          (SELECT count(*) FROM seat_options)::int AS seat_options,
          (SELECT count(*) FROM institutes)::int AS institutes,
          (SELECT count(*) FROM live_alerts WHERE is_active = true AND (expires_at IS NULL OR expires_at > now()))::int AS alerts,
          (SELECT count(*) FROM content_blocks WHERE is_active = true)::int AS blocks,
          (SELECT count(*) FROM videos)::int AS videos
      `),
    ]);

    return NextResponse.json({
      counts: rows<Record<string, number | string | null>>(counts)[0] ?? {},
      trend: rows(trend),
      pipeline: rows(pipeline),
      sources: rows(sources),
      recent: rows(recent),
      health: rows<Record<string, number>>(health)[0] ?? {},
    });
  } catch (error) {
    logError(error, { route: "/api/admin/dashboard" });
    return NextResponse.json({ error: "Could not load the dashboard." }, { status: 500 });
  }
}
