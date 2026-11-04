-- /mbbs-india/sikkim answered 404: Sikkim was never in mbbs_states (33 rows), though NMC's register lists two
-- MBBS colleges there (Sikkim Manipal Institute of Medical Sciences, Gangtok; Helen Lepcha Sikkim Government
-- Medical College) and both are in our UG counselling data. One row makes the page; everything on it is read
-- from the data. Owner's OK, 2026-11-04. Inserts nothing if a Sikkim row already exists; undo by switching
-- the row off in Admin → MBBS States.
INSERT INTO mbbs_states (name, slug, colleges_count, is_active, created_at, updated_at)
SELECT 'Sikkim', 'sikkim', 2, true, now(), now()
 WHERE NOT EXISTS (SELECT 1 FROM mbbs_states WHERE slug = 'sikkim' OR lower(name) = 'sikkim');

SELECT id, name, slug, colleges_count, is_active FROM mbbs_states WHERE slug = 'sikkim';
