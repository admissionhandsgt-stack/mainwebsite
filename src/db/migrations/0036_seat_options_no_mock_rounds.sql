-- seat_options without mock allotments (2026-10-18).
--
-- The 2024 Karnataka PG data (KEA, and its "Open States" private seats) carries rounds labelled
-- R0, R0.1 and R0.2 — 8,060 rows, all before round 1. KEA publishes a mock allotment before
-- every round 1 (2022, 2023 and 2025 reported; 2024's are these rows): a preview of how options
-- would be allotted, after which candidates change their choices. Nobody was admitted on it.
--
-- The view counted them as real rounds: 95 seats had a mock round as the widest cut of their
-- year, and 39 seat-years existed only in mock rounds. They stay in closing_ranks as published;
-- the view, and every "after round 1" comparison (lib/roundQueries.ts), leave them out.
--
-- Same columns, same indexes, one transaction — readers wait a few seconds, nothing breaks.
--   node scripts/apply_migration.mjs src/db/migrations/0036_seat_options_no_mock_rounds.sql

BEGIN;

DROP MATERIALIZED VIEW seat_options;

CREATE MATERIALIZED VIEW seat_options AS
 WITH per_year AS (
         SELECT cr.level,
            cr.institute_id,
            cr.course_id,
            cr.quota_id,
            cr.category_id,
            cr.counselling_id,
            cr.year,
            max(cr.closing_rank) FILTER (WHERE cr.round_label::text = 'R1'::text) AS r1_rank,
            max(cr.closing_rank) AS widest_rank,
            min(cr.closing_rank) AS best_rank,
            sum(cr.seats_allotted) AS seats,
            count(*)::integer AS rounds_published,
            max(cr.fee_inr) AS fee_inr,
            max(cr.bond_years) AS bond_years,
            bool_or(cr.low_confidence) AS low_confidence
           FROM closing_ranks cr
          WHERE cr.closing_rank IS NOT NULL
            -- Mock allotments (R0, R0.1, R0.2) are previews, not allotments.
            AND cr.round_label::text NOT LIKE 'R0%'
          GROUP BY cr.level, cr.institute_id, cr.course_id, cr.quota_id, cr.category_id, cr.counselling_id, cr.year
        )
 SELECT level,
    institute_id,
    course_id,
    quota_id,
    category_id,
    counselling_id,
    max(year) AS latest_year,
    (array_agg(r1_rank ORDER BY year DESC))[1] AS r1_latest,
    (array_agg(widest_rank ORDER BY year DESC))[1] AS widest_latest,
    (array_agg(widest_rank ORDER BY year DESC))[2] AS widest_previous,
    (array_agg(seats ORDER BY year DESC))[1] AS seats_latest,
    (array_agg(rounds_published ORDER BY year DESC))[1] AS rounds_latest,
    max(widest_rank) AS furthest_ever,
    min(best_rank) AS best_ever,
    max(fee_inr) AS fee_inr,
    max(bond_years) AS bond_years,
    bool_or(low_confidence) AS low_confidence,
    count(*)::integer AS years_of_data
   FROM per_year
  GROUP BY level, institute_id, course_id, quota_id, category_id, counselling_id;

CREATE UNIQUE INDEX seat_options_pk_idx ON public.seat_options USING btree (level, institute_id, course_id, quota_id, category_id, counselling_id);
CREATE INDEX seat_options_fee_idx ON public.seat_options USING btree (level, fee_inr);
CREATE INDEX seat_options_institute_idx ON public.seat_options USING btree (institute_id, course_id);
CREATE INDEX seat_options_predict_idx ON public.seat_options USING btree (level, category_id, widest_latest);

COMMIT;
