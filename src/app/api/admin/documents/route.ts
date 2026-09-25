import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { logError } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The team's view of the vault: who has uploaded what.
 *
 * Grouped by candidate rather than listed by file, because the question staff
 * actually have is "is this person ready to report?" — which a flat list of
 * 200 files does not answer.
 *
 * `PATCH` records a review. It writes only `status` and `admin_note`; nothing
 * a student uploaded can be edited from here, for the same reason the leads
 * table is half read-only — the record of what was sent must stay what was
 * sent.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 80);

  try {
    const rows = (await db.execute(sql`
      SELECT d.id, d.doc_type, d.original_name, d.mime_type, d.size_bytes,
             d.status::text AS status, d.admin_note, d.uploaded_at,
             u.id AS user_id, u.name, u.phone, u.level::text AS level, u.rank
        FROM student_documents d
        JOIN users u ON u.id = d.user_id
       ${q ? sql`WHERE u.phone ILIKE ${"%" + q + "%"} OR u.name ILIKE ${"%" + q + "%"}` : sql``}
       ORDER BY d.uploaded_at DESC
       LIMIT 600
    `)) as unknown as Record<string, unknown>[];

    // One entry per candidate, newest activity first.
    const byUser = new Map<number, Record<string, unknown>>();
    for (const r of rows) {
      const id = r.user_id as number;
      if (!byUser.has(id)) {
        byUser.set(id, {
          userId: id,
          name: r.name ?? null,
          phone: r.phone,
          level: r.level ?? null,
          rank: r.rank ?? null,
          lastUpload: r.uploaded_at,
          documents: [],
        });
      }
      (byUser.get(id)!.documents as unknown[]).push({
        id: r.id,
        docType: r.doc_type,
        name: r.original_name,
        mime: r.mime_type,
        size: r.size_bytes,
        status: r.status,
        note: r.admin_note ?? null,
        uploadedAt: r.uploaded_at,
      });
    }

    return NextResponse.json({ candidates: Array.from(byUser.values()) });
  } catch (error) {
    logError(error, { route: "/api/admin/documents:GET", request });
    return NextResponse.json({ error: "Could not load the documents." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const id = Number(body.id);
  const status = String(body.status ?? "");
  if (!Number.isInteger(id) || !["uploaded", "verified", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  }

  // A rejection without a reason is a dead end for the student.
  const note = String(body.note ?? "").trim().slice(0, 500) || null;
  if (status === "rejected" && !note) {
    return NextResponse.json(
      { error: "Say what is wrong with it, so the candidate can fix it." },
      { status: 400 },
    );
  }

  try {
    const rows = (await db.execute(sql`
      UPDATE student_documents
         SET status = ${status}::document_status,
             admin_note = ${note},
             reviewed_at = now()
       WHERE id = ${id}
      RETURNING id, status::text AS status, admin_note
    `)) as unknown as Record<string, unknown>[];

    if (rows.length === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true, document: rows[0] });
  } catch (error) {
    logError(error, { route: "/api/admin/documents:PATCH", request });
    return NextResponse.json({ error: "Could not save that review." }, { status: 500 });
  }
}
