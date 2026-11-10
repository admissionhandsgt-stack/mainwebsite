-- The owner's own answers for the daily hunt (2026-11-10, owner: "aise detailed answers bane outreach mai post karne ke
-- liye… jo tumne banaya tha usko aur isko merge karke aisa system banake do"). A question whose words match an entry gets
-- the owner's answer as written; every other question gets one built from the site's data (lib/huntAnswers.ts).
-- Entries are written and edited in Admin → Outreach → Daily hunt → Saved answers.

CREATE TABLE IF NOT EXISTS hunt_library (
  id          serial PRIMARY KEY,
  -- Words the question must contain: groups separated by commas must all match, alternatives within a group by "|".
  -- "aiims, stipend | salary | pay" = AIIMS and any one of stipend, salary, pay.
  match       text NOT NULL,
  answer      text NOT NULL,
  page        text NOT NULL DEFAULT '/',      -- our page the answer links to (path)
  checked_on  date,                           -- when the owner last checked the facts in it
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- What a hunt item's answer came from: a saved answer, a builder (college, state-stipend, marks…) or the page's own line.
ALTER TABLE hunt_items ADD COLUMN IF NOT EXISTS kind text;

-- The owner's first saved answer, as he wrote it (AIIMS New Delhi's junior resident pay; INI-CET, not NEET PG).
INSERT INTO hunt_library (match, answer, page, checked_on)
SELECT 'aiims, stipend | salary | pay | ctc | in hand',
$a$At AIIMS New Delhi, a first-year MD/MS student gets about ₹1.21 lakh a month gross if living in the AIIMS hostel, and about ₹1.38 lakh without a hostel room (house rent allowance is then added). Technically it is a salary, not a stipend. AIIMS appoints its PG students as Junior Residents on Level 10 of the 7th Pay Commission pay matrix.

How the first-year figure adds up (Delhi, DA at 63% from 1 July 2026):

- Basic pay, Level 10: ₹56,100
- Non-practising allowance (20% of basic): ₹11,220
- Dearness allowance (63% of basic + NPA): ₹42,412
- Transport allowance (₹7,200 + DA): ₹11,736
- Total: ₹1,21,468 a month

If you are not given a hostel room, house rent allowance is added at 30% of basic (₹16,830). That makes ₹1,38,298.

Income tax is deducted at source, so the amount credited to your account is lower. Basic pay goes up by one increment each year: ₹57,800 in year 2 and ₹59,500 in year 3. DA is revised every January and July.

What you pay AIIMS: ₹2,027 for the whole course. That covers tuition (₹702), registration, lab, pot money, electricity, gymkhana and caution money. On top of that there is a ₹1,000 refundable hostel deposit. Hostel rent is nil.

Check these before you accept the seat:

- If you leave within six months of joining, you pay ₹3 lakh. If you leave after six months, you pay ₹5 lakh.
- AIIMS keeps your original certificates until you finish the course, unless you deposit ₹3 lakh.
- Sponsored and foreign-national candidates are not paid by AIIMS.
- Leave is 30 days in year 1 (earned pro rata) and 36 days each in years 2 and 3.

Source: AIIMS New Delhi's INI-CET Prospectus Part B. It says Junior Residents get an "entry pay of Rs. 56,100/- per month plus NPA and other allowances"; the fees are in section 13. The DA rate is from the Union Cabinet decision of 28 October 2026. I worked out the totals above from those two, so your pay slip may differ by a few hundred rupees.

AIIMS Delhi admits through INI-CET, not NEET-PG, so it does not appear in NEET-PG stipend lists. For comparison, Delhi's NEET-PG government colleges that publish a stipend figure have a median of ₹1,26,927 a month, the highest of any state. The full state-wise table is free and needs no sign-up: https://www.admissionhands.com/md-ms-india/stipend

(I'm an admission counsellor at Admission Hands. Happy to answer follow-up questions in the comments.)

Gulshan Tomar
Expert Admission Counsellor, Admission Hands
+91 92206 26002
gulshantomar@admissionhands.com | www.admissionhands.com$a$,
'/md-ms-india/stipend', DATE '2026-11-10'
WHERE NOT EXISTS (SELECT 1 FROM hunt_library WHERE match ILIKE 'aiims%');
