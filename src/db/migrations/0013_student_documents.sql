-- The counselling document vault.
--
-- Candidates have to produce fourteen documents at reporting, and the team
-- currently collects them over WhatsApp, where they are mixed into chat
-- history and impossible to audit. This gives each signed-in student a
-- checklist they can fill in, and the team one place to look.
--
-- **These are identity documents.** A photo ID, a marksheet and a category
-- certificate are together enough to impersonate somebody. Three consequences
-- are designed in rather than added later:
--
--   1. **Nothing is stored under `public/`.** The existing image uploads are
--      static assets served by URL; these are not. The bytes live outside the
--      web root entirely and are only ever streamed by a route that checks the
--      session first. There is no URL that works without one.
--   2. **The stored name is generated.** `stored_name` is random, so the path
--      cannot be guessed and the browser's filename — which is
--      attacker-controlled — never reaches the filesystem. `original_name` is
--      kept only to show the student what they uploaded.
--   3. **Deleting the row deletes the file.** The API unlinks on delete and on
--      replace, so "remove" means removed, not hidden.
--
-- Retention is a policy question this schema cannot answer: `uploaded_at` is
-- here so a sweep can be written once the team decides how long they should
-- keep a student's certificates after the season ends.

DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('uploaded', 'verified', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS student_documents (
    id              serial PRIMARY KEY,

    user_id         integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Which of the fourteen this is. A slug from the catalogue in
    -- `src/lib/documents.ts`, not free text, so the checklist can be rendered
    -- and a missing document can be named.
    doc_type        varchar(48) NOT NULL,

    -- What the student called it. Display only — never used as a path.
    original_name   text NOT NULL,
    -- What we called it. Random, with the extension the magic bytes proved.
    stored_name     varchar(96) NOT NULL,

    mime_type       varchar(96) NOT NULL,
    size_bytes      integer NOT NULL,

    status          document_status NOT NULL DEFAULT 'uploaded',
    -- Why it was rejected, shown to the student so they can fix it.
    admin_note      text,
    reviewed_at     timestamptz,

    uploaded_at     timestamptz NOT NULL DEFAULT now()
);

-- One document per type per student: uploading again replaces, which is what
-- somebody correcting a blurry scan expects. A partial index is not needed
-- because the API deletes the old row rather than keeping versions.
CREATE UNIQUE INDEX IF NOT EXISTS student_documents_unique_idx
    ON student_documents (user_id, doc_type);

CREATE INDEX IF NOT EXISTS student_documents_user_idx
    ON student_documents (user_id, uploaded_at DESC);

-- The admin list is "newest first, across everybody".
CREATE INDEX IF NOT EXISTS student_documents_recent_idx
    ON student_documents (uploaded_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS student_documents_stored_idx
    ON student_documents (stored_name);
