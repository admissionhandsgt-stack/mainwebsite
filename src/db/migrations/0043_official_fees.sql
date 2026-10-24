-- Official fees beside imported ones (2026-10-25).
--
-- The owner's rule: a college's fee is what the college's own notice says for the year (government
-- colleges: the CET Cell's brochure; deemed universities: the university's notice) — never FRA's figure,
-- never a compiled listing. scripts/apply_official_fees.mjs writes those figures into `fees` and names
-- the notice in `fee_source`; a row with no fee_source is still as imported.
--
-- seat_options took its fee from the cutoff rows (closing_ranks.fee_inr, the largest across years), so
-- an updated fee never reached the predictor or the quota pages, and a fee that went down never showed.
-- Now a fee with a source wins; everything else is as before. Same columns in the same order, same
-- indexes, one transaction — readers wait a few seconds.
--   node scripts/apply_migration.mjs src/db/migrations/0043_official_fees.sql

BEGIN;

ALTER TABLE fees ADD COLUMN IF NOT EXISTS fee_source text;

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
        ), seats AS (
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
          GROUP BY level, institute_id, course_id, quota_id, category_id, counselling_id
        ), official AS (
         -- One official fee per institute × course × quota (the highest, should a notice give two).
         SELECT DISTINCT ON (f.level, f.institute_id, f.course_id, f.quota_id)
            f.level, f.institute_id, f.course_id, f.quota_id, f.fee_inr
           FROM fees f
          WHERE f.fee_source IS NOT NULL AND f.fee_inr > 0
          ORDER BY f.level, f.institute_id, f.course_id, f.quota_id, f.fee_inr DESC
        )
 SELECT s.level,
    s.institute_id,
    s.course_id,
    s.quota_id,
    s.category_id,
    s.counselling_id,
    s.latest_year,
    s.r1_latest,
    s.widest_latest,
    s.widest_previous,
    s.seats_latest,
    s.rounds_latest,
    s.furthest_ever,
    s.best_ever,
    COALESCE(o.fee_inr, s.fee_inr) AS fee_inr,
    s.bond_years,
    s.low_confidence,
    s.years_of_data
   FROM seats s
     LEFT JOIN official o ON o.level = s.level AND o.institute_id = s.institute_id AND o.course_id = s.course_id AND o.quota_id = s.quota_id;

CREATE UNIQUE INDEX seat_options_pk_idx ON public.seat_options USING btree (level, institute_id, course_id, quota_id, category_id, counselling_id);
CREATE INDEX seat_options_fee_idx ON public.seat_options USING btree (level, fee_inr);
CREATE INDEX seat_options_institute_idx ON public.seat_options USING btree (institute_id, course_id);
CREATE INDEX seat_options_predict_idx ON public.seat_options USING btree (level, category_id, widest_latest);

COMMIT;
