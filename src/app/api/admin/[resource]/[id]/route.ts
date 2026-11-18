import { NextResponse } from "next/server";
import { afterAdminEdit } from "@/lib/adminEditWatch";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { RESOURCE_SPECS, pickColumns } from "@/lib/adminResources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Update or delete one row. Same allow-list rules as the collection route. */

export async function PATCH(
  request: Request,
  props: { params: Promise<{ resource: string; id: string }> }
) {
  const params = await props.params;
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const r = RESOURCE_SPECS[params.resource];
  if (!r) return NextResponse.json({ error: "Unknown resource." }, { status: 404 });

  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
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
      SET ${sql.join(sets, sql`, `)}${r.hasUpdatedAt ? sql`, updated_at = now()` : sql``}
      WHERE id = ${id}
      RETURNING *
    `);

    const row = (updated as unknown as Record<string, unknown>[])[0];
    if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
    // An edit to MCC's schedule (dates, a hold, a "dates may change" line) changes every page that prints it: tell
    // search engines at once (lib/notifyChange.ts, 2026-11-18). Not awaited — the save answers straight away.
    if (params.resource === "blocks" && row.collection === "pg_schedule") {
      void import("@/lib/notifyChange")
        .then(async (m) => m.notifyChange(await m.schedulePaths(), `MCC schedule edited in the admin (${String(row.title ?? row.id)})`))
        .catch(() => undefined);
    }
    afterAdminEdit(params.resource);
    return NextResponse.json({ data: row });
  } catch (error) {
    console.error(`[admin PATCH ${params.resource}/${params.id}]`, error);
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ resource: string; id: string }> }
) {
  const params = await props.params;
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const r = RESOURCE_SPECS[params.resource];
  if (!r) return NextResponse.json({ error: "Unknown resource." }, { status: 404 });

  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  try {
    await db.execute(sql`DELETE FROM ${sql.raw(r.table)} WHERE id = ${id}`);
    afterAdminEdit(params.resource);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[admin DELETE ${params.resource}/${params.id}]`, error);
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }
}
