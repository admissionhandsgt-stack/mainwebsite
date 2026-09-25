import { NextResponse } from "next/server";
import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { logError } from "@/lib/logger";
import { requireAdmin } from "@/lib/auth";
import { documentStore } from "@/lib/documents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Remove document files that no row points at.
 *
 * Two ways one appears, neither fixable in the upload path:
 *
 *   1. `student_documents.user_id` is `ON DELETE CASCADE`, so deleting an
 *      account deletes its rows — and the database cannot unlink a file.
 *   2. A process that stops between writing the file and committing the row
 *      cannot run its own cleanup.
 *
 * An orphan is somebody's identity document sitting on disk with nothing left
 * to say whose it is, which is the worst way to keep one. So this exists, and
 * it lives in the app rather than in a script: the standalone build ships no
 * `node_modules` to import a database driver from, so a script on the server
 * cannot reach both the rows and the files. This route reaches both.
 *
 * `GET` reports, `POST` deletes — nobody should discover what it does by
 * running it.
 */

/** A file younger than this may be an upload in flight. */
const GRACE_MS = 60 * 60 * 1000;

async function findOrphans() {
  const store = documentStore();

  let files: string[];
  try {
    files = await readdir(store);
  } catch {
    return { store, total: 0, known: 0, orphans: [] as string[], bytes: 0 };
  }

  const rows = (await db.execute(
    sql`SELECT stored_name FROM student_documents`,
  )) as unknown as { stored_name: string }[];
  const known = new Set(rows.map((r) => r.stored_name));

  const now = Date.now();
  const orphans: string[] = [];
  let bytes = 0;

  for (const f of files) {
    if (known.has(f)) continue;
    const s = await stat(path.join(store, f)).catch(() => null);
    if (!s?.isFile() || now - s.mtimeMs < GRACE_MS) continue;
    orphans.push(f);
    bytes += s.size;
  }

  return { store, total: files.length, known: known.size, orphans, bytes };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const { total, known, orphans, bytes } = await findOrphans();
    return NextResponse.json({ files: total, rows: known, orphans: orphans.length, bytes });
  } catch (error) {
    logError(error, { route: "/api/admin/documents/sweep:GET" });
    return NextResponse.json({ error: "Could not read the store." }, { status: 500 });
  }
}

export async function POST() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const { store, orphans } = await findOrphans();
    let removed = 0;
    for (const f of orphans) {
      await unlink(path.join(store, f)).then(
        () => {
          removed += 1;
        },
        () => {},
      );
    }
    return NextResponse.json({ ok: true, removed, found: orphans.length });
  } catch (error) {
    logError(error, { route: "/api/admin/documents/sweep:POST" });
    return NextResponse.json({ error: "Could not sweep the store." }, { status: 500 });
  }
}
