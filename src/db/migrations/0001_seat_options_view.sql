-- Seat options — one row per seat a candidate can actually compete for.
--
-- closing_ranks holds one row per round, so answering "can I get this seat?"
-- from it means aggregating 230k rows on every request. This view collapses
-- it once into the shape the predictor asks for: where the cut opened, where
-- it closed, how far it has ever gone, and which way it moved year on year.
--
-- Refresh after every import:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY seat_options;

CREATE MATERIALIZED VIEW IF NOT EXISTS seat_options AS
WITH per_year AS (
    SELECT
        cr.level,
        cr.institute_id,
        cr.course_id,
        cr.quota_id,
        cr.category_id,
        cr.counselling_id,
        cr.year,
        -- The cut as it stood in the first and last published round of that year.
        -- A rank inside the first-round cut would have been allotted immediately;
        -- one inside the last-round cut only came through after movement.
        (array_agg(cr.closing_rank ORDER BY cr.round ASC  NULLS LAST))[1] AS first_round_rank,
        (array_agg(cr.closing_rank ORDER BY cr.round DESC NULLS LAST))[1] AS last_round_rank,
        MAX(cr.closing_rank)   AS max_rank,
        MIN(cr.closing_rank)   AS min_rank,
        SUM(cr.seats_allotted) AS seats,
        MAX(cr.fee_inr)        AS fee_inr,
        MAX(cr.bond_years)     AS bond_years,
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

    -- Latest year, then the year before it, so movement is expressible.
    (array_agg(first_round_rank ORDER BY year DESC))[1] AS r1_latest,
    (array_agg(last_round_rank  ORDER BY year DESC))[1] AS last_latest,
    (array_agg(last_round_rank  ORDER BY year DESC))[2] AS last_previous,

    -- The widest the cut has ever gone. A rank past this has no precedent.
    MAX(max_rank) AS furthest_ever,
    MIN(min_rank) AS best_ever,

    (array_agg(seats ORDER BY year DESC))[1] AS seats_latest,
    MAX(fee_inr)    AS fee_inr,
    MAX(bond_years) AS bond_years,
    bool_or(low_confidence) AS low_confidence,
    COUNT(*)::int   AS years_of_data
FROM per_year
GROUP BY level, institute_id, course_id, quota_id, category_id, counselling_id;

-- CONCURRENTLY refresh needs a unique index.
CREATE UNIQUE INDEX IF NOT EXISTS seat_options_pk_idx
    ON seat_options (level, institute_id, course_id, quota_id, category_id, counselling_id);

-- The predictor's own access path: everything reachable at a given rank,
-- for one category and level, ordered by how safe it is.
CREATE INDEX IF NOT EXISTS seat_options_predict_idx
    ON seat_options (level, category_id, last_latest);

CREATE INDEX IF NOT EXISTS seat_options_institute_idx
    ON seat_options (institute_id, course_id);

CREATE INDEX IF NOT EXISTS seat_options_fee_idx
    ON seat_options (level, fee_inr);
