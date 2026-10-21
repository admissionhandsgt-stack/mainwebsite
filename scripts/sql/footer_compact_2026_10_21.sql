-- The footer, compact (owner, 2026-10-21: "footer bhi thik karo, dekho kitna faila hua hai… single daldo
-- pages ya section ya links"). Five columns and 30 links become four columns of five section pages:
-- every deeper page is in the header's grouped menus, which are in the HTML of every page.
--
-- Nothing is deleted: a link that leaves the footer is switched off (is_active = false) and can be switched
-- back on in Admin → Navigation → Footer — Explore. Re-runnable.

BEGIN;

-- The fees column goes; its two strongest links move to MD/MS and Company.
UPDATE nav_items n
   SET parent_id = (SELECT id FROM nav_items g WHERE g.menu = 'footer_explore' AND g.parent_id IS NULL AND g.url = '#' AND g.label = v.grp),
       display_order = v.ord, updated_at = now()
  FROM (VALUES
          ('/mbbs-india', 'MBBS', 1), ('/mbbs-india/colleges', 'MBBS', 2), ('/mbbs-india/deemed-universities', 'MBBS', 3),
          ('/neet-ug-cutoff', 'MBBS', 4), ('/nri-quota', 'MBBS', 5),
          ('/md-ms-india', 'MD/MS', 1), ('/md-ms-india/colleges', 'MD/MS', 2), ('/neet-pg-counselling/2026', 'MD/MS', 3),
          ('/neet-pg-cutoff', 'MD/MS', 4), ('/md-ms-india/stipend', 'MD/MS', 5),
          ('/neet-college-predictor', 'Courses & tools', 1), ('/bds-india', 'Courses & tools', 2), ('/neet-mds-cutoff', 'Courses & tools', 3),
          ('/neet-ss-cutoff', 'Courses & tools', 4), ('/ayush-colleges', 'Courses & tools', 5),
          ('/know-us', 'Company', 1), ('/team', 'Company', 2), ('/services', 'Company', 3), ('/data', 'Company', 4), ('/contact', 'Company', 5)
       ) AS v(url, grp, ord)
 WHERE n.menu = 'footer_explore' AND n.url = v.url AND n.url <> '#';

-- Off the footer (still in the header menus): every other link, and the fees column itself.
UPDATE nav_items SET is_active = false, updated_at = now()
 WHERE menu = 'footer_explore' AND is_active
   AND url IN ('/neet-ug-process', '/md-ms-india/states', '/md-ms-india/branches', '/neet-pg-seat-matrix',
               '/md-ms-india/private-college-fees', '/management-quota', '/md-ms-india/bond',
               '/reports/neet-pg-stipend-2026', '/videos');
UPDATE nav_items SET is_active = false, updated_at = now()
 WHERE menu = 'footer_explore' AND parent_id IS NULL AND url = '#' AND label = 'PG fees & stipend' AND is_active;

-- Column order: MBBS, MD/MS, Courses & tools, Company.
UPDATE nav_items n SET display_order = v.ord, updated_at = now()
  FROM (VALUES ('MBBS', 1), ('MD/MS', 2), ('Courses & tools', 3), ('Company', 4)) AS v(label, ord)
 WHERE n.menu = 'footer_explore' AND n.parent_id IS NULL AND n.url = '#' AND n.label = v.label;

COMMIT;

SELECT p.label AS col, n.label, n.url, n.display_order AS ord
  FROM nav_items n LEFT JOIN nav_items p ON p.id = n.parent_id
 WHERE n.menu = 'footer_explore' AND n.is_active AND (p.id IS NULL OR p.is_active)
 ORDER BY coalesce(p.display_order, n.display_order), n.parent_id NULLS FIRST, n.display_order;
