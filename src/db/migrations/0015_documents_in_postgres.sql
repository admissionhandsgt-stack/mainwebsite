-- Keep the document bytes in Postgres, and drop the Google Drive mirror.
--
-- ## Why the bytes move into the database
--
-- Because the backup already covers it. `pg-backup.timer` dumps this database
-- every night to /var/backups/postgres/admissionhands/. The upload directory on
-- disk was covered by nothing at all — so a lost disk meant every candidate's
-- certificates were gone while the rows describing them survived, which is the
-- worst of both. One store means one backup, and it is the one that already
-- exists and is already tested.
--
-- Three smaller things follow from it, each of which was a thing to get wrong:
--
--   * A row and its file can no longer disagree. The write is one statement, so
--     there is no window where a file exists with no row (an orphan holding
--     somebody's identity document with nothing to say whose) or a row exists
--     with no file. The orphan sweep this needed is deleted with this change.
--   * Nothing is stored in a path, so there is no path to traverse, no stored
--     filename to sanitise and no directory to accidentally serve statically.
--   * Deploys stop mattering. Releases are timestamped directories; anything
--     written inside one is lost at the next deploy, which is a hazard that has
--     to be remembered every time somebody adds a write.
--
-- ## What it costs
--
-- Size. A candidate with fourteen documents is a few megabytes, so a thousand
-- candidates is a few gigabytes that the nightly dump now has to carry. That is
-- the trade being made deliberately: a slower backup is a problem you can see
-- and plan for, and an unbacked-up directory is one you find out about once.
--
-- `bytea` tops out at 1 GB and the upload route caps a file at 15 MB, so the
-- column is never close to its limit. Postgres TOASTs and compresses anything
-- this size out of line automatically, so the main table stays small and a
-- query that does not select `content` does not read it.
--
-- ## Drive
--
-- Removed. It was a mirror for the team's convenience and it brought a Google
-- Cloud project, an OAuth consent screen, a refresh token that expires if the
-- consent screen is left in Testing, and a second copy of every identity
-- document living somewhere with its own sharing rules. The admin screen shows
-- the same documents, and one copy in one place with one backup is the thing
-- that is actually easy to reason about.

-- Empty in production at the time of writing, so there is nothing to migrate.
ALTER TABLE student_documents
    ADD COLUMN IF NOT EXISTS content bytea;

DELETE FROM student_documents WHERE content IS NULL;

ALTER TABLE student_documents
    ALTER COLUMN content SET NOT NULL;

-- `stored_name` existed to name a file on disk. There is no file.
DROP INDEX IF EXISTS student_documents_stored_idx;
ALTER TABLE student_documents DROP COLUMN IF EXISTS stored_name;

-- The Drive mirror.
DROP INDEX IF EXISTS student_documents_unsynced_idx;
ALTER TABLE student_documents
    DROP COLUMN IF EXISTS drive_file_id,
    DROP COLUMN IF EXISTS drive_synced_at,
    DROP COLUMN IF EXISTS drive_error;

ALTER TABLE users DROP COLUMN IF EXISTS drive_folder_id;

DELETE FROM integrations WHERE key LIKE 'google.drive.%';

-- The admin list and the student's own list never need the bytes, so keep them
-- off those paths: selecting the named columns leaves `content` in TOAST
-- storage untouched.
COMMENT ON COLUMN student_documents.content IS
    'The file itself. Never select this unless you are streaming one document.';
