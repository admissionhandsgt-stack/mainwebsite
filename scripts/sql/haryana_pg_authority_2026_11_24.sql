-- Haryana (2026-11-24): the MD/MS counselling runs on DMER Haryana's own portal, hry.online-counselling.co.in —
-- dmer.haryana.gov.in links uhsrugcounselling.com for MBBS and that portal for PG (its notices: FinalRound1Combined.pdf,
-- FinalRound1DNB.pdf); Pt. B.D. Sharma UHS, Rohtak carries out the document verification there. The row said "UG and PG",
-- so every Haryana PG page sent candidates to uhsr.ac.in as the PG counselling site. With scope "UG" the PG pages take the authority from DMER Haryana's own
-- approved notices (lib/pgAuthority.ts). Guarded on the old values: an admin's edit is never overwritten.
--
-- Run after the release that carries lib/pgAuthority.ts, then:
--   curl -X POST -H "x-cron-secret: …" -H "content-type: application/json" -d '{"recheck":true}' http://127.0.0.1:8150/api/cron/notices
--   bash scripts/revalidate_tags.sh --purge content alerts
UPDATE content_blocks
   SET data = jsonb_set(data, '{scope}', '"UG"'), updated_at = now()
 WHERE collection = 'state_authorities'
   AND title = 'Haryana'
   AND subtitle LIKE 'Pt. B.D. Sharma University of Health Sciences%'
   AND data->>'scope' = 'UG and PG';
