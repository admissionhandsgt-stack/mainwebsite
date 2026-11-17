-- Three private colleges whose first MD/MS seats start in 2026-27 (owner, 2026-11-17: "verify if they have NEET PG fees this
-- year and build the college page about their fees etc info if available or the college information"). Same shape as
-- jh_new_pg_colleges_2026_11_16.sql.
--
-- Evidence, read 17 Nov 2026:
--   * NMC MARB, Updated Seat Matrix for PG Broad Speciality Courses 2026-27 (as on 06-11-2026), letter
--     No. M-19011/20/2025-PGMARB (https://nmc.org.in/whats-new/download/1884), read with xpdf's table mode:
--       Banas Medical College and Research Institute, Palanpur, GJ/004/P/3 — 12 courses × 4 seats (S.No 760–771):
--         MD Pharmacology, Physiology, Pathology, Microbiology, Community Medicine, MS ENT, MD General Medicine,
--         Paediatrics, Psychiatry, MS General Surgery, MD Anaesthesiology, MS OBG.
--       JIET Medical College and Hospital, Jodhpur, RJ/036/P/3 — 14 courses × 4 seats (S.No 4849–4862):
--         MD Microbiology, General Medicine, Paediatrics, Dermatology, Anatomy, Physiology, Pathology, Anaesthesiology,
--         Radio-Diagnosis, MS General Surgery, OBG, Ophthalmology, Orthopaedics, ENT.
--       Vyas Medical College & Hospital, Jodhpur, RJ/047/P/5 — 13 courses × 4 seats (S.No 10382–10394):
--         MD Forensic Medicine, Community Medicine, General Medicine, Psychiatry, Paediatrics, MS Ophthalmology,
--         MD Radio-Diagnosis, Anaesthesiology, Biochemistry, Microbiology, Pathology, MS General Surgery, Orthopaedics.
--     NMC's college-and-course register (our weekly mirror, synced 16 Nov) still lists only their MBBS; the card follows
--     by itself at a later sync.
--   * Rajasthan NEET PG Counselling Board 2026: "MD/MS Seat Matrix (Round-2) 14.11.2026"
--     (https://pg.neetrajasthan.com/notifications/1794892825058.pdf) has JIET and Vyas as private colleges in the state
--     counselling, and "Fee structure for all available branches and other fee with Hostel Accomodation fee - PRIVATE
--     MEDICAL COLLEGES" (https://pg.neetrajasthan.com/notifications/1794824607098.pdf — the copy that carries both) prints
--     their 2026-27 tuition a year per branch for AI-nature, State-nature and Management seats, the same sheet whose earlier
--     copy (1792689067505.pdf) gives the other Rajasthan private colleges' fees here. AI and State figures are equal on every
--     branch. A branch printed "N/A" for Management has no management seat; Vyas prints Pathology "N/A" on all three.
--   * Gujarat (ACPPGMEC): Banas is not in Round 1's seat matrix (r1_vac.pdf), Round 2's is not posted yet, and no 2026-27 PG
--     fee is published for it (the Fee Regulatory Committee's 2025-27 PG fees cover the colleges that already had PG). Its
--     branches are listed with "Not published yet" on the two seat types every Gujarat private college carries.
-- source_id 99101–99103: our own, outside the PG tool's range (it gave the Jharkhand colleges 9301/9302); tell zyn-92 if the
-- official bond/stipend files are to name them. Idempotent: every insert is guarded.
BEGIN;

INSERT INTO institutes (source_id, name, slug, level, ownership, state_id, district, city, university, management,
                        established_year, seats_total, branch_count, mbbs_intake, is_active, created_at, updated_at)
SELECT 99101, 'Banas Medical College and Research Institute, Palanpur', 'banas-medical-college-and-research-institute-palanpur',
       'pg', 'private', (SELECT id FROM states WHERE name = 'Gujarat'), 'Banaskantha', 'Palanpur',
       'Hemchandracharya North Gujarat University, Patan', 'Private', 2018, 48, 12, 200, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM institutes WHERE slug = 'banas-medical-college-and-research-institute-palanpur');

INSERT INTO institutes (source_id, name, slug, level, ownership, state_id, district, city, university, management,
                        established_year, seats_total, branch_count, mbbs_intake, is_active, created_at, updated_at)
SELECT 99102, 'JIET Medical College and Hospital, Jodhpur', 'jiet-medical-college-and-hospital-jodhpur',
       'pg', 'private', (SELECT id FROM states WHERE name = 'Rajasthan'), 'Jodhpur', 'Jodhpur',
       'Marwar Medical University, Jodhpur', 'Private', 2024, 56, 14, 250, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM institutes WHERE slug = 'jiet-medical-college-and-hospital-jodhpur');

INSERT INTO institutes (source_id, name, slug, level, ownership, state_id, district, city, university, management,
                        established_year, seats_total, branch_count, mbbs_intake, is_active, created_at, updated_at)
SELECT 99103, 'Vyas Medical College & Hospital, Jodhpur', 'vyas-medical-college-hospital-jodhpur',
       'pg', 'private', (SELECT id FROM states WHERE name = 'Rajasthan'), 'Jodhpur', 'Jodhpur',
       'Marwar Medical University, Jodhpur', 'Private', 2024, 52, 13, 150, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM institutes WHERE slug = 'vyas-medical-college-hospital-jodhpur');

-- NMC's register pairs them with their MBBS pages (the same NMC code links the two pages).
INSERT INTO nmc_institutes (college_code, institute_id, method, level, updated_at)
SELECT x.code, i.id, 'admin', 'pg', now()
  FROM (VALUES ('GJ/004/P/3', 'banas-medical-college-and-research-institute-palanpur'),
               ('RJ/036/P/3', 'jiet-medical-college-and-hospital-jodhpur'),
               ('RJ/047/P/5', 'vyas-medical-college-hospital-jodhpur')) AS x(code, slug)
  JOIN institutes i ON i.slug = x.slug AND i.level = 'pg'
 WHERE NOT EXISTS (SELECT 1 FROM nmc_institutes n WHERE n.institute_id = i.id);

-- JIET: the board's 2026-27 tuition a year. AI = "RAJ Priv-All India", State = "RAJ Priv-Govt Quota", Management =
-- "RAJ Priv-Mgmt Quota", as for every other Rajasthan private college. Caution money ₹3 L once (refundable), admission
-- ₹10,000 once, other fees ₹35,000 a year; hostel double-seater AC ₹3 L a year with mess.
INSERT INTO fees (level, institute_id, course_id, quota_id, counselling_id, fee_session, fee_inr, fee_periodicity,
                  hostel_min_inr, hostel_max_inr, hostel_note, bond_note, year, is_carried_forward, fee_source, fee_label,
                  fee_currency, fee_components, updated_at)
SELECT 'pg', i.id, c.id, q.id, (SELECT id FROM counsellings WHERE name = 'RJSTHN PG' AND level = 'pg'), '2026', x.fee,
       'per year', 300000, 300000,
       'Double-seater AC room with mess, laundry, gymnasium and recreation, ₹3,00,000 a year; the PG course is fully residential (the college''s remark in the board''s fee sheet)',
       'No bond or bank guarantee on All India, State or Management seats (the college''s remark in the board''s fee sheet)',
       2026, false,
       'Fee structure for all available branches and other fee with Hostel Accomodation fee - PRIVATE MEDICAL COLLEGES, Rajasthan NEET PG Counselling Board 2026 — https://pg.neetrajasthan.com/notifications/1794824607098.pdf — first PG batch 2026-27 (NMC''s PG seat matrix of 06-11-2026: 4 seats a branch). Caution money ₹3,00,000 once (refundable), admission fee ₹10,000 once, other fees ₹35,000 a year and hostel are extra.',
       'Tuition fee', 'INR',
       '{"caution money (once, refundable)": 300000, "admission fee (once)": 10000, "other fees except tuition (a year)": 35000}'::jsonb,
       now()
  FROM (VALUES
          ('MD Anaesthesiology', 'RAJ Priv-All India', 2200000), ('MD Anaesthesiology', 'RAJ Priv-Govt Quota', 2200000),
          ('MD Anatomy', 'RAJ Priv-All India', 20000), ('MD Anatomy', 'RAJ Priv-Govt Quota', 20000),
          ('MD General Medicine', 'RAJ Priv-All India', 3255000), ('MD General Medicine', 'RAJ Priv-Govt Quota', 3255000), ('MD General Medicine', 'RAJ Priv-Mgmt Quota', 8000000),
          ('MD Microbiology', 'RAJ Priv-All India', 20000), ('MD Microbiology', 'RAJ Priv-Govt Quota', 20000),
          ('MD Paediatrics', 'RAJ Priv-All India', 3255000), ('MD Paediatrics', 'RAJ Priv-Govt Quota', 3255000), ('MD Paediatrics', 'RAJ Priv-Mgmt Quota', 6500000),
          ('MD Pathology', 'RAJ Priv-All India', 1200000), ('MD Pathology', 'RAJ Priv-Govt Quota', 1200000),
          ('MD Physiology', 'RAJ Priv-All India', 20000), ('MD Physiology', 'RAJ Priv-Govt Quota', 20000),
          ('MD Radio Diagnosis', 'RAJ Priv-All India', 3255000), ('MD Radio Diagnosis', 'RAJ Priv-Govt Quota', 3255000), ('MD Radio Diagnosis', 'RAJ Priv-Mgmt Quota', 9000000),
          ('MD Dermatology, Venereology & Leprosy', 'RAJ Priv-All India', 3255000), ('MD Dermatology, Venereology & Leprosy', 'RAJ Priv-Govt Quota', 3255000), ('MD Dermatology, Venereology & Leprosy', 'RAJ Priv-Mgmt Quota', 9000000),
          ('MS ENT', 'RAJ Priv-All India', 3255000), ('MS ENT', 'RAJ Priv-Govt Quota', 3255000),
          ('MS General Surgery', 'RAJ Priv-All India', 3255000), ('MS General Surgery', 'RAJ Priv-Govt Quota', 3255000), ('MS General Surgery', 'RAJ Priv-Mgmt Quota', 5000000),
          ('MS Obstetrics & Gynaecology', 'RAJ Priv-All India', 3255000), ('MS Obstetrics & Gynaecology', 'RAJ Priv-Govt Quota', 3255000), ('MS Obstetrics & Gynaecology', 'RAJ Priv-Mgmt Quota', 7000000),
          ('MS Ophthalmology', 'RAJ Priv-All India', 3255000), ('MS Ophthalmology', 'RAJ Priv-Govt Quota', 3255000), ('MS Ophthalmology', 'RAJ Priv-Mgmt Quota', 5000000),
          ('MS Orthopaedics', 'RAJ Priv-All India', 3255000), ('MS Orthopaedics', 'RAJ Priv-Govt Quota', 3255000), ('MS Orthopaedics', 'RAJ Priv-Mgmt Quota', 7000000)
       ) AS x(course, quota, fee)
  JOIN courses c ON c.name = x.course AND c.level = 'pg'
  JOIN quotas q ON q.code = x.quota
  JOIN institutes i ON i.slug = 'jiet-medical-college-and-hospital-jodhpur' AND i.level = 'pg'
 WHERE NOT EXISTS (SELECT 1 FROM fees f WHERE f.institute_id = i.id AND f.course_id = c.id AND f.quota_id = q.id);

-- Vyas: the same sheet. Its remark: State and All India seat fees are subject to FRC Rajasthan's final order, and post-dated
-- cheques for the next two years' tuition are given at admission. Caution money ₹5 L once (refundable), admission ₹10,000
-- once, other fees ₹35,000 a year; hostel single-occupancy AC ₹5 L a year with mess, electricity and laundry, compulsory.
INSERT INTO fees (level, institute_id, course_id, quota_id, counselling_id, fee_session, fee_inr, fee_periodicity,
                  hostel_min_inr, hostel_max_inr, hostel_note, year, is_carried_forward, fee_source, fee_label,
                  fee_currency, fee_components, updated_at)
SELECT 'pg', i.id, c.id, q.id, (SELECT id FROM counsellings WHERE name = 'RJSTHN PG' AND level = 'pg'), '2026', x.fee,
       'per year', 500000, 500000,
       'Single-occupancy AC room with mess, electricity and laundry, ₹5,00,000 a year; hostel is compulsory (the college''s remark in the board''s fee sheet)',
       2026, false,
       'Fee structure for all available branches and other fee with Hostel Accomodation fee - PRIVATE MEDICAL COLLEGES, Rajasthan NEET PG Counselling Board 2026 — https://pg.neetrajasthan.com/notifications/1794824607098.pdf — first PG batch 2026-27 (NMC''s PG seat matrix of 06-11-2026: 4 seats a branch). Post-dated cheques for the next two years'' tuition are given at admission. Caution money ₹5,00,000 once (refundable), admission fee ₹10,000 once, other fees ₹35,000 a year and hostel are extra.',
       CASE WHEN x.quota = 'RAJ Priv-Mgmt Quota' THEN 'Tuition fee'
            ELSE 'Tuition fee - subject to FRC Rajasthan''s final fee for State and All India seats' END,
       'INR',
       '{"caution money (once, refundable)": 500000, "admission fee (once)": 10000, "other fees except tuition (a year)": 35000}'::jsonb,
       now()
  FROM (VALUES
          ('MD Anaesthesiology', 'RAJ Priv-All India', 2500000), ('MD Anaesthesiology', 'RAJ Priv-Govt Quota', 2500000),
          ('MD Bio-Chemistry', 'RAJ Priv-All India', 300000), ('MD Bio-Chemistry', 'RAJ Priv-Govt Quota', 300000),
          ('MD Forensic Medicine', 'RAJ Priv-All India', 400000), ('MD Forensic Medicine', 'RAJ Priv-Govt Quota', 400000),
          ('MD General Medicine', 'RAJ Priv-All India', 3255000), ('MD General Medicine', 'RAJ Priv-Govt Quota', 3255000), ('MD General Medicine', 'RAJ Priv-Mgmt Quota', 9000000),
          ('MD Microbiology', 'RAJ Priv-All India', 300000), ('MD Microbiology', 'RAJ Priv-Govt Quota', 300000),
          ('MD Paediatrics', 'RAJ Priv-All India', 3255000), ('MD Paediatrics', 'RAJ Priv-Govt Quota', 3255000), ('MD Paediatrics', 'RAJ Priv-Mgmt Quota', 6500000),
          ('MD Social & Preventive Medicine', 'RAJ Priv-All India', 300000), ('MD Social & Preventive Medicine', 'RAJ Priv-Govt Quota', 300000),
          ('MD Psychiatry', 'RAJ Priv-All India', 3255000), ('MD Psychiatry', 'RAJ Priv-Govt Quota', 3255000), ('MD Psychiatry', 'RAJ Priv-Mgmt Quota', 5500000),
          ('MD Radio Diagnosis', 'RAJ Priv-All India', 3255000), ('MD Radio Diagnosis', 'RAJ Priv-Govt Quota', 3255000), ('MD Radio Diagnosis', 'RAJ Priv-Mgmt Quota', 11000000),
          ('MS General Surgery', 'RAJ Priv-All India', 3255000), ('MS General Surgery', 'RAJ Priv-Govt Quota', 3255000), ('MS General Surgery', 'RAJ Priv-Mgmt Quota', 5000000),
          ('MS Ophthalmology', 'RAJ Priv-All India', 3255000), ('MS Ophthalmology', 'RAJ Priv-Govt Quota', 3255000), ('MS Ophthalmology', 'RAJ Priv-Mgmt Quota', 5000000),
          ('MS Orthopaedics', 'RAJ Priv-All India', 3255000), ('MS Orthopaedics', 'RAJ Priv-Govt Quota', 3255000), ('MS Orthopaedics', 'RAJ Priv-Mgmt Quota', 6000000)
       ) AS x(course, quota, fee)
  JOIN courses c ON c.name = x.course AND c.level = 'pg'
  JOIN quotas q ON q.code = x.quota
  JOIN institutes i ON i.slug = 'vyas-medical-college-hospital-jodhpur' AND i.level = 'pg'
 WHERE NOT EXISTS (SELECT 1 FROM fees f WHERE f.institute_id = i.id AND f.course_id = c.id AND f.quota_id = q.id);

-- Vyas Pathology: in NMC's matrix, printed "N/A" on every seat type in the board's sheet.
INSERT INTO fees (level, institute_id, course_id, quota_id, counselling_id, fee_session, fee_inr, fee_null_reason, year,
                  is_carried_forward, fee_source, updated_at)
SELECT 'pg', i.id, c.id, q.id, (SELECT id FROM counsellings WHERE name = 'RJSTHN PG' AND level = 'pg'), '2026', NULL,
       'Not in the counselling board''s 2026-27 fee sheet', 2026, false,
       'Rajasthan NEET PG Counselling Board 2026, private colleges'' fee sheet (pg.neetrajasthan.com/notifications/1794824607098.pdf): MD Pathology printed "N/A".',
       now()
  FROM (VALUES ('RAJ Priv-All India'), ('RAJ Priv-Govt Quota')) AS x(quota)
  JOIN courses c ON c.name = 'MD Pathology' AND c.level = 'pg'
  JOIN quotas q ON q.code = x.quota
  JOIN institutes i ON i.slug = 'vyas-medical-college-hospital-jodhpur' AND i.level = 'pg'
 WHERE NOT EXISTS (SELECT 1 FROM fees f WHERE f.institute_id = i.id AND f.course_id = c.id AND f.quota_id = q.id);

-- Banas: its twelve branches, no 2026-27 PG fee published yet, on Gujarat's state-quota and management seat types.
INSERT INTO fees (level, institute_id, course_id, quota_id, counselling_id, fee_session, fee_inr, fee_null_reason, year,
                  is_carried_forward, updated_at)
SELECT 'pg', i.id, c.id, q.id, (SELECT id FROM counsellings WHERE name = 'Gujarat PG' AND level = 'pg'), '2026-27', NULL,
       'Not published yet (first PG batch, 2026-27)', 2026, false, now()
  FROM (VALUES ('MD Pharmacology'), ('MD Physiology'), ('MD Pathology'), ('MD Microbiology'), ('MD Social & Preventive Medicine'),
               ('MS ENT'), ('MD General Medicine'), ('MD Paediatrics'), ('MD Psychiatry'), ('MS General Surgery'),
               ('MD Anaesthesiology'), ('MS Obstetrics & Gynaecology')) AS x(course)
  CROSS JOIN (VALUES ('GUJ Govt-AllGujStud.'), ('GUJ Mgmt Quota')) AS y(quota)
  JOIN courses c ON c.name = x.course AND c.level = 'pg'
  JOIN quotas q ON q.code = y.quota
  JOIN institutes i ON i.slug = 'banas-medical-college-and-research-institute-palanpur' AND i.level = 'pg'
 WHERE NOT EXISTS (SELECT 1 FROM fees f WHERE f.institute_id = i.id AND f.course_id = c.id AND f.quota_id = q.id);

COMMIT;
