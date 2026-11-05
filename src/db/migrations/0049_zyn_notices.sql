-- Counselling notices approved by the owner in Zyn's Telegram flow, taken by the website (2026-11-05).
-- One row per Zyn notice: what came in, whether it went on the alerts bar, and whether it changed a round's dates.
-- Raw SQL, not in schema.ts (read and written by lib/zynNotices.ts with sql templates).

CREATE TABLE IF NOT EXISTS zyn_notices (
  id               text PRIMARY KEY,               -- Zyn's own id
  title            text NOT NULL,
  url              text,
  authority        text,
  state            text,
  kind             text,                           -- schedule | result | registration | choice_filling | seat_matrix | notice | other
  round            text,
  approved_at      timestamptz,
  payload          jsonb NOT NULL,                 -- the record as Zyn sent it
  status           text NOT NULL,                  -- published | held | dismissed
  reason           text,                           -- why it was held
  schedule_status  text,                           -- applied | held | null (not a schedule notice)
  schedule_reason  text,
  alert_id         integer,
  received_at      timestamptz NOT NULL DEFAULT now(),
  decided_at       timestamptz
);

CREATE INDEX IF NOT EXISTS zyn_notices_received ON zyn_notices (received_at DESC);
CREATE INDEX IF NOT EXISTS zyn_notices_status ON zyn_notices (status);
