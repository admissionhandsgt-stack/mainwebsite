# AdmissionHands — online presence plan (2026-10-09)

Goal: when someone searches "Admission Hands", "NEET counselling Noida" or a counsellor's name, Google
shows one consistent, trustworthy business — map listing, reviews, website, social profiles, people.
Google judges a business by **consistency** (same name, address, phone everywhere), **activity**
(reviews, posts) and **corroboration** (other sites mentioning it). Age helps only if it is visible.

Legend: 🧑 = owner/team (needs your login) · 🤖 = done or doable in the website code.

## 0. Master details — copy exactly, everywhere

| Field | Value |
|---|---|
| Name | AdmissionHands *(pick one spelling — "AdmissionHands" or "Admission Hands" — and never mix)* |
| Address | 915, Bhutani City Center, Sector 32, Noida, Uttar Pradesh 201301 |
| Phone | +91 93103 01949 |
| WhatsApp | +91 93103 01949 |
| Email | info@admissionhands.com |
| Website | https://www.admissionhands.com |
| Hours | Monday–Sunday 10:00 AM – 10:00 PM |
| Founded | **[YEAR — to confirm]** |
| Category | Educational consultant (secondary: Career guidance service) |

**Short bio (≤160 characters)** — Instagram, X, YouTube tagline:
> NEET UG & PG counselling for MBBS, BDS and MD/MS since [YEAR]. Published closing ranks, every round, until you report. Noida · pan-India.

**Long description (~700 characters)** — Facebook About, LinkedIn, Justdial, Sulekha:
> AdmissionHands has guided NEET students and their families since [YEAR] through MBBS, BDS and MD/MS
> admissions in India — All India Quota, state quota, deemed universities and NRI quota. Our advice is
> built on the counselling authorities' own published closing ranks, so a family can see which colleges
> a rank has actually reached, quota by quota, and what those seats cost. We help with college
> shortlisting, choice filling, round-by-round upgrade decisions, documents and college reporting.
> Counselling is available across India by phone, WhatsApp and video, and in person at our office in
> Bhutani City Center, Sector 32, Noida.

## Week 1 — the profiles Google trusts most

| # | Task | Who | Time |
|---|---|---|---|
| 1 | **Google Business Profile** — full kit in `docs/gbp-setup.md` (signboard up before the verification video) | 🧑 | 20 min + video |
| 2 | **Facebook page** "Admission Hands \| Noida": replace the About text (it still says MBA, B.Tech, BBA, BCA … abroad) with the long description; set category, address, hours, website, a WhatsApp button | 🧑 | 15 min |
| 3 | **Instagram** @admissionhandss: short bio, website link, contact button. If @admissionhands is free, move to it — the double "s" splits searches | 🧑 | 10 min |
| 4 | **YouTube** @admissionhands: About = long description, links to website + Instagram, a banner | 🧑 | 15 min |
| 5 | **LinkedIn company page** "AdmissionHands" — logo `https://www.admissionhands.com/icon-512.png`, cover `…/assets/images/og/admissionhands-1200x630.jpg`, founded year, size, website | 🧑 | 15 min |
| 6 | **Each counsellor's own LinkedIn** lists AdmissionHands as current employer, with the title from their card — this links the people to the company | 🧑 ×4 | 10 min each |
| 7 | **X (Twitter)** @admissionhands — short bio, website, pinned post linking the seat predictor | 🧑 | 10 min |
| 8 | Send me every profile URL → I add them to the website's `sameAs`, which is how Google ties them to one business | 🤖 | — |

## Week 2 — directories (same NAP, character for character)

| # | Where | Note |
|---|---|---|
| 9 | **Bing Places** (bing.com/business) | "Import from Google" once the GBP is verified — 5 minutes; feeds Bing, Copilot, Windows Maps |
| 10 | **Apple Business Connect** (businessconnect.apple.com) | iPhone Maps and Siri |
| 11 | **Justdial** | Most-used Indian directory; claim the free listing, decline paid packages |
| 12 | **Sulekha** | Category: education consultants |
| 13 | **Google Search Console → Bing Webmaster Tools** | Import the verified site with one click at bing.com/webmasters (sitemap comes along) |

Do **not** buy listings on dozens of directories — five consistent ones beat fifty inconsistent ones.

## Ongoing — what keeps a profile ranking

- **Reviews (most important).** After a student is placed, send the GBP review link on WhatsApp.
  2–3 a week, steady. Reply to every review within a day, in the reviewer's language. Never pay for,
  bribe or self-write reviews — Google removes them and can suspend the profile.
- **GBP posts** — one a week during counselling season, timed to MCC dates (the website's
  /neet-pg-process now carries the 2026 schedule): "Round 1 results today — what to do next".
- **Photos** — office, signboard, team, counselling sessions (with consent). Add a few each month.
- **YouTube** — one short explainer per data page (cutoff, stipend, NRI fees) with the page link in
  the description. Videos are the strongest single signal for AI answers (ChatGPT, Google AI Overviews).
- **Mentions** — pitch the stipend report (`/reports/neet-pg-stipend-2026`) to education journalists;
  answer NEET questions on Quora/Reddit as a named counsellor, disclosing who you are. Never auto-post.

## Already done on the website 🤖

- One address, phone and hours everywhere: footer, `/contact`, Organization + ProfessionalService
  schema (`OFFICE` in `src/lib/constants.ts`).
- `/contact` (map link, hours, call-back form) — the URL to give the GBP.
- `/team` — every counsellor named, with Person schema linked to the business, and a shareable card
  each (`www.admissionhands.com/<name>`).
- Search Console verified, sitemap submitted, IndexNow for Bing.

## Waiting on you

1. The **year AdmissionHands started** — the site says "12+ years" in several places; with the real
   year it is computed everywhere from one value and added to the schema (`foundingDate`).
2. The **registered name** (e.g. "… Pvt Ltd" / proprietorship name) if you want it shown — it goes in
   the schema as `legalName` and builds trust on the Know-us page.
3. **Profile URLs** as each one is created (step 8).
4. **Photos** of the four counsellors (square, clear face) — for the cards, `/team` and GBP.
