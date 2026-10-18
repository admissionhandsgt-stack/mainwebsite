-- The NRI page's admission timeline (content_blocks, collection nri_steps), corrected.
--
-- The live rows said NEET-UG was "mandatory for most medical institutions" and
-- that "some deemed universities accept international qualifications" — wrong,
-- and contradicted by the same page's FAQ — and described applying to several
-- institutions and sitting interviews. NRI seats are allotted through
-- counselling: MCC for deemed universities, the state for private colleges.
-- The same text ships in src/components/nri/NRIProcess.tsx as the fallback.
--
-- Each row is guarded on its exact old text, so a step somebody edited in the
-- admin is left as they wrote it.
--   node scripts/apply_migration.mjs scripts/sql/nri_steps_2026_10_18.sql

UPDATE content_blocks
   SET title = 'Qualify NEET-UG', subtitle = 'May – June',
       body = $$NEET-UG is mandatory for MBBS and BDS admission in India, NRI quota included. There is no NRI route around it.$$,
       updated_at = now()
 WHERE id = 139 AND collection = 'nri_steps'
   AND body = $$Appear for NEET-UG exam which is mandatory for most medical institutions. Some deemed universities accept international qualifications.$$;

UPDATE content_blocks
   SET title = 'Confirm NRI eligibility', subtitle = 'June',
       body = $$Check that you — or your sponsor — meet the NRI definition of the counselling you will use. MCC and each state set it in their own information bulletin, re-issued every year.$$,
       updated_at = now()
 WHERE id = 140 AND collection = 'nri_steps'
   AND body = $$Research and shortlist medical colleges that offer NRI quota seats. Check their eligibility criteria, fee structure, and admission process.$$;

UPDATE content_blocks
   SET title = 'Prepare the documents', subtitle = 'June – July',
       body = $$NRI status proof, your sponsor's passport and visa, proof of relationship and the affidavits the bulletin lists — gathered before registration opens.$$,
       updated_at = now()
 WHERE id = 141 AND collection = 'nri_steps'
   AND body = $$Collect and prepare all required documents including NRI status proof, academic certificates, NEET scorecard, and financial documents.$$;

UPDATE content_blocks
   SET title = 'Register for counselling', subtitle = 'July – August',
       body = $$Register with MCC for deemed universities and with each state counselling whose private colleges you want. Each is a separate registration with its own fee and deadline.$$,
       updated_at = now()
 WHERE id = 142 AND collection = 'nri_steps'
   AND body = $$Apply to multiple institutions to increase your chances. Submit applications along with required documents and application fees.$$;

UPDATE content_blocks
   SET title = 'Choice filling and rounds', subtitle = 'August – October',
       body = $$List colleges in order of preference, round by round. NRI documents are checked before an allotment is confirmed — a missing paper at that point can cost the seat.$$,
       updated_at = now()
 WHERE id = 143 AND collection = 'nri_steps'
   AND body = $$Selected candidates will be invited for document verification and counseling. Some institutions may conduct interviews for final selection.$$;

UPDATE content_blocks
   SET title = 'Report and pay', subtitle = 'After allotment',
       body = $$Report to the allotted college within the counselling's deadline with your original documents and the fee, in rupees or US dollars as that college's notice says.$$,
       updated_at = now()
 WHERE id = 144 AND collection = 'nri_steps'
   AND body = $$Pay the requisite fees and complete the admission formalities. Ensure all documentation is properly submitted for a smooth process.$$;
