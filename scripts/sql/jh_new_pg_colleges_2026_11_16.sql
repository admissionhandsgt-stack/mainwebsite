-- Two new private PG colleges in Jharkhand, first batch 2026-27 (owner, 2026-11-16, here and in zyn-92's session:
-- "agar ye dono real new PG colleges hai to kardo inko bhi set"). Counselled by JCECEB as "All India & NRI Quota" (no
-- domicile condition printed; forms 16–19 Nov, choice filling 20–23 Nov, allotment 25 Nov 2026), not by MCC.
--
-- Evidence (read by zyn-92 on 13 Nov, re-checked 16 Nov):
--   * NMC MARB PG seat matrix, public notice 06-11-2026 (https://nmc.org.in/whats-new/download/1884):
--       Laxmi Chandravansi Medical College & Hospital, Palamu, JH/003/P/3 — MD General Medicine, MS General Surgery,
--       MS Ophthalmology, MD Dermatology, MS Orthopaedics, MD Pathology, 4 seats each (24).
--       Netaji Subhas Medical College & Hospital, Jamshedpur, JH/006/P/4 — MD General Medicine, MS General Surgery,
--       MD Radio Diagnosis, MS OBG, MD Anaesthesiology, 4 seats each (20).
--   * Jharkhand Health Dept letters 652(9), 653(9) of 10-11-2026 on JCECEB's site; JCECEB Advt JCECEB/65/26-124 of
--     13-11-2026 (https://jceceb.jharkhand.gov.in/IMP_l/1462.pdf).
--   * NSMCH fee sheet, principal, 10-11-2026 (https://nsmch.ac.in/wp-content/uploads/2026/11/20261110173728.pdf): tuition
--     a year — General Medicine ₹40 L, General Surgery ₹40 L, Radio Diagnosis ₹60 L, OBG ₹45 L, Anaesthesia ₹26 L; apart from
--     tuition: hostel + fooding ₹4.5 L a year, university ₹2 L a year, admission ₹2 L once. LCMCH has published no fee.
-- No All India / NRI split and no category seats are printed (one line per branch); no cut-offs (first batch); bond and
-- stipend are not published by either college. source_id 9301 / 9302 = the PG tool's College_ID (zyn-92's files).
-- Idempotent: every insert is guarded.
BEGIN;

INSERT INTO quotas (code, label, master_quota)
SELECT 'JCECEB All India & NRI', 'Jharkhand Private Seats - All India & NRI (JCECEB)', 'Jharkhand Private Seats - All India & NRI (JCECEB)'
WHERE NOT EXISTS (SELECT 1 FROM quotas WHERE code = 'JCECEB All India & NRI');

INSERT INTO institutes (source_id, name, slug, level, ownership, state_id, district, city, university, management,
                        established_year, seats_total, branch_count, is_active, created_at, updated_at)
SELECT 9301, 'Laxmi Chandravansi Medical College & Hospital, Palamu', 'laxmi-chandravansi-medical-college-hospital-palamu',
       'pg', 'private', (SELECT id FROM states WHERE name = 'Jharkhand'), 'Palamu', 'Palamu',
       'Ramchandra Chandravansi University, Bishrampur, Palamu', 'Private', 2021, 24, 6, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM institutes WHERE slug = 'laxmi-chandravansi-medical-college-hospital-palamu');

INSERT INTO institutes (source_id, name, slug, level, ownership, state_id, district, city, university, management,
                        established_year, seats_total, branch_count, is_active, created_at, updated_at)
SELECT 9302, 'Netaji Subhas Medical College & Hospital, Jamshedpur', 'netaji-subhas-medical-college-hospital-jamshedpur',
       'pg', 'private', (SELECT id FROM states WHERE name = 'Jharkhand'), 'East Singhbhum', 'Jamshedpur',
       'Netaji Subhas University', 'Private', 2025, 20, 5, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM institutes WHERE slug = 'netaji-subhas-medical-college-hospital-jamshedpur');

-- NMC's register pairs them (its MD/MS courses reach the register at a later weekly sync; the card follows by itself).
INSERT INTO nmc_institutes (college_code, institute_id, method, level, updated_at)
SELECT x.code, i.id, 'admin', 'pg', now()
  FROM (VALUES ('JH/003/P/3', 'laxmi-chandravansi-medical-college-hospital-palamu'),
               ('JH/006/P/4', 'netaji-subhas-medical-college-hospital-jamshedpur')) AS x(code, slug)
  JOIN institutes i ON i.slug = x.slug
 WHERE NOT EXISTS (SELECT 1 FROM nmc_institutes n WHERE n.institute_id = i.id);

-- NSMCH: the college's own 2026-27 tuition a year, one line per branch.
INSERT INTO fees (level, institute_id, course_id, quota_id, counselling_id, fee_session, fee_inr, fee_periodicity,
                  hostel_min_inr, hostel_max_inr, hostel_note, year, is_carried_forward, fee_source, fee_label, fee_currency,
                  fee_components, updated_at)
SELECT 'pg', i.id, c.id, q.id, (SELECT id FROM counsellings WHERE name = 'Jharkhand PG' AND level = 'pg'), '2026-27', x.fee,
       'per year', 450000, 450000, 'hostel + fooding, a year', 2026, false,
       'Netaji Subhas Medical College & Hospital, Jamshedpur: PG fee sheet 2026-27, signed by the principal, 10-11-2026 (nsmch.ac.in/wp-content/uploads/2026/11/20261110173728.pdf). Tuition a year; hostel + fooding ₹4.5 L a year, university fee ₹2 L a year and admission fee ₹2 L once are charged apart.',
       'Tuition fee', 'INR',
       '{"hostel + fooding (a year)": 450000, "university fee (a year)": 200000, "admission fee (once)": 200000}'::jsonb, now()
  FROM (VALUES ('MD General Medicine', 4000000), ('MS General Surgery', 4000000), ('MD Radio Diagnosis', 6000000),
               ('MS Obstetrics & Gynaecology', 4500000), ('MD Anaesthesiology', 2600000)) AS x(course, fee)
  JOIN courses c ON c.name = x.course AND c.level = 'pg'
  JOIN institutes i ON i.slug = 'netaji-subhas-medical-college-hospital-jamshedpur'
  JOIN quotas q ON q.code = 'JCECEB All India & NRI'
 WHERE NOT EXISTS (SELECT 1 FROM fees f WHERE f.institute_id = i.id AND f.course_id = c.id AND f.quota_id = q.id);

-- LCMCH: its six branches, no fee published yet.
INSERT INTO fees (level, institute_id, course_id, quota_id, counselling_id, fee_session, fee_inr, fee_null_reason, year,
                  is_carried_forward, updated_at)
SELECT 'pg', i.id, c.id, q.id, (SELECT id FROM counsellings WHERE name = 'Jharkhand PG' AND level = 'pg'), '2026-27', NULL,
       'Not published by the college yet (first batch, 2026-27)', 2026, false, now()
  FROM (VALUES ('MD General Medicine'), ('MS General Surgery'), ('MS Ophthalmology'), ('MD Dermatology, Venereology & Leprosy'),
               ('MS Orthopaedics'), ('MD Pathology')) AS x(course)
  JOIN courses c ON c.name = x.course AND c.level = 'pg'
  JOIN institutes i ON i.slug = 'laxmi-chandravansi-medical-college-hospital-palamu'
  JOIN quotas q ON q.code = 'JCECEB All India & NRI'
 WHERE NOT EXISTS (SELECT 1 FROM fees f WHERE f.institute_id = i.id AND f.course_id = c.id AND f.quota_id = q.id);

COMMIT;
