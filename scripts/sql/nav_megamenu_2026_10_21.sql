-- Menus, regrouped (owner, 2026-10-21: "MD/MS ki drop down kitni badi hogyi hai … sab ko ache se manage karo").
--
-- Header: MD/MS's twelve links become three titled columns (a mega menu); every sub-link gets a
-- one-line description; Know Us gains Our Team and Contact. Footer: the seventeen-link "Explore"
-- column becomes five titled columns, and footer_quick (the old phone-only pills) becomes the
-- footer's bottom line — privacy, terms, data.
--
-- APPLY ONLY AFTER THE RELEASE THAT RENDERS GROUPS IS LIVE. The header and footer before it draw a
-- group row (url "#") as a dead link and drop its children.
--
-- Re-runnable: groups are inserted only when missing, a link moves only while it still sits where
-- this script found it, a label changes only while it still reads the old words, and a description
-- is written only where none is set — an admin's edit always wins.

BEGIN;

/* ------------------------------------------------------------------ header: MD/MS columns */

INSERT INTO nav_items (menu, parent_id, label, url, display_order, is_active, opens_new_tab)
SELECT 'header', 6, g.label, '#', g.ord, true, false
  FROM (VALUES ('Colleges & seats', 1), ('Cutoff & counselling', 2), ('Fees, stipend & bond', 3)) AS g(label, ord)
 WHERE NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = 'header' AND n.parent_id = 6 AND n.label = g.label);

UPDATE nav_items n
   SET parent_id = (SELECT id FROM nav_items WHERE menu = 'header' AND parent_id = 6 AND label = v.grp),
       display_order = v.ord, updated_at = now()
  FROM (VALUES
          (8,  'Colleges & seats', 1), (64, 'Colleges & seats', 2), (62, 'Colleges & seats', 3), (78, 'Colleges & seats', 4),
          (80, 'Cutoff & counselling', 1), (55, 'Cutoff & counselling', 2), (48, 'Cutoff & counselling', 3), (47, 'Cutoff & counselling', 4),
          (63, 'Fees, stipend & bond', 1), (51, 'Fees, stipend & bond', 2), (52, 'Fees, stipend & bond', 3), (79, 'Fees, stipend & bond', 4)
       ) AS v(id, grp, ord)
 WHERE n.id = v.id AND n.menu = 'header' AND n.parent_id = 6;

/* ------------------------------------------------------------------ header: Know Us */

INSERT INTO nav_items (menu, parent_id, label, url, display_order, is_active, opens_new_tab)
SELECT 'header', 13, v.label, v.url, v.ord, true, false
  FROM (VALUES ('Our Team', '/team', 2), ('Contact', '/contact', 4)) AS v(label, url, ord)
 WHERE NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = 'header' AND n.url = v.url);
UPDATE nav_items SET display_order = 3, updated_at = now() WHERE id = 14 AND parent_id = 13 AND display_order = 2;

/* ------------------------------------------------------------------ header: order inside MBBS, Other Courses, NRI */

UPDATE nav_items n SET display_order = v.ord, updated_at = now()
  FROM (VALUES (4, 1), (3, 2), (58, 3), (5, 4),          -- MBBS: colleges, deemed, cutoff, process
               (57, 1), (67, 2), (65, 3), (71, 4),       -- Other Courses: BDS, MDS, SS, AYUSH
               (27, 1), (50, 2), (28, 3)) AS v(id, ord)  -- NRI: colleges, fees, documents
 WHERE n.id = v.id AND n.menu = 'header';

/* ------------------------------------------------------------------ labels that said less than the page */

UPDATE nav_items n SET label = v.new, updated_at = now()
  FROM (VALUES
          (4,  'Govt & Pvt Colleges',      'MBBS Colleges'),
          (64, 'PG by State',              'PG Colleges by State'),
          (62, 'Deemed University PG',     'Deemed Universities'),
          (48, 'Branch Cutoffs',           'Branch-wise Cutoff'),
          (63, 'Private College PG Fees',  'Private College Fees'),
          (52, 'PG Stipend by State',      'Stipend by State'),
          (79, 'PG Bond by State',         'Service Bond by State'),
          (50, 'NRI Fees & Ranks',         'NRI Quota Fees'),
          (38, 'NRI',                      'NRI Quota')
       ) AS v(id, old, new)
 WHERE n.id = v.id AND n.label = v.old;

/* ------------------------------------------------------------------ one line under each link */

UPDATE nav_items n SET description = v.d, updated_at = now()
  FROM (VALUES
          (8,  'Every MD/MS and DNB college: seats, fees and stipend'),
          (64, 'Colleges, counselling and cutoff in each state'),
          (62, 'PG seats at deemed universities, with fees'),
          (78, 'MCC''s 2026 seats by quota, branch and state'),
          (80, 'Each round''s result, and what it changed'),
          (55, 'All India closing ranks by category and branch'),
          (48, 'Every branch: seats, colleges and cutoff band'),
          (47, 'MCC and state rounds, step by step'),
          (63, 'What MD/MS costs in private colleges, by state'),
          (51, 'Management and paid seats, with fees'),
          (52, 'Monthly PG stipend, government and private'),
          (79, 'Years and penalty on government seats, by state'),
          (4,  'Government and private colleges, with fees and seats'),
          (3,  'Deemed universities, with fees and seats'),
          (58, 'All India MBBS and BDS closing ranks by category'),
          (5,  'MCC and state counselling, step by step'),
          (57, 'Every BDS college, and the All India BDS cutoff'),
          (67, 'MDS closing ranks by speciality and category'),
          (65, 'DM and MCh group ranks by course'),
          (71, 'BAMS, BHMS, BUMS and BSMS colleges'),
          (27, 'Colleges where counselling allotted NRI seats'),
          (50, 'What NRI seats cost, MBBS and MD/MS'),
          (28, 'The papers NRI candidates are asked for'),
          (12, 'What our counselling covers, start to finish'),
          (14, 'Counselling explained on video')
       ) AS v(id, d)
 WHERE n.id = v.id AND n.description IS NULL;

UPDATE nav_items SET description = 'The counsellors you will speak to'
 WHERE menu = 'header' AND url = '/team' AND description IS NULL;
UPDATE nav_items SET description = 'Call, WhatsApp or visit our Noida office'
 WHERE menu = 'header' AND url = '/contact' AND description IS NULL;

/* ------------------------------------------------------------------ footer: five columns */

INSERT INTO nav_items (menu, parent_id, label, url, display_order, is_active, opens_new_tab)
SELECT 'footer_explore', NULL, g.label, '#', g.ord, true, false
  FROM (VALUES ('MBBS', 1), ('MD/MS', 2), ('PG fees & stipend', 3), ('Courses & tools', 4), ('Company', 5)) AS g(label, ord)
 WHERE NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = 'footer_explore' AND n.parent_id IS NULL AND n.url = '#' AND n.label = g.label);

INSERT INTO nav_items (menu, parent_id, label, url, display_order, is_active, opens_new_tab)
SELECT 'footer_explore', NULL, 'Management Quota', '/management-quota', 99, true, false
 WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE menu = 'footer_explore' AND url = '/management-quota');

-- The old pills (footer_quick) move into the columns; ids are kept, so nothing an admin set is lost.
UPDATE nav_items n
   SET menu = 'footer_explore',
       parent_id = (SELECT id FROM nav_items g WHERE g.menu = 'footer_explore' AND g.parent_id IS NULL AND g.url = '#' AND g.label = v.grp),
       display_order = v.ord, updated_at = now()
  FROM (VALUES
          (36, 'MBBS', 1), (33, 'MBBS', 2), (35, 'MBBS', 3), (54, 'MBBS', 4), (39, 'MBBS', 5), (38, 'MBBS', 6),
          (37, 'MD/MS', 1), (34, 'MD/MS', 2), (60, 'MD/MS', 3), (81, 'MD/MS', 4), (59, 'MD/MS', 5), (49, 'MD/MS', 6), (76, 'MD/MS', 7),
          (61, 'PG fees & stipend', 1), (56, 'PG fees & stipend', 3), (77, 'PG fees & stipend', 4), (70, 'PG fees & stipend', 5),
          (53, 'Courses & tools', 1), (68, 'Courses & tools', 2), (66, 'Courses & tools', 3),
          (72, 'Courses & tools', 4), (46, 'Courses & tools', 5), (69, 'Courses & tools', 6),
          (41, 'Company', 1), (74, 'Company', 2), (40, 'Company', 3), (42, 'Company', 4), (73, 'Company', 5)
       ) AS v(id, grp, ord)
 WHERE n.id = v.id AND n.menu IN ('footer_explore', 'footer_quick') AND n.parent_id IS NULL AND n.url <> '#';

UPDATE nav_items
   SET parent_id = (SELECT id FROM nav_items g WHERE g.menu = 'footer_explore' AND g.parent_id IS NULL AND g.url = '#' AND g.label = 'PG fees & stipend'),
       display_order = 2, updated_at = now()
 WHERE menu = 'footer_explore' AND url = '/management-quota' AND parent_id IS NULL;

/* ------------------------------------------------------------------ footer: the bottom line */

-- Terms (43) stays in footer_quick; privacy and data join it. These were typed into Footer.tsx.
INSERT INTO nav_items (menu, parent_id, label, url, display_order, is_active, opens_new_tab)
SELECT 'footer_quick', NULL, v.label, v.url, v.ord, true, false
  FROM (VALUES ('Privacy', '/terms#privacy', 1), ('Data & DPDP', '/terms#dpdp', 3)) AS v(label, url, ord)
 WHERE NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = 'footer_quick' AND n.url = v.url);
UPDATE nav_items SET url = '/terms#terms', display_order = 2, updated_at = now()
 WHERE id = 43 AND menu = 'footer_quick' AND url = '/terms';

COMMIT;

-- What it left:
SELECT n.menu, p.label AS parent, n.label, n.url, n.display_order AS ord, n.is_active AS on, n.description
  FROM nav_items n LEFT JOIN nav_items p ON p.id = n.parent_id
 ORDER BY n.menu, coalesce(p.parent_id, p.id, n.id), coalesce(p.display_order, n.display_order), n.parent_id NULLS FIRST, n.display_order;
