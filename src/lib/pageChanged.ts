/**
 * The moment the page watcher last saw a page's words change (lib/pageWatch.ts, page_fingerprints.changed_at), read
 * straight from the database on each render — one indexed row — so the "Updated … IST" line and the JSON-LD dateModified
 * can never lag behind it. The sitemap-derived date (lib/pageDates.ts) is a cached build, and after a restart Next hands
 * out an expired build once while it rebuilds: an edge test on 2026-11-18 caught a page changed at 1:38 pm still saying
 * 11:37 am. The later of the two is the page's date.
 */
import { cache } from "react";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/** The later of two lastmods (a date, or an IST date and time). A bare day gives way to a time on that same day. */
export function laterOf(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!b) return a ?? null;
  if (!a) return b;
  const da = a.slice(0, 10);
  const dbv = b.slice(0, 10);
  if (dbv !== da) return dbv > da ? b : a;
  if (a.length <= 10) return b;
  return Date.parse(b) >= Date.parse(a) ? b : a;
}

/** This page's last watched change as an IST date and time ("2026-11-18T13:38:02+05:30"), or null. Never throws. */
export const changedAtFor = cache(async (path: string | null | undefined): Promise<string | null> => {
  if (!path) return null;
  try {
    const r = (await db.execute(sql`
      SELECT to_char(changed_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI:SS') || '+05:30' AS at
        FROM page_fingerprints WHERE path = ${path} AND changed_at IS NOT NULL`)) as unknown as { at: string }[];
    return r[0]?.at ?? null;
  } catch {
    return null;
  }
});
