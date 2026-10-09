-- Claims the site cannot back, still live through CMS rows on 2026-10-09 (the
-- SEO audit's content, GEO and SXO passes). A content_blocks or site_settings
-- row wins over the code fallback, so the code fix alone left them showing.
-- Every update is guarded on the exact old value: an admin edit made since is
-- never overwritten. Re-running is a no-op.
BEGIN;
UPDATE content_blocks SET body = $t$We set your NEET rank against the counselling authorities' own published closing ranks to show which colleges it has reached.$t$, updated_at = now()
 WHERE id = 62 AND body = $t$Our data models analyze 5+ years of cutoff trends to predict the best colleges you can target with your NEET rank.$t$;
UPDATE content_blocks SET title = $t$Published Ranks, Not Estimates$t$, body = $t$Built on the published closing ranks of every round, not estimates$t$, updated_at = now()
 WHERE id = 90 AND title = $t$Data-Driven Predictions$t$ AND body = $t$Powered by 5+ years of cutoff data and real-time analytics$t$;
UPDATE content_blocks SET body = $t$National-level entrance by NBEMS. Computer-based, 180 MCQs in 2026. The qualifying percentile is notified each year.$t$, updated_at = now()
 WHERE id = 112 AND body = $t$National-level entrance by NBE. Computer-based, 200 MCQs. Qualifying cutoff at 50th percentile for General/EWS.$t$;
UPDATE content_blocks SET body = $t$Conducted by NBEMS. Eligibility requires MBBS degree, completed internship, and NMC registration.$t$, updated_at = now()
 WHERE id = 130 AND body = $t$Conducted by NBE. Eligibility requires MBBS degree, completed internship, and NMC registration.$t$;
UPDATE content_blocks SET body = $t$From allotment letter to physically walking into your college — we stay with you until you have reported.$t$, updated_at = now()
 WHERE id = 136 AND body = $t$From allotment letter to physically walking into your college — we ensure zero last-mile failures.$t$;
UPDATE site_settings SET value = $t$Every document checked before you report$t$, updated_at = now()
 WHERE key = 'pg.cta.point_3' AND value = $t$Zero document rejection guarantee$t$;
UPDATE site_settings SET value = $t$Admission counselling for MBBS & PG medical seats in India. Expert guidance and transparent processes for your career.$t$, updated_at = now()
 WHERE key = 'footer.tagline' AND value = $t$India’s most trusted partner for MBBS & PG medical admissions. Expert guidance and transparent processes for your career.$t$;
COMMIT;
