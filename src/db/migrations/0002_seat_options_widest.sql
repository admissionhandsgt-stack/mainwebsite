-- Fix: the last round's closing rank is not the widest the cut reached.
--
-- In later rounds — especially mop-up and stray — seats freed by upgrades are
-- taken by much better ranks, so the final round's closing rank can be far
-- BETTER than round 2's. Real example, Bangalore Medical College, MD Anatomy,
-- general, 2025:
--
--     R1  39,431   →   R2  74,529   →   R3  8,550
--
-- Reading R3 as "where the cut ended" understates that seat by 66,000 ranks.
-- It happens on 7.4% of seats, and always in the direction that hides options
-- from the candidate.
--
-- So the band boundary becomes the WIDEST rank the cut reached in that year,
-- which is what "could this rank have been allotted" actually depends on.
-- r1 stays as-is: round 1 is the only round whose meaning is unambiguous.

DROP MATERIALIZED VIEW IF EXISTS seat_options;

CREATE MATERIALIZED VIEW seat_options AS
WITH per_year AS (
    SELECT
        cr.level,
        cr.institute_id,
        cr.course_id,
        cr.quota_id,
        cr.category_id,
        cr.counselling_id,
        cr.year,
        -- Round 1 only. 'R1.5' and the R0 pre-rounds are deliberately excluded:
        -- they are not the round a candidate is first considered in.
        MAX(cr.closing_rank) FILTER (WHERE cr.round_label = 'R1') AS r1_rank,
        -- How far down the list this seat actually went, anywhere in the year.
        MAX(cr.closing_rank) AS widest_rank,
        MIN(cr.closing_rank) AS best_rank,
        SUM(cr.seats_allotted) AS seats,
        COUNT(*)::int AS rounds_published,
        MAX(cr.fee_inr) AS fee_inr,
        MAX(cr.bond_years) AS bond_years,
        bool_or(cr.low_confidence) AS low_confidence
    FROM closing_ranks cr
    WHERE cr.closing_rank IS NOT NULL
    GROUP BY cr.level, cr.institute_id, cr.course_id, cr.quota_id,
             cr.category_id, cr.counselling_id, cr.year
)
SELECT
    level,
    institute_id,
    course_id,
    quota_id,
    category_id,
    counselling_id,
    MAX(year) AS latest_year,

    (array_agg(r1_rank      ORDER BY year DESC))[1] AS r1_latest,
    (array_agg(widest_rank  ORDER BY year DESC))[1] AS widest_latest,
    (array_agg(widest_rank  ORDER BY year DESC))[2] AS widest_previous,
    (array_agg(seats        ORDER BY year DESC))[1] AS seats_latest,
    (array_agg(rounds_published ORDER BY year DESC))[1] AS rounds_latest,

    MAX(widest_rank) AS furthest_ever,
    MIN(best_rank)   AS best_ever,

    MAX(fee_inr)     AS fee_inr,
    MAX(bond_years)  AS bond_years,
    bool_or(low_confidence) AS low_confidence,
    COUNT(*)::int    AS years_of_data
FROM per_year
GROUP BY level, institute_id, course_id, quota_id, category_id, counselling_id;

CREATE UNIQUE INDEX seat_options_pk_idx
    ON seat_options (level, institute_id, course_id, quota_id, category_id, counselling_id);

CREATE INDEX seat_options_predict_idx
    ON seat_options (level, category_id, widest_latest);

CREATE INDEX seat_options_institute_idx
    ON seat_options (institute_id, course_id);

CREATE INDEX seat_options_fee_idx
    ON seat_options (level, fee_inr);
