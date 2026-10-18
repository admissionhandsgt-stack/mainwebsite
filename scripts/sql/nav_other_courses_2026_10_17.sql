-- Header menus by course (2026-10-17, owner's request): MBBS holds MBBS only, MD/MS holds PG
-- only, and BDS, MDS, AYUSH and NEET SS move under a new "Other Courses" — url '#', a menu with
-- no page of its own, which components/Header.tsx renders as a button that opens the list.
-- To fit the header at 1280–1535px (measured with scripts/tmp/header_budget.mjs: the extra item
-- cut the right-hand controls off by 132px), Home leaves the bar — the logo is home — and
-- Services and Videos go under Know Us. Every statement is guarded on the row's current place,
-- so an edit made in the admin is never overwritten, and nothing is deleted: Home is switched off.

INSERT INTO nav_items (menu, label, url, parent_id, display_order, is_active, opens_new_tab)
SELECT 'header', 'Other Courses', '#', NULL, 5, true, false
 WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE menu = 'header' AND parent_id IS NULL AND label = 'Other Courses');

-- Other Courses sits right after MD/MS (4), so NRI moves from 5 to 6.
UPDATE nav_items SET display_order = 6, updated_at = now()
 WHERE id = 11 AND menu = 'header' AND parent_id IS NULL AND url = '/nri-quota' AND display_order = 5;

-- The four other courses, in this order.
UPDATE nav_items n SET parent_id = oc.id, display_order = v.ord, updated_at = now()
  FROM (SELECT id FROM nav_items WHERE menu = 'header' AND parent_id IS NULL AND label = 'Other Courses') oc,
       (VALUES (57, 2, '/bds-india', 1), (67, 2, '/neet-mds-cutoff', 2), (71, 2, '/ayush-colleges', 3), (65, 6, '/neet-ss-cutoff', 4))
         AS v(id, old_parent, url, ord)
 WHERE n.id = v.id AND n.parent_id = v.old_parent AND n.url = v.url;

-- Home off: the logo already goes home.
UPDATE nav_items SET is_active = false, updated_at = now()
 WHERE id = 1 AND menu = 'header' AND parent_id IS NULL AND url = '/' AND is_active;

-- Services and Videos under Know Us.
UPDATE nav_items n SET parent_id = 13, display_order = v.ord, updated_at = now()
  FROM (VALUES (12, '/services', 1), (14, '/videos', 2)) AS v(id, url, ord)
 WHERE n.id = v.id AND n.menu = 'header' AND n.parent_id IS NULL AND n.url = v.url
   AND EXISTS (SELECT 1 FROM nav_items k WHERE k.id = 13 AND k.url = '/know-us' AND k.parent_id IS NULL);

SELECT n.id, coalesce(p.label, '') AS parent, n.label, n.url, n.display_order, n.is_active
  FROM nav_items n LEFT JOIN nav_items p ON p.id = n.parent_id
 WHERE n.menu = 'header'
 ORDER BY coalesce(p.display_order, n.display_order), n.parent_id NULLS FIRST, n.display_order, n.id;
