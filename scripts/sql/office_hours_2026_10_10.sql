-- Office open every day, 10 AM - 10 PM, from 2026-10-10. The legal "contact"
-- document carries the hours in its own text. Guarded on the old wording.
UPDATE legal_documents
   SET content = replace(content,
         '**Office Hours:** Monday to Saturday, 10:00 AM – 7:00 PM IST',
         '**Office Hours:** Monday to Sunday, 10:00 AM – 10:00 PM IST'),
       updated_at = now()
 WHERE slug = 'contact'
   AND position('**Office Hours:** Monday to Saturday, 10:00 AM – 7:00 PM IST' in content) > 0;
