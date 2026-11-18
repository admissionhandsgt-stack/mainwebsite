-- What every sitemap page says, as a hash, and the moment it last changed (2026-11-18, owner: "agar ek word bhi change
-- hota hai page par to wo recrawl ho… bot add kar raha hai kuch bhi tb bhi… perfect timing ke sath"). lib/pageWatch.ts
-- renders each page from the app itself, hashes its <main> (lib/pageFingerprint.ts) and, when the hash moves (confirmed
-- by a second render), sets changed_at = now(): the sitemap's lastmod, the page's "Updated … IST" line and its JSON-LD
-- dateModified take that time, IndexNow and Google are told, and the edge stops serving the older copy.
-- A page seen for the first time is a baseline (changed_at NULL), never a change. Raw SQL, not in schema.ts.
CREATE TABLE IF NOT EXISTS page_fingerprints (
  path            text PRIMARY KEY,
  hash            text NOT NULL,
  chars           integer NOT NULL DEFAULT 0,
  status          integer NOT NULL DEFAULT 200,
  first_seen      timestamptz NOT NULL DEFAULT now(),
  checked_at      timestamptz,
  changed_at      timestamptz,
  changes         integer NOT NULL DEFAULT 0,
  -- A page whose two renders a second apart differ: not recorded as a change, counted so it can be fixed.
  unstable_at     timestamptz,
  unstable_count  integer NOT NULL DEFAULT 0,
  -- Set by queueCheck(): checked first by the next sweep, whatever its tier's interval.
  due             boolean NOT NULL DEFAULT false,
  -- When the engines were told: after the sitemap and the page's "Updated" time were rebuilt. The edge drops every copy
  -- stored before GREATEST(changed_at, announced_at).
  announced_at    timestamptz
);
ALTER TABLE page_fingerprints ADD COLUMN IF NOT EXISTS announced_at timestamptz;
CREATE INDEX IF NOT EXISTS page_fingerprints_changed ON page_fingerprints (changed_at DESC) WHERE changed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS page_fingerprints_due ON page_fingerprints (path) WHERE due;

-- Each change, for review (Admin → Search research shows the latest). Kept 120 days.
CREATE TABLE IF NOT EXISTS page_change_log (
  id           bigserial PRIMARY KEY,
  path         text NOT NULL,
  at           timestamptz NOT NULL DEFAULT now(),
  source       text NOT NULL,
  chars_before integer,
  chars_after  integer
);
CREATE INDEX IF NOT EXISTS page_change_log_at ON page_change_log (at DESC);
