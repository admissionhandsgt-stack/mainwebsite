-- Mega menus (2026-10-21): the header's MD/MS, MBBS and Other Courses menus are grouped into titled
-- columns, and every link carries one line saying what is behind it. A group is an ordinary row whose
-- children are the links (nav_items already nests to any depth); this adds the line.
ALTER TABLE nav_items ADD COLUMN IF NOT EXISTS description text;
