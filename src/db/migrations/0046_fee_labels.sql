-- What a fee figure is, and for what period (2026-11-04).
--
-- The owner (4 Nov, through zyn-c9's verified 2026-27 fee file): "jaha par tution fees hai sirf tution
-- fees hi mention ho, fees mention na ho". So a fee row now says what it is:
--   fee_label       "Tuition fee" — tuition alone, nothing else added in; or "Fee (as printed) - …" — the
--                   notice's own figure, which prints no tuition alone (KEA's inclusive NRI/Others fee,
--                   KAHER's "Year Fee", VMRF's "Annual fee"…). NULL on a row no labelled pass has reached.
--   fee_currency    INR or USD — the currency the college itself charges; a rupee view of a dollar fee
--                   is approximate.
--   fee_components  what the notice itemises beside the figure (development, other fee, RGUHS fees),
--                   never added into it.
-- and fee_periodicity carries "per year", "first year", "whole course" or "not stated".
--
-- seat_options.fee_inr feeds every per-year bracket and median (predictor, quota pages, fee hubs,
-- branch × state pages). A whole-course or period-not-stated figure is not a year's fee, so an official
-- row with one — or an official row blanked "no seat" / "no tuition" — now gives the seat no fee, where
-- before it fell back to the old listing's figure (58 seats on 2026-11-04). Rows with no official fee
-- are as before. Same columns, same order, same indexes, one transaction.
--   node scripts/apply_migration.mjs src/db/migrations/0046_fee_labels.sql

BEGIN;

ALTER TABLE fees ADD COLUMN IF NOT EXISTS fee_label text;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS fee_currency text;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS fee_components jsonb;

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
         -- One official row per institute × course × quota. Its fee counts only as a year's fee;
         -- a whole-course, period-not-stated or blanked row gives NULL, never the listing's figure.
         SELECT DISTINCT ON (f.level, f.institute_id, f.course_id, f.quota_id)
            f.level, f.institute_id, f.course_id, f.quota_id,
            CASE WHEN f.fee_inr > 0 AND COALESCE(f.fee_periodicity, 'per year') IN ('per year', 'first year')
                 THEN f.fee_inr END AS fee_inr
           FROM fees f
          WHERE f.fee_source IS NOT NULL
          ORDER BY f.level, f.institute_id, f.course_id, f.quota_id,
                   CASE WHEN f.fee_inr > 0 AND COALESCE(f.fee_periodicity, 'per year') IN ('per year', 'first year')
                        THEN f.fee_inr END DESC NULLS LAST
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
    CASE WHEN o.institute_id IS NOT NULL THEN o.fee_inr ELSE s.fee_inr END AS fee_inr,
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
