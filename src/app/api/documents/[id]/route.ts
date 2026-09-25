import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { logError } from "@/lib/logger";
import { userFromRequest } from "@/lib/userAuth";
import { getSessionUser } from "@/lib/auth";
import { resolveStoredPath, removeStoredFile } from "@/lib/documents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * One document: fetch the bytes, or delete it.
 *
 * **This route is the access control.** The files sit outside the web root, so
 * there is no URL that reaches them without passing through here, and here the
 * answer to "may you have this?" is exactly two people: the student it belongs
 * to, and a signed-in member of staff.
 *
 * Both checks run against session cookies. Nothing is decided by a parameter
 * the caller supplies — an id that is not yours simply 404s, so the endpoint
 * cannot be used to discover that a document exists.
 */

interface Row {
  id: number;
  user_id: number;
  stored_name: string;
  original_name: string;
  mime_type: string;
}

async function load(id: number): Promise<Row | null> {
  const rows = (await db.execute(sql`
    SELECT id, user_id, stored_name, original_name, mime_type
      FROM student_documents WHERE id = ${id} LIMIT 1
  `)) as unknown as Row[];
  return rows[0] ?? null;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const row = await load(id);
    if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const [student, admin] = await Promise.all([userFromRequest(request), getSessionUser()]);
    const mayRead = admin !== null || (student !== null && student.id === row.user_id);
    if (!mayRead) {
      // 404 rather than 403: a 403 confirms the document is there.
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const full = resolveStoredPath(row.stored_name);
    if (!full) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const bytes = await readFile(full);

    // `attachment` on purpose. Rendering an uploaded file inline would run any
    // script inside an SVG or an HTML file mislabelled as something else, in
    // the site's own origin, against a signed-in session.
    const filename = row.original_name.replace(/["\\]/g, "");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": row.mime_type,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(row.original_name)}`,
        // Never cached anywhere but the requesting browser's memory.
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    logError(error, { route: "/api/documents/[id]:GET", request });
    return NextResponse.json({ error: "Could not read that document." }, { status: 500 });
  }
}

/**
 * Removing a document.
 *
 * Only the student who uploaded it, and only while it is still theirs to
 * change. Once staff have marked it verified it is part of a record, so
 * replacing it is an upload, not a deletion.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const user = await userFromRequest(request);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  try {
    const rows = (await db.execute(sql`
      DELETE FROM student_documents
       WHERE id = ${id} AND user_id = ${user.id} AND status <> 'verified'
      RETURNING stored_name
    `)) as unknown as { stored_name: string }[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    // The row is the record; the file is the data. Row first, so a failure
    // here leaves an orphaned file rather than a row pointing at nothing.
    await removeStoredFile(rows[0].stored_name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError(error, { route: "/api/documents/[id]:DELETE", request });
    return NextResponse.json({ error: "Could not remove that document." }, { status: 500 });
  }
}
