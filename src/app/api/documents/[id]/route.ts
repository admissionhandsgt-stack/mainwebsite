import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { logError } from "@/lib/logger";
import { userFromRequest } from "@/lib/userAuth";
import { getSessionUser } from "@/lib/auth";
import { openDocument } from "@/lib/documentCrypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * One document: fetch the bytes, or delete it.
 *
 * **This route is the access control.** The bytes are a column in Postgres, so
 * there is no file to reach by any other means, and here the answer to "may you
 * have this?" is exactly two people: the student it belongs to, and a signed-in
 * member of staff.
 *
 * Both checks run against session cookies. Nothing is decided by a parameter
 * the caller supplies — an id that is not yours simply 404s, so the endpoint
 * cannot be used to discover that a document exists.
 */

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    // Ownership is settled before the bytes are asked for, so a stranger's
    // request never reads a 15 MB column out of the database.
    const meta = (await db.execute(sql`
      SELECT user_id, original_name, mime_type
        FROM student_documents WHERE id = ${id} LIMIT 1
    `)) as unknown as { user_id: number; original_name: string; mime_type: string }[];

    const row = meta[0];
    if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const [student, admin] = await Promise.all([userFromRequest(request), getSessionUser()]);
    const mayRead = admin !== null || (student !== null && student.id === row.user_id);
    if (!mayRead) {
      // 404 rather than 403: a 403 confirms the document is there.
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const data = (await db.execute(sql`
      SELECT content FROM student_documents WHERE id = ${id} LIMIT 1
    `)) as unknown as { content: Buffer }[];

    const content = data[0]?.content;
    if (!content) return NextResponse.json({ error: "Not found." }, { status: 404 });

    // Stored sealed (documentCrypto.ts). This is the only place it is opened,
    // and the bytes never touch the disk on the way out.
    const bytes = openDocument(Buffer.isBuffer(content) ? content : Buffer.from(content));

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
 *
 * One statement, and the bytes go with the row — "remove" means removed, with
 * no second copy anywhere to forget about.
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
      RETURNING id
    `)) as unknown as { id: number }[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError(error, { route: "/api/documents/[id]:DELETE", request });
    return NextResponse.json({ error: "Could not remove that document." }, { status: 500 });
  }
}
