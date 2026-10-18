-- Typed figures on the MBBS and MD/MS pages, replaced by live {tokens} (lib/liveFigures.ts).
--
-- "1 lakh+ seats", "380+ government colleges", "55,000+ government seats", "750+ colleges"
-- and "₹10K–₹50K a year" were typed once and had drifted: NMC lists 834 MBBS colleges and
-- 1,40,314 seats (442 government colleges with 63,771). The PG FAQ said most private colleges
-- pay no stipend; the median published private/deemed first-year stipend is over ₹57,000 a
-- month. The page fills each token from NMC's register and the fee tables; the admin keeps
-- the words and can edit them freely — a token is just a number that stays current.
--
-- Every row is guarded on its exact old text, so an admin's edit is never overwritten.
--   node scripts/apply_migration.mjs scripts/sql/live_figures_2026_10_18.sql

-- ---------------------------------------------------------------- MBBS hero stats
UPDATE content_blocks SET subtitle = '{mbbs_seats}', updated_at = now()
 WHERE id = 47 AND collection = 'mbbs_hero_stats' AND title = 'Total MBBS Seats' AND subtitle = '1 lakh+';
UPDATE content_blocks SET subtitle = '{govt_mbbs_colleges}', updated_at = now()
 WHERE id = 48 AND collection = 'mbbs_hero_stats' AND title = 'Govt Colleges' AND subtitle = '380+';
UPDATE content_blocks SET subtitle = '{private_mbbs_colleges}', updated_at = now()
 WHERE id = 49 AND collection = 'mbbs_hero_stats' AND title = 'Private Colleges' AND subtitle = '300+';
UPDATE content_blocks SET subtitle = '{closing_ranks_lakh}', updated_at = now()
 WHERE id = 50 AND collection = 'mbbs_hero_stats' AND title = 'Closing Ranks' AND subtitle = '2.7 Lakh';

-- ---------------------------------------------------------------- MBBS overview
UPDATE content_blocks SET subtitle = '{mbbs_colleges}', body = 'NMC register, {nmc_date}', updated_at = now()
 WHERE id = 54 AND collection = 'mbbs_overview' AND subtitle = '750+' AND body = 'Approx., across India';

-- ---------------------------------------------------------------- MBBS seat distribution
UPDATE content_blocks SET title = '{mbbs_seats}', updated_at = now()
 WHERE id = 94 AND collection = 'mbbs_seats' AND title = '1 lakh+';
UPDATE content_blocks SET title = '{govt_mbbs_seats}', updated_at = now()
 WHERE id = 95 AND collection = 'mbbs_seats' AND title = '55,000+';
UPDATE content_blocks SET title = '{private_mbbs_seats}', updated_at = now()
 WHERE id = 96 AND collection = 'mbbs_seats' AND title = '53,000+';

-- Top states by MBBS seats, from NMC (the typed list had Rajasthan fifth; Telangana is).
UPDATE content_blocks SET title = '{top_state_1}', updated_at = now() WHERE id = 97  AND collection = 'mbbs_top_states' AND title = 'Tamil Nadu';
UPDATE content_blocks SET title = '{top_state_2}', updated_at = now() WHERE id = 98  AND collection = 'mbbs_top_states' AND title = 'Karnataka';
UPDATE content_blocks SET title = '{top_state_3}', updated_at = now() WHERE id = 99  AND collection = 'mbbs_top_states' AND title = 'Maharashtra';
UPDATE content_blocks SET title = '{top_state_4}', updated_at = now() WHERE id = 100 AND collection = 'mbbs_top_states' AND title = 'Uttar Pradesh';
UPDATE content_blocks SET title = '{top_state_5}', updated_at = now() WHERE id = 101 AND collection = 'mbbs_top_states' AND title = 'Rajasthan';

-- ---------------------------------------------------------------- MBBS fee table
UPDATE content_blocks SET title = 'Government colleges', subtitle = '{govt_mbbs_fee} a year', updated_at = now()
 WHERE id = 86 AND collection = 'mbbs_fees' AND subtitle = '₹10K – ₹50K/yr';
UPDATE content_blocks SET title = 'Private colleges', subtitle = '{private_mbbs_fee} a year', updated_at = now()
 WHERE id = 87 AND collection = 'mbbs_fees' AND subtitle = '₹5L – ₹25L/yr';
UPDATE content_blocks SET title = 'Deemed universities', subtitle = '{deemed_mbbs_fee} a year', updated_at = now()
 WHERE id = 88 AND collection = 'mbbs_fees' AND subtitle = '₹10L – ₹30L/yr';
-- No published MBBS fee says which quota it is for, so this row stops quoting a range.
UPDATE content_blocks SET title = 'Management & NRI quota', subtitle = 'Set by each college', updated_at = now()
 WHERE id = 89 AND collection = 'mbbs_fees' AND subtitle = '₹15L – ₹40L/yr';

UPDATE site_settings SET value = $$The middle 80% of the yearly fees colleges published for the latest session: a government college's lowest published fee, and every fee a private college or deemed university publishes, because which one applies depends on your quota. Hostel, deposits and university charges are extra. Confirm the exact fee with the college or counselling authority before you plan around it.$$, updated_at = now()
 WHERE key = 'mbbs.fees.disclaimer'
   AND value = $$Fee ranges are approximate and vary across states and institutions. Government college fees are significantly subsidized. NRI/Management quota fees are typically higher. Always confirm the exact fee structure from the official college website or counselling authority before making any financial decisions.$$;

UPDATE site_settings SET value = $$Approved MBBS seats from the National Medical Commission's college register, as of {nmc_date}. New colleges and seats are added every year; the seats a counselling round offers come from that year's seat matrix.$$, updated_at = now()
 WHERE key = 'mbbs.seats.disclaimer'
   AND value = $$Seat numbers are updated as per the latest NMC data. New colleges are added every year. Actual available seats depend on NMC approval and counselling authority notifications.$$;

-- ---------------------------------------------------------------- MBBS FAQ
UPDATE content_blocks SET body = $$NMC's register lists {mbbs_seats} MBBS seats across {mbbs_colleges} medical colleges — {govt_mbbs_seats} in {govt_mbbs_colleges} government colleges and {private_mbbs_seats} in {private_mbbs_colleges} private ones (as of {nmc_date}). The count changes every year as NMC approves new colleges and seats, so your counsellor works from the current year's seat matrix.$$, updated_at = now()
 WHERE id = 103 AND collection = 'mbbs_faqs'
   AND body = $$India has well over 1 lakh MBBS seats across 750+ medical colleges — government, private and deemed — recognised by the National Medical Commission (NMC). The exact count changes every year as NMC approves new colleges and seats, so your counsellor works from the current year's seat matrix.$$;

UPDATE content_blocks SET body = $$From the fees colleges published for the latest session: a government college usually charges {govt_mbbs_fee} a year (median {govt_mbbs_fee_median}). A private college publishes several fees, one per quota, most of them {private_mbbs_fee} a year (median {private_mbbs_fee_median}). Deemed universities mostly charge {deemed_mbbs_fee} a year (median {deemed_mbbs_fee_median}). Hostel, deposits and university charges are extra.$$, updated_at = now()
 WHERE id = 104 AND collection = 'mbbs_faqs'
   AND body = $$Government college fees range from ₹10,000 to ₹50,000 per year. Private college fees range from ₹5 Lakh to ₹25 Lakh per year. Deemed universities can charge ₹10–30 Lakh per year. Management quota fees are typically ₹15–40 Lakh per year.$$;

-- ---------------------------------------------------------------- MD/MS FAQ
UPDATE content_blocks SET body = $$From the fees published with the latest counselling: government colleges mostly charge {govt_pg_fee} a year (median {govt_pg_fee_median}), private colleges {private_pg_fee} (median {private_pg_fee_median}) and deemed universities {deemed_pg_fee} (median {deemed_pg_fee_median}). A private college's fee depends on the quota — management and NRI seats cost far more than its state-quota seats. Many colleges also attach a service bond.$$, updated_at = now()
 WHERE id = 32 AND collection = 'faq_pg'
   AND body = $$Fees vary dramatically. Government colleges charge ₹15,000-₹1,00,000 per year. Private colleges range from ₹5-25 lakhs per year. Deemed universities can go up to ₹30-50 lakhs per year. Many colleges also have bond clauses requiring rural service or monetary penalties.$$;

UPDATE content_blocks SET body = $$Yes. In the first year, government colleges pay a median of {govt_stipend_median} a month and private and deemed colleges a median of {private_stipend_median}, from {stipend_colleges} colleges' own published stipends; most pay {pg_stipend_range} a month. The amount is set by the state or the college and rises in the second and third years.$$, updated_at = now()
 WHERE id = 33 AND collection = 'faq_pg'
   AND body = $$Yes, government medical college PG students receive monthly stipends ranging from ₹40,000 to ₹1,00,000+ depending on the state and year of residency. Most private and deemed universities do not offer stipends, though some provide nominal amounts.$$;

UPDATE content_blocks SET body = $$Many states require PG graduates of their government colleges to serve in a government hospital for a set period after the course, or pay a penalty instead. The period and the penalty differ by state and change with each year's prospectus, so we check each college's bond terms with you before choice filling — no surprises after you join.$$, updated_at = now()
 WHERE id = 34 AND collection = 'faq_pg'
   AND body = $$Many state government colleges require PG graduates to serve in rural/government hospitals for 1-3 years after completion, or pay a bond penalty (₹10-50 lakhs). We help you understand each college's bond terms before choice filling so there are no surprises.$$;
