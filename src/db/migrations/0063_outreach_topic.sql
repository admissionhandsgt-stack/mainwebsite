-- What an outreach email offers and what a found site covers (2026-11-13). Raw SQL, not in schema.ts.
-- outreach_emails.topic: the data angle the first email used (lib/outreachAngles.ts: trend, seats, colleges, fees,
-- stipend), so a follow-up offers another. outreach_sources.topic: what the site writes about, judged when it is found
-- (lib/hunt.ts findNewSites), so its first email leads with the angle that fits.
ALTER TABLE outreach_emails ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE outreach_sources ADD COLUMN IF NOT EXISTS topic text;
