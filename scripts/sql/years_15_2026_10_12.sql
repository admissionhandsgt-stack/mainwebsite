-- 15+ years, as the owners state it (2026-10-12). Guarded on the old text so
-- an edit made in the admin since is never overwritten.
UPDATE content_blocks SET title = '15+ Years Experience', updated_at = now()
 WHERE id = 93 AND title = '12+ Years Experience';
UPDATE content_blocks SET body = replace(body, '12+ years of experience', '15+ years of experience'), updated_at = now()
 WHERE id = 106 AND body LIKE '%12+ years of experience%';

-- The homepage hero: 15+ years as the badge, and a subtitle that no longer
-- promises closing ranks (none are shown since 2026-10-12, lib/depth.ts).
UPDATE site_settings SET value = '15+ years of excellence', updated_at = now()
 WHERE key = 'home.hero.badge_right' AND value = 'Real cutoffs, not estimates';
UPDATE site_settings SET value = '15+ years of MBBS, BDS and MD/MS counselling — your NEET rank turned into one clear answer about where your seat actually is.', updated_at = now()
 WHERE key = 'home.hero.subtitle' AND value = 'Every closing rank, fee and seat from the last two counselling years — turned into one straight answer about where your seat actually is.';

-- No figure for a named college is shown any more (2026-10-12), so "every
-- number we show you" over-promises. Guarded on the old text.
UPDATE content_blocks SET body = 'Every figure comes from MCC and state counselling results — and your counsellor walks you through what it means for you.', updated_at = now()
 WHERE id = 15 AND body = 'Every number we show you is one you can check yourself.';

-- National MBBS figures as approximations: NMC changes them every year.
UPDATE content_blocks SET subtitle = '750+', body = 'Approx., across India', updated_at = now()
 WHERE id = 54 AND subtitle = '706+';
UPDATE content_blocks SET body = 'India has well over 1 lakh MBBS seats across 750+ medical colleges — government, private and deemed — recognised by the National Medical Commission (NMC). The exact count changes every year as NMC approves new colleges and seats, so your counsellor works from the current year''s seat matrix.', updated_at = now()
 WHERE id = 103 AND body LIKE 'India currently has over 1,08,940 MBBS seats%';
UPDATE content_blocks SET subtitle = '1 lakh+', updated_at = now() WHERE id = 47 AND subtitle = '1,08,940+';
UPDATE content_blocks SET title = '1 lakh+', updated_at = now() WHERE id = 94 AND title = '1,08,940+';
