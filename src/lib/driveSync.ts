/**
 * Pushing one document into the candidate's Drive folder.
 *
 * Separate from `googleDrive.ts` because that file knows only about Drive;
 * this one knows about our rows. Keeping the split means the Drive client can
 * be tested, replaced or pointed at a Shared Drive without touching anything
 * that understands a candidate.
 *
 * **Never throws.** Every caller is a fire-and-forget after an upload that has
 * already succeeded. A failure belongs in `drive_error` on the row, where the
 * admin screen can show it and offer to retry — not in the response to a
 * student who has done nothing wrong.
 */

import { readFile } from "node:fs/promises";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { getIntegration, setIntegration } from "@/lib/integrations";
import { logError } from "@/lib/logger";
import { documentType } from "@/lib/documentCatalogue";
import { resolveStoredPath } from "@/lib/documents";
import {
  ROOT_FOLDER_NAME,
  candidateFolderName,
  driveEnabled,
  ensureFolder,
  uploadFile,
} from "@/lib/googleDrive";

/** The shared root, remembered so it is not searched for on every upload. */
async function rootFolder(): Promise<string> {
  const saved = await getIntegration("google.drive.root_folder_id");
  if (saved) return saved;
  const id = await ensureFolder(ROOT_FOLDER_NAME);
  await setIntegration("google.drive.root_folder_id", id);
  return id;
}

/**
 * The candidate's own folder, created on first upload.
 *
 * The id is stored on the user so this costs nothing after the first time. If
 * somebody deletes the folder in Drive, `ensureFolder` recreates it — the
 * stored id is a cache, not a claim.
 */
async function candidateFolder(userId: number): Promise<string> {
  const rows = (await db.execute(sql`
    SELECT drive_folder_id, name, phone, level::text AS level, rank
      FROM users WHERE id = ${userId} LIMIT 1
  `)) as unknown as Record<string, unknown>[];

  const user = rows[0];
  if (!user) throw new Error(`No user ${userId}`);
  if (user.drive_folder_id) return user.drive_folder_id as string;

  const id = await ensureFolder(
    candidateFolderName({
      name: (user.name as string) ?? null,
      phone: user.phone as string,
      level: (user.level as string) ?? null,
      rank: (user.rank as number) ?? null,
    }),
    await rootFolder(),
  );

  await db.execute(sql`UPDATE users SET drive_folder_id = ${id} WHERE id = ${userId}`);
  return id;
}

/**
 * The filename inside Drive.
 *
 * The document's own label, not what the student called it — so the folder
 * reads as the counselling checklist rather than as "IMG_20260925_114233.jpg"
 * fourteen times over.
 */
function driveFileName(docType: string, storedName: string): string {
  const label = documentType(docType)?.label ?? docType;
  const ext = storedName.split(".").pop() ?? "bin";
  return `${label}.${ext}`;
}

/** Mirrors one document. Records the outcome on the row either way. */
export async function syncDocument(documentId: number): Promise<void> {
  try {
    if (!(await driveEnabled())) return;

    const rows = (await db.execute(sql`
      SELECT id, user_id, doc_type, stored_name, mime_type, drive_file_id
        FROM student_documents WHERE id = ${documentId} LIMIT 1
    `)) as unknown as Record<string, unknown>[];

    const doc = rows[0];
    if (!doc) return;

    const full = resolveStoredPath(doc.stored_name as string);
    if (!full) throw new Error("Stored file could not be resolved.");
    const body = await readFile(full);

    const uploaded = await uploadFile({
      name: driveFileName(doc.doc_type as string, doc.stored_name as string),
      mimeType: doc.mime_type as string,
      body,
      parentId: await candidateFolder(doc.user_id as number),
      existingId: (doc.drive_file_id as string) ?? null,
    });

    await db.execute(sql`
      UPDATE student_documents
         SET drive_file_id = ${uploaded.id}, drive_synced_at = now(), drive_error = NULL
       WHERE id = ${documentId}
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(error, { route: "driveSync" });
    // Best effort: if even this write fails there is nothing useful left to do.
    await db
      .execute(sql`
        UPDATE student_documents SET drive_error = ${message.slice(0, 400)} WHERE id = ${documentId}
      `)
      .catch(() => {});
  }
}

/**
 * Retries everything that has not made it across.
 *
 * Sequential on purpose. This runs after an outage, when the backlog is
 * exactly the moment Drive is least likely to want a burst of parallel
 * uploads, and nobody is waiting on it.
 */
export async function syncBacklog(limit = 50): Promise<{ attempted: number; synced: number }> {
  if (!(await driveEnabled())) return { attempted: 0, synced: 0 };

  const rows = (await db.execute(sql`
    SELECT id FROM student_documents
     WHERE drive_file_id IS NULL
     ORDER BY uploaded_at ASC
     LIMIT ${limit}
  `)) as unknown as { id: number }[];

  for (const r of rows) await syncDocument(r.id);

  const after = (await db.execute(sql`
    SELECT count(*)::int AS n FROM student_documents
     WHERE id IN ${rows.length ? sql`(${sql.join(rows.map((r) => sql`${r.id}`), sql`, `)})` : sql`(NULL)`}
       AND drive_file_id IS NOT NULL
  `)) as unknown as { n: number }[];

  return { attempted: rows.length, synced: after[0]?.n ?? 0 };
}
