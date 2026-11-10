-- Daily hunt (2026-11-10, owner: "daily hunt karke de do details… admin open karke same url par jake… answer/blog create
-- karke doge wo manually post kardunga"). The questions people search on Google that land on this site (Search Console),
-- each with an answer written from the page's own figures and links to find the same question on Quora, Reddit and
-- Google. The owner posts by hand from his own account and records where; nothing is posted by the site.

CREATE TABLE IF NOT EXISTS hunt_items (
  id           serial PRIMARY KEY,
  query        text NOT NULL,                 -- the search, as Google reported it
  impressions  integer NOT NULL DEFAULT 0,    -- over the last 7 days
  page         text NOT NULL,                 -- our page that answers it (path)
  answer       text NOT NULL,                 -- the draft to paste
  status       text NOT NULL DEFAULT 'new',   -- new | posted | dismissed
  posted_url   text,                          -- where the owner posted it
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- A question comes back at most once: the same words are never offered twice.
CREATE UNIQUE INDEX IF NOT EXISTS hunt_items_query ON hunt_items (lower(query));
CREATE INDEX IF NOT EXISTS hunt_items_status ON hunt_items (status, created_at DESC);

-- Websites to look for contact emails on (same day, owner: "email dhunde unko target karke email bheje automatic ye
-- manually add na krna pade"). Weekly, lib/outreachDiscover.ts reads each site's own contact/about pages (robots.txt
-- respected) and adds the organisation's published address as a draft — which still waits for the owner's Send.
CREATE TABLE IF NOT EXISTS outreach_sources (
  id               serial PRIMARY KEY,
  url              text NOT NULL,                 -- the site's home page, https only
  org              text NOT NULL,
  kind             text NOT NULL,                 -- journalist | association | other
  last_crawled_at  timestamptz,
  found            integer NOT NULL DEFAULT 0,    -- addresses added from it, ever
  last_note        text,                          -- what the last look found or why it found nothing
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS outreach_sources_url ON outreach_sources (lower(url));
