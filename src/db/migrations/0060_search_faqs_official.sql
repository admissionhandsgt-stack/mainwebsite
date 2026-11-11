-- Search answers from official pages (2026-11-11, owner: "jinka result nhi hai hamare DB mai unka MCC ya authorised
-- bodies ke website se… dhundke verify karke laga sakte hai… Gemini key"). When no data builder answers a search,
-- lib/officialAnswer.ts finds it on an official site (gov.in, nic.in, MCC, NMC, NBEMS, the state boards), Gemini copies the
-- answer out of that page's own text, and every figure is checked against the text. Such an answer cannot be rebuilt
-- from our data, so it is stored with its source and the day it was checked; it is shown for 45 days, then re-checked.
ALTER TABLE search_faqs ADD COLUMN IF NOT EXISTS answer     jsonb;
ALTER TABLE search_faqs ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE search_faqs ADD COLUMN IF NOT EXISTS as_of      text;
ALTER TABLE search_faqs ADD COLUMN IF NOT EXISTS checked_on date;
