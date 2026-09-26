import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { logError } from "@/lib/logger";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { userFromRequest } from "@/lib/userAuth";
import { documentType } from "@/lib/documentCatalogue";
import { MAX_BYTES, ACCEPTED_LABEL, detectFormat, safeDisplayName } from "@/lib/documents";
import { documentEncryptionReady, sealDocument } from "@/lib/documentCrypto";
import { notifyDocumentUpload } from "@/lib/documentNotify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A student's counselling documents.
 *
 * `GET` lists their own. `POST` uploads one against a document type, replacing
 * whatever was there before — somebody re-scanning a blurry certificate wants
 * the new one to *be* the document, not to sit beside the old one.
 *
 * Both require a session, and both are scoped to that session's user. There is
 * no `userId` parameter anywhere on this route: the only way to read or write
 * somebody's documents is to hold their cookie.
 *
 * The bytes go in the row (migration `0015`), so an upload is one statement.
 * There is no window in which a file and a row can disagree, and nothing to
 * clean up if the process stops midway.
 *
 * **`content` is never selected here.** Listing fourteen documents does not
 * need their contents, and Postgres leaves a TOASTed column alone unless it is
 * asked for — so the list stays cheap however large the files are.
 */

/** Fourteen documents, plus retries and corrections. */
const LIMIT = 40;
const WINDOW_MS = 60 * 60 * 1000;

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  try {
    const rows = (await db.execute(sql`
      SELECT id, doc_type, original_name, mime_type, size_bytes,
             status::text AS status, admin_note, uploaded_at
        FROM student_documents
       WHERE user_id = ${user.id}
       ORDER BY uploaded_at DESC
    `)) as unknown as Record<string, unknown>[];

    return NextResponse.json({
      documents: rows.map((r) => ({
        id: r.id,
        docType: r.doc_type,
        name: r.original_name,
        mime: r.mime_type,
        size: r.size_bytes,
        status: r.status,
        note: r.admin_note ?? null,
        uploadedAt: r.uploaded_at,
      })),
    });
  } catch (error) {
    logError(error, { route: "/api/documents:GET", request });
    return NextResponse.json({ error: "Could not load your documents." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const limit = rateLimit(`docs:${clientKey(request)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many uploads just now. Try again in a little while." },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Malformed upload." }, { status: 400 });
  }

  const docType = String(form.get("docType") ?? "");
  if (!documentType(docType)) {
    return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file was sent." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Files must be under ${Math.round(MAX_BYTES / (1024 * 1024))} MB.` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const format = detectFormat(buffer, file.type);
  if (!format) {
    return NextResponse.json(
      { error: `That file type is not accepted. Upload a ${ACCEPTED_LABEL}.` },
      { status: 415 },
    );
  }

  // Refuse rather than store an identity document in the clear. See
  // documentCrypto.ts — a missing key must be a visible failure, not a quiet
  // downgrade.
  if (!documentEncryptionReady()) {
    logError(new Error("DOCUMENT_KEY is not set; refusing to store a document"), {
      route: "/api/documents",
      request,
    });
    return NextResponse.json(
      { error: "Uploads are temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }

  try {
    // `size_bytes` stays the size of the real file, not of the sealed blob —
    // it is what the student is shown.
    const sealed = sealDocument(buffer);

    const rows = (await db.execute(sql`
      INSERT INTO student_documents
        (user_id, doc_type, original_name, mime_type, size_bytes, content)
      VALUES (
        ${user.id}, ${docType}, ${safeDisplayName(file.name)},
        ${format.mime}, ${buffer.length}, ${sealed}
      )
      ON CONFLICT (user_id, doc_type) DO UPDATE SET
        original_name = EXCLUDED.original_name,
        mime_type     = EXCLUDED.mime_type,
        size_bytes    = EXCLUDED.size_bytes,
        content       = EXCLUDED.content,
        -- A replacement has not been reviewed, whatever the old one was.
        status        = 'uploaded',
        admin_note    = NULL,
        reviewed_at   = NULL,
        uploaded_at   = now()
      RETURNING id, uploaded_at
    `)) as unknown as { id: number; uploaded_at: string }[];

    // The team hears about it without anyone watching a screen. Fire and
    // forget: an alerting outage must not fail the upload.
    notifyDocumentUpload({
      userId: user.id,
      name: user.name,
      phone: user.phone,
      docType,
    }).catch(() => {});

    return NextResponse.json(
      {
        ok: true,
        document: {
          id: rows[0]?.id,
          docType,
          name: safeDisplayName(file.name),
          mime: format.mime,
          size: buffer.length,
          status: "uploaded",
          note: null,
          uploadedAt: rows[0]?.uploaded_at,
        },
      },
      { headers: rateLimitHeaders(limit, LIMIT) },
    );
  } catch (error) {
    logError(error, { route: "/api/documents:POST", request });
    return NextResponse.json({ error: "Could not save that document." }, { status: 500 });
  }
}
