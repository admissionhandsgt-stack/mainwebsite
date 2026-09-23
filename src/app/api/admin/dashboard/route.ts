import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const rows = <T,>(r: unknown) => r as unknown as T[];
const one = (r: unknown) => rows<{ n: number }>(r)[0]?.n ?? 0;

/**
 * Numbers for the admin home.
 *
 * Deliberately answers "what needs my attention" rather than showing vanity
 * counts: unread leads first, then what is live on the site, then whether the
 * counselling data is actually loaded.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const [
      leadsTotal, leadsUnread, leadsToday, leadsWeek,
      alerts, videos, media, states, branches, legal,
      ugColleges, pgColleges, deemed,
      closingRanks, seatOptions, institutes,
      settings, blocks,
      recentLeads, leadsByDay,
    ] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS n FROM leads`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM leads WHERE is_read = false`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM leads WHERE created_at >= date_trunc('day', now())`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM leads WHERE created_at >= now() - interval '7 days'`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM live_alerts WHERE is_active = true`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM videos`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM media_assets WHERE is_active = true`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM mbbs_states WHERE is_active = true`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM pg_branches WHERE is_active = true`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM legal_documents WHERE is_published = true`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM ug_all_colleges WHERE is_active = true`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM pg_colleges_content WHERE is_active = true`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM deemed_colleges WHERE is_active = true`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM closing_ranks`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM seat_options`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM institutes`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM site_settings`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM content_blocks WHERE is_active = true`),
      db.execute(sql`
        SELECT id, name, phone, level, rank, preferred_branch, source_page,
               lead_status, is_read, created_at
        FROM leads ORDER BY created_at DESC LIMIT 8
      `),
      db.execute(sql`
        SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
               COUNT(l.id)::int AS n
        FROM generate_series(date_trunc('day', now()) - interval '13 days',
                             date_trunc('day', now()), interval '1 day') AS d(day)
        LEFT JOIN leads l ON date_trunc('day', l.created_at) = d.day
        GROUP BY d.day ORDER BY d.day
      `),
    ]);

    // UG counselling data is not loaded yet; surfacing it here means nobody
    // has to wonder why the UG predictor looks empty.
    const ugRanks = one(
      await db.execute(sql`SELECT COUNT(*)::int AS n FROM closing_ranks WHERE level = 'ug'`),
    );

    return NextResponse.json({
      leads: {
        total: one(leadsTotal),
        unread: one(leadsUnread),
        today: one(leadsToday),
        week: one(leadsWeek),
        recent: recentLeads,
        byDay: leadsByDay,
      },
      content: {
        alerts: one(alerts),
        videos: one(videos),
        media: one(media),
        states: one(states),
        branches: one(branches),
        legal: one(legal),
        settings: one(settings),
        blocks: one(blocks),
      },
      colleges: {
        ug: one(ugColleges),
        pg: one(pgColleges),
        deemed: one(deemed),
      },
      counselling: {
        closingRanks: one(closingRanks),
        seatOptions: one(seatOptions),
        institutes: one(institutes),
        ugRanks,
      },
    });
  } catch (error) {
    console.error("[/api/admin/dashboard]", error);
    return NextResponse.json({ error: "Could not load the dashboard." }, { status: 500 });
  }
}
