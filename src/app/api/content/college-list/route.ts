import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Filtered, paginated reads of the curated college lists.
 *
 * The deemed-universities and PG listing pages filter and page server-side,
 * so they need more than the flat `/api/content/<resource>` endpoint gives.
 * Table names come from the allow-list below, never from the request.
 */
const SOURCES = {
  deemed: { table: "deemed_colleges", nameCol: "college_name" },
  "ug-all": { table: "ug_all_colleges", nameCol: "college_name" },
  "ug-recommended": { table: "ug_recommended_colleges", nameCol: "college_name" },
  pg: { table: "pg_colleges_content", nameCol: "college_name" },
} as const;

const PAGE_SIZE_MAX = 60;

export async function GET(request: Request) {
  const LIMIT = 60;
  const limit = rateLimit(`college-list:${clientKey(request)}`, LIMIT, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  const p = new URL(request.url).searchParams;
  const source = SOURCES[(p.get("source") ?? "deemed") as keyof typeof SOURCES];
  if (!source) {
    return NextResponse.json({ error: "Unknown list." }, { status: 404 });
  }

  const isPg = source.table === "pg_colleges_content";
  const page = Math.max(1, Number(p.get("page")) || 1);
  const perPage = Math.min(Number(p.get("perPage")) || 24, PAGE_SIZE_MAX);
  const offset = (page - 1) * perPage;

  const where = [sql`is_active = true`];

  const search = p.get("search")?.trim();
  if (search) {
    const q = `%${search.toLowerCase()}%`;
    where.push(
      isPg
        ? sql`(lower(college_name) LIKE ${q} OR lower(COALESCE(city, '')) LIKE ${q} OR lower(COALESCE(state, '')) LIKE ${q})`
        : sql`(lower(college_name) LIKE ${q} OR lower(COALESCE(university_name, '')) LIKE ${q} OR lower(COALESCE(city, '')) LIKE ${q})`,
    );
  }

  // `state` and `collegeType` accept a comma-separated list, because the PG
  // listing filters on several at once.
  const list = (key: string) =>
    (p.get(key) ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 50);

  const states = list("state");
  if (states.length) {
    where.push(sql`state IN (${sql.join(states.map((v) => sql`${v}`), sql`, `)})`);
  }

  const types = list("collegeType");
  if (types.length) {
    where.push(sql`college_type IN (${sql.join(types.map((v) => sql`${v}`), sql`, `)})`);
  }

  const ownership = p.get("ownership");
  if (ownership && isPg) where.push(sql`ownership = ${ownership}`);

  if (!isPg) {
    const intake = Number(p.get("intake"));
    if (Number.isInteger(intake) && intake > 0) where.push(sql`intake = ${intake}`);
    if (p.get("nriSeats") === "true") where.push(sql`has_nri_seats = true`);
    if (p.get("minoritySeats") === "true") where.push(sql`has_minority_seats = true`);
    if (p.get("womenOnly") === "true") where.push(sql`is_women_only = true`);
  }

  const whereSql = sql.join(where, sql` AND `);

  const sortKey = p.get("sortBy") ?? "default";
  const order = isPg
    ? sortKey === "seats_high"
      ? sql`total_pg_seats DESC NULLS LAST`
      : sortKey === "name_asc"
        ? sql`college_name ASC`
        : sql`display_order ASC, college_name ASC`
    : sortKey === "name_asc"
      ? sql`college_name ASC`
      : sortKey === "intake_high"
        ? sql`intake DESC NULLS LAST`
        : sortKey === "intake_low"
          ? sql`intake ASC NULLS LAST`
          : sortKey === "state_asc"
            ? sql`state ASC`
            : sql`display_order ASC, college_name ASC`;

  try {
    const [items, count, facets] = await Promise.all([
      db.execute(sql`
        SELECT * FROM ${sql.raw(source.table)}
        WHERE ${whereSql} ORDER BY ${order}
        LIMIT ${perPage} OFFSET ${offset}
      `),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM ${sql.raw(source.table)} WHERE ${whereSql}`),
      db.execute(sql`
        SELECT DISTINCT state FROM ${sql.raw(source.table)}
        WHERE is_active = true AND state IS NOT NULL ORDER BY state
      `),
    ]);

    const intakes = isPg
      ? []
      : ((await db.execute(sql`
          SELECT DISTINCT intake FROM ${sql.raw(source.table)}
          WHERE is_active = true AND intake IS NOT NULL ORDER BY intake
        `)) as unknown as { intake: number }[]).map((r) => r.intake);

    return NextResponse.json({
      data: items,
      total: (count as unknown as { n: number }[])[0]?.n ?? 0,
      page,
      perPage,
      states: (facets as unknown as { state: string }[]).map((r) => r.state),
      intakes,
    });
  } catch (error) {
    logError(error, { route: "/api/content/college-list", request });
    return NextResponse.json({ error: "Could not load colleges." }, { status: 500 });
  }
}
