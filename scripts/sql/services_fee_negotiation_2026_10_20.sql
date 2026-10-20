-- /services: the direct fee-negotiation card (owner's request, 2026-10-20), placed after
-- "Fee & Budget Planning". Mirrors src/lib/servicesDefaults.ts. Idempotent: does nothing once
-- a card with this title exists, and only makes room while the seeded order is still in place.
-- Apply after the deploy that knows the "handshake" icon (ServicesClient.tsx).
BEGIN;

UPDATE content_blocks SET display_order = display_order + 1, updated_at = now()
 WHERE collection = 'services_page'
   AND display_order > (SELECT display_order FROM content_blocks
                         WHERE collection = 'services_page' AND title = 'Fee & Budget Planning' LIMIT 1)
   AND NOT EXISTS (SELECT 1 FROM content_blocks
                    WHERE collection = 'services_page' AND title = 'Direct Fee Negotiation with Colleges');

INSERT INTO content_blocks (collection, title, subtitle, body, icon, data, display_order, is_active)
SELECT 'services_page',
       'Direct Fee Negotiation with Colleges',
       'The best terms the college will put in writing.',
       'We deal directly with college admission and accounts offices to get you the best fee package the college will agree to — instalment plans, lump-sum or early-payment discounts where the college offers them, and fair hostel and deposit terms — confirmed in writing before you pay. The seat itself always comes through counselling; what we negotiate is how you pay for it.',
       'handshake',
       jsonb_build_object(
         'features', E'Direct contact with college admission and accounts offices\nInstalment plans in place of a full year''s fee upfront\nLump-sum and early-payment discounts, where the college offers them\nHostel, mess and caution-deposit charges compared and negotiated\nBank-guarantee and bond terms clarified before you commit\nEvery agreed term confirmed in writing, before any payment',
         'stat_value', 'Direct',
         'stat_label', 'With colleges'),
       COALESCE((SELECT display_order FROM content_blocks
                  WHERE collection = 'services_page' AND title = 'Fee & Budget Planning' LIMIT 1), 8) + 1,
       true
 WHERE NOT EXISTS (SELECT 1 FROM content_blocks
                    WHERE collection = 'services_page' AND title = 'Direct Fee Negotiation with Colleges');

UPDATE content_collections
   SET description = replace(description, 'upgrade or graduation', 'upgrade, graduation or handshake')
 WHERE slug = 'services_page' AND description NOT LIKE '%handshake%';

COMMIT;
