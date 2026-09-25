-- Mirroring the document vault into Google Drive.
--
-- The team wants a folder per candidate they can open on a phone, or share one
-- file from with a college, without going through the admin screen. Drive is
-- where they already work.
--
-- **A mirror, not a move.** The bytes stay on our disk and that copy stays the
-- one the site serves. Three reasons, and the first is the one that matters:
--
--   1. If Drive were the only copy, an upload during a Drive outage, an expired
--      token or a full quota would mean a student's certificate is simply lost.
--      Local-first means Drive can fail and nobody notices but us.
--   2. The permission model — session-checked streaming, 404 for strangers —
--      is ours. Reproducing it with Drive ACLs per candidate is a much larger
--      surface to get wrong, and "anyone with the link" is not an option for a
--      photo ID.
--   3. Drive is reachable by anyone the account is shared with. Our copy is
--      reachable by the candidate and signed-in staff. Those are different
--      guarantees and the stricter one should be the one the product depends on.
--
-- So sync is allowed to fail. `drive_error` records why, `drive_synced_at`
-- records when it last worked, and a null `drive_file_id` simply means this
-- one has not made it across yet.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS drive_folder_id varchar(128);

ALTER TABLE student_documents
    ADD COLUMN IF NOT EXISTS drive_file_id varchar(128),
    ADD COLUMN IF NOT EXISTS drive_synced_at timestamptz,
    ADD COLUMN IF NOT EXISTS drive_error text;

-- The retry sweep asks "what has not synced?", which is the only query that
-- needs an index here.
CREATE INDEX IF NOT EXISTS student_documents_unsynced_idx
    ON student_documents (uploaded_at)
    WHERE drive_file_id IS NULL;
