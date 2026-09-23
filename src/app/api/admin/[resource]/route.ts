import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { RESOURCE_SPECS, pickColumns } from "@/lib/adminResources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Admin CRUD for the CMS tables — list and create.
 *
 * One route rather than a dozen near-identical ones. The allow-list in
 * `lib/adminResources.ts` is the safety property: table and column names come
 * from there, never from the request.
 */

export async function GET(_request: Request, { params }: { params: { resource: string } }) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const r = RESOURCE_SPECS[params.resource];
  if (!r) return NextResponse.json({ error: "Unknown resource." }, { status: 404 });

  try {
    const data = await db.execute(
      sql`SELECT * FROM ${sql.raw(r.table)} ORDER BY ${r.orderBy} LIMIT 2000`,
    );
    return NextResponse.json({ data });
  } catch (error) {
    console.error(`[admin GET ${params.resource}]`, error);
    return NextResponse.json({ error: "Could not load." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { resource: string } }) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const r = RESOURCE_SPECS[params.resource];
  if (!r) return NextResponse.json({ error: "Unknown resource." }, { status: 404 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const values = pickColumns(body, r.columns);
    if (Object.keys(values).length === 0) {
      return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
    }

    const cols = Object.keys(values);
    const inserted = await db.execute(sql`
      INSERT INTO ${sql.raw(r.table)} (${sql.raw(cols.map((c) => `"${c}"`).join(", "))})
      VALUES (${sql.join(
        cols.map((c) => sql`${values[c]}`),
        sql`, `,
      )})
      RETURNING *
    `);
    return NextResponse.json({ data: (inserted as unknown as unknown[])[0] }, { status: 201 });
  } catch (error) {
    console.error(`[admin POST ${params.resource}]`, error);
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }
}

/** Singleton tables (contact details) are edited without an id. */
export async function PATCH(request: Request, { params }: { params: { resource: string } }) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const r = RESOURCE_SPECS[params.resource];
  if (!r?.singleton) {
    return NextResponse.json({ error: "Use /api/admin/<resource>/<id>." }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const values = pickColumns(body, r.columns);
    if (Object.keys(values).length === 0) {
      return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
    }

    const sets = Object.entries(values).map(([c, v]) => sql`${sql.raw(`"${c}"`)} = ${v}`);
    const updated = await db.execute(sql`
      UPDATE ${sql.raw(r.table)}
      SET ${sql.join(sets, sql`, `)}, updated_at = now()
      WHERE id = (SELECT id FROM ${sql.raw(r.table)} ORDER BY id LIMIT 1)
      RETURNING *
    `);
    return NextResponse.json({ data: (updated as unknown as unknown[])[0] });
  } catch (error) {
    console.error(`[admin PATCH ${params.resource}]`, error);
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }
}
