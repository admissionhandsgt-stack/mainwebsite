import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getBranches } from "@/lib/branchQueries";
import { getPgStates } from "@/lib/pgStateQueries";
import { collegeName } from "@/lib/collegeName";
import { clientIp } from "@/lib/clientIp";
import { rateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

/**
 * Site search (2026-10-21): the header's search box. With ~3,900 college pages, 101 branches and two
 * sets of state pages, the menus can lead somebody to a list but not to their college. Every word
 * typed must appear in the name; colleges whose name starts with it come first. Names, links and a
 * line of context only — nothing a page does not already show.
 *   GET /api/search?q=kasturba manipal
 */
export const dynamic = "force-dynamic";

const rows = <T,>(r: unknown) => r as unknown as T[];
const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function GET(request: Request) {
  const limit = rateLimit(`search:${clientIp(request) ?? "unknown"}`, 60, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many searches — try again in a minute." }, { status: 429 });

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  const words = fold(q).split(" ").filter((w) => w.length >= 2).slice(0, 5);
  if (!words.length) return NextResponse.json({ colleges: [], branches: [], states: [] });

  try {
    const like = words.map((w) => sql`i.name ILIKE ${"%" + w + "%"}`);
    const [colleges, branches, pgStates, ugStates] = await Promise.all([
      db.execute(sql`
        SELECT i.slug, i.name, i.level::text AS level, s.name AS state
          FROM institutes i LEFT JOIN states s ON s.id = i.state_id
         WHERE i.is_active AND i.slug IS NOT NULL AND ${sql.join(like, sql` AND `)}
         ORDER BY (i.name ILIKE ${words[0] + "%"}) DESC, length(i.name) ASC
         LIMIT 8`),
      getBranches(),
      getPgStates(),
      db.execute(sql`SELECT name, slug FROM mbbs_states WHERE is_active ORDER BY name`),
    ]);
    const has = (text: string) => {
      const t = fold(text);
      return words.every((w) => t.includes(w));
    };
    return NextResponse.json(
      {
        colleges: rows<{ slug: string; name: string; level: string; state: string | null }>(colleges).map((c) => {
          const n = collegeName(c.name);
          const pg = c.level === "pg";
          return {
            label: n.place && !n.short.toLowerCase().includes(n.place.toLowerCase()) ? `${n.short}, ${n.place}` : n.short,
            sub: [pg ? "MD/MS · DNB" : "MBBS · BDS", c.state].filter(Boolean).join(" · "),
            url: `${pg ? "/md-ms-india/colleges" : "/mbbs-india/colleges"}/${c.slug}`,
          };
        }),
        branches: branches
          .filter((b) => has(b.name))
          .slice(0, 5)
          .map((b) => ({ label: b.name, sub: "PG branch · cutoff, seats and colleges", url: `/md-ms-india/branches/${b.slug}` })),
        states: [
          ...pgStates.filter((s) => has(s.name)).map((s) => ({ label: `MD/MS in ${s.name}`, sub: "PG colleges, counselling and cutoff", url: `/md-ms-india/states/${s.slug}` })),
          ...rows<{ name: string; slug: string }>(ugStates)
            .filter((s) => has(s.name))
            .map((s) => ({ label: `MBBS in ${s.name}`, sub: "MBBS colleges and counselling", url: `/mbbs-india/${encodeURIComponent(s.slug)}` })),
        ].slice(0, 4),
      },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  } catch (error) {
    logError(error, { route: "api/search" });
    return NextResponse.json({ colleges: [], branches: [], states: [] }, { status: 500 });
  }
}
