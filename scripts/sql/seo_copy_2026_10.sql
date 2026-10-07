-- Search titles and descriptions, 2026-10-07.
--
-- page_seo wins over a page's own defaults, so this is where a title change
-- has to land. Each UPDATE is guarded on the value it replaces: if somebody has
-- since changed it in Admin -> Search & sharing, their version stays. Safe to
-- re-run; a second run changes nothing.
--
-- What changed and why:
--  * Titles lead with the phrase people type ("NEET counselling 2026", "MBBS
--    colleges in India") instead of "Experts" or the brand.
--  * /md-ms-india's description was 190 characters; Google cuts at ~155.
--  * Descriptions that were blank fell through to code copy saying
--    "counseling" and "expert advice"; these say what is on the page.
--  * The numbers are the database's own: 2.7 lakh closing ranks (274,483),
--    2.3 lakh PG (230,484), 2,168 PG colleges.
--
-- Run: ora_psql < scripts/sql/seo_copy_2026_10.sql   (see scripts/lib/servers.sh)

BEGIN;

UPDATE page_seo SET title = $$NEET Counselling 2026 for MBBS & MD/MS | AdmissionHands$$, updated_at = now()
 WHERE route = '/' AND title IS NOT DISTINCT FROM $$MBBS & MD/MS Admission Experts | AdmissionHands$$;
UPDATE page_seo SET description = $$NEET UG and PG counselling built on 2.7 lakh published closing ranks. Free college predictor, cutoffs and fees, then a counsellor to order your choices.$$, updated_at = now()
 WHERE route = '/' AND description IS NOT DISTINCT FROM $$Expert guidance for MBBS, MD/MS admissions in top medical colleges. AIQ, State & Deemed counselling with real seat, fee & cutoff insights.$$;

UPDATE page_seo SET title = $$MBBS Admission in India 2026: NEET Cutoff, Fees & Counselling$$, updated_at = now()
 WHERE route = '/mbbs-india' AND title IS NOT DISTINCT FROM $$MBBS Admission in India 2026 | AdmissionHands$$;
UPDATE page_seo SET description = $$MBBS admission after NEET UG 2026: All India and state quota, government, private and deemed colleges, fees, documents and every counselling round.$$, updated_at = now()
 WHERE route = '/mbbs-india' AND description IS NULL;

UPDATE page_seo SET title = $$MBBS Colleges in India 2026: State-wise List with Cutoffs$$, updated_at = now()
 WHERE route = '/mbbs-india/colleges' AND title IS NOT DISTINCT FROM $$MBBS Colleges in India 2026 | AdmissionHands$$;
UPDATE page_seo SET description = $$Every MBBS college in India, state by state, each linked to its NEET UG closing ranks by quota and category. See which ones your rank reaches.$$, updated_at = now()
 WHERE route = '/mbbs-india/colleges' AND description IS NULL;

UPDATE page_seo SET description = $$NEET PG counselling for MD/MS, built on 2.3 lakh published closing ranks across 2,168 colleges. College predictor, round-by-round movement, choice filling.$$, updated_at = now()
 WHERE route = '/md-ms-india' AND length(description) > 160 AND description LIKE 'MD/MS admissions in India, checked against%';

UPDATE page_seo SET title = $$PG Medical Colleges in India: MD/MS Seats, Cutoffs & Fees$$, updated_at = now()
 WHERE route = '/md-ms-india/colleges' AND title IS NOT DISTINCT FROM $$MD/MS Colleges in India | AdmissionHands$$;

UPDATE page_seo SET title = $$NRI Quota MBBS & MD/MS Admission 2026: Eligibility & Fees$$, updated_at = now()
 WHERE route = '/nri-quota' AND title IS NOT DISTINCT FROM $$NRI Quota Medical Admissions - AdmissionHands$$;

UPDATE page_seo SET title = $$NEET UG Counselling 2026: MCC & State Process, Step by Step$$, updated_at = now()
 WHERE route = '/neet-ug-process' AND title IS NOT DISTINCT FROM $$NEET UG Counselling Process 2026 | AdmissionHands$$;
UPDATE page_seo SET description = $$How NEET UG counselling works: MCC All India rounds, your state rounds, registration, choice filling, allotment and reporting, in the order they happen.$$, updated_at = now()
 WHERE route = '/neet-ug-process' AND description IS NULL;

UPDATE page_seo SET title = $$NEET Counselling Services for MBBS & MD/MS | AdmissionHands$$, updated_at = now()
 WHERE route = '/services' AND title IS NOT DISTINCT FROM $$NEET Counselling Services | AdmissionHands$$;

-- The two state slugs with "&" in them. The page redirects the old address.
UPDATE mbbs_states SET slug = replace(slug, '&', 'and'), updated_at = now() WHERE slug LIKE '%&%';

COMMIT;

SELECT route, title FROM page_seo WHERE updated_at > now() - interval '1 minute' ORDER BY route;
SELECT slug FROM mbbs_states WHERE slug LIKE '%-and-%';
