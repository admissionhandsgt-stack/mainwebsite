# Content Quality: www.admissionhands.com

Audited 2026-10-09. 18 pages rendered with `render_page.py --mode auto` (all were server-rendered, so raw mode was used). I also checked metadata on 21 more template pages from the sitemap (3,760 URLs) and read robots.txt and llms.txt. Everything was read-only: no forms were submitted and no auth, lead or unlock endpoints were called.

## Scores

| Metric | Score |
|---|---|
| **Content Quality (overall)** | **61 / 100** |
| E-E-A-T (weighted) | 54 / 100 |
| AI citation readiness | 72 / 100 |
| Templated-metadata risk | low (0 of 39 pairs templated, no shared CTA phrases) |

The site has two different standards of content. The data pages are rigorous and can be cited: /neet-pg-cutoff, /neet-ug-cutoff, /md-ms-india/stipend, /reports/neet-pg-stipend-2026, /neet-pg-process and the branch pages. The older marketing pages are not: /, /mbbs-india, /md-ms-india, /nri-quota, /services, /know-us and /neet-ug-process. They still carry outcome claims nobody can check, figures typed in by hand that contradict the database, and some factual errors. The marketing pages pull the trust score down, and the trust score is the factor this model weights most.

### E-E-A-T breakdown (internal model: Google publishes no weights)

| Factor | Weight | Score | Evidence |
|---|---|---|---|
| Experience | 20% | 55 | Real first-hand guidance on /neet-pg-process ("Where people lose a seat: Filling a short list...", float-or-freeze, "Four mistakes that cost people a seat"). No case studies, no named counsellors, and the testimonials can't be verified. |
| Expertise | 25% | 58 | The data pages define their terms precisely ("Round 1 close : the tightest seat in round 1. Last admitted : the furthest any round reached") and state their method. The weaknesses: factual errors on the NRI and PG pages, and no author or reviewer credentials anywhere. |
| Authoritativeness | 25% | 50 | Strong citation tooling: cite box, CSV, embed, Report and Dataset schema, llms.txt. But no data page links to the MCC or state result documents it quotes, nobody is named, and earlier audits found backlinks at almost zero. |
| Trustworthiness | 30% | 52 | Positives: NAP on /know-us (915 Bhutani City Center, Noida; phone; email), a non-affiliation disclaimer, terms/privacy/DPDP at /terms, and CC credits on images. Negatives: the 0% / 85% / 100% outcome claims, "India's Most Trusted", "Direct College Connections", stats that contradict each other, FAQ schema that doesn't match the page, and three different seat counts on one page. |

Weighted: 0.20x55 + 0.25x58 + 0.25x50 + 0.30x52 = **53.6**

### Per-page snapshot

Word counts are main-content words, with header, nav and footer stripped. FK is Flesch-Kincaid grade.

| Page | Words | FK | Page type / floor | Verdict |
|---|---|---|---|---|
| / | 951 | 12.7 | Home / 500 | OK on length. Has unsourced stats and testimonials that can't be verified |
| /neet-college-predictor | 173 | 7.6 | Tool | Thin explanatory copy for a tool. Add how the bands work and an FAQ |
| /mbbs-india | 1,077 | 13.5 | Service / 800 | Hand-typed stats contradict the database. Says "5+ years... to predict". FAQ schema with no visible FAQ |
| /md-ms-india | 1,133 | 14.9 | Service / 800 | "Zero document rejection guarantee", "200 MCQs". FAQ answers missing from the HTML |
| /nri-quota | 765 | 13.5 | Service / 800 | Factual errors (age 17-25; NEET "for most colleges"). Below the floor. FAQ answers missing from the HTML |
| /neet-pg-cutoff | 1,109 | 15.1 | Data hub | Strong: answer-first, cite box |
| /neet-ug-cutoff | 953 | 9.8 | Data hub | Strong |
| /md-ms-india/stipend | 1,309 | 16.8 | Data hub | Strong. Outliers and duplicate institutions in the table |
| /reports/neet-pg-stipend-2026 | 602 | 13.3 | Data report | Strong. Has a method section. No byline and no source link |
| /neet-pg-process | 1,120 | 10.3 | Guide / 1,500 | Best editorial page on the site. The R2-R4 details are missing from the HTML |
| /neet-ug-process | 449 | 15.3 | Guide / 1,500 | Thin. Promises "15 critical milestones" but only step 1 is in the HTML |
| /services | 811 | 12.1 | Service / 800 | "0% rejection rate", "85% Upgrade Success", "100% Reporting Success" |
| /know-us (/about returns 404) | 1,105 | 13.2 | About | No team, although the meta description says "Meet the team". Hype wording |
| UG college pages (2 sampled) | 435-554 | 9.4 | Programmatic | Unique data but small. "Seats 0", a broken fee sentence, off-stream "Similar colleges" |
| PG college pages (2 sampled) | 737-1,140 | 9.9-12.2 | Programmatic | Better: Est., university, beds, fee/stipend/net. Seat counts contradict each other |
| /md-ms-india/branches/md-anaesthesiology | 693 | 8.8 | Programmatic | Good. Three different seat totals. Quota codes not explained |

The content_quality.py heuristic gave 83-99 to every page. It detects filler and AI phrasing patterns, and these pages have none. The real problems are about accuracy and consistency, which that tool can't see, so the scores in this report come from manual review.

---

## Findings

### HIGH-1: Outcome guarantees and "prediction" claims are still live, which contradicts the site's own policy
The project removed "95% accuracy", "100% verification success" and "Zero document rejection guarantee" in earlier passes, but similar claims are still live:

- https://www.admissionhands.com/services: "Our students have a 0% rejection rate on documentation."; "85% Upgrade Success"; "100% Reporting Success"; "Zero rejection. Zero surprises."; "2100+ Students Placed". Source: `src/app/services/ServicesClient.tsx` lines 164, 180, 443.
- https://www.admissionhands.com/md-ms-india: "Zero document rejection guarantee"; "Zero Rejection Documentation". This text wasn't found in `src/`, so it is probably a CMS row in `content_blocks` or `site_settings`.
- https://www.admissionhands.com/know-us: "India's Most Trusted Medical Admission Advisory" (`src/app/know-us/KnowUsClient.tsx:71`); "Zero document rejection track record" (`:152`); "proprietary cutoff intelligence"; "the secret weapon behind 2100+ successful MBBS and PG admissions"; process step 02 promises "cutoff predictions".
- https://www.admissionhands.com/mbbs-india: "Our data models analyze 5+ years of cutoff trends to predict the best colleges"; "Powered by 5+ years of cutoff data and real-time analytics" (`src/data/mbbs-india.ts:40`, `:142`). The database holds 2 years per level. llms.txt says "nothing is predicted", so the page contradicts it.

**Why it matters:** this is a YMYL-adjacent decision, with seats costing up to Rs 1.6 Cr. Success-rate claims that can't be checked are a direct Trust negative under the QRG. They also sit beside "Published, not predicted", so the copy argues with itself. India's CCPA *Guidelines for Prevention of Misleading Advertisement in Coaching Sector (2024)* target success-rate and guarantee claims in education services. Whether they apply to counselling needs a legal check.

**Fix:** Delete the percentage stats from the four ServicesClient service cards and replace each with a verifiable description, such as "State-wise document checklist, checked before reporting". Change "5+ years... predict" to "two counselling years (UG 2025-26, PG 2024-25) of published closing ranks", read from `getDataStats()`. Remove "Most Trusted", "secret weapon" and "proprietary". Add these strings to the claims check in `scripts/smoke.mjs` so they can't come back through a CMS row.

### HIGH-2: Factual errors in eligibility and exam guidance
- https://www.admissionhands.com/nri-quota: "Age between 17-25 years". NEET UG has had no upper age limit since the 2022 cycle. (`src/components/nri/NRIEligibility.tsx:121`)
- Same page: "NEET qualification (for most colleges)" and "Some deemed universities accept international qualifications". NEET is mandatory for every MBBS/BDS admission in India, including NRI, OCI and foreign-national seats. (`NRIEligibility.tsx:40`)
- Same page: "English language proficiency" is listed as a general requirement, and "Interview Preparation: Professional coaching for college interviews". Indian MBBS NRI seats are allotted on NEET merit, so both are misleading.
- https://www.admissionhands.com/md-ms-india: "National-level entrance by NBE. Computer-based, 200 MCQs" and "Computer-based exam with 200 MCQs" (`src/components/md-ms/PGOverview.tsx:10`, `PGAdmissionProcess.tsx:26`). The site's own `lib/neetLimits.ts` says NEET PG moved to 180 questions in 2026. The body is also NBEMS, not NBE.
- Round naming contradicts itself. /md-ms-india says "4 rounds typically: Round 1, Round 2, Mop-Up, and Stray Vacancy" in one block and "R1, R2, R3, Stray" in another. /know-us says "R1, R2, Mop-Up, and Stray". /neet-pg-process says "Rounds our PG data covers R1 - R5".

**Fix:** Correct the four NRI statements. Remove the interview-coaching card. Change PG to "NBEMS, 180 questions (2026)" and pull the number from `neetLimits.ts` so it changes in one place each cycle. Standardise round names on MCC's current scheme (R1, R2, R3, Stray) everywhere. Have a counsellor review the NRI page and show a "Reviewed by <name>, <date>" line (see MED-1).

### HIGH-3: Hand-typed numbers contradict each other and the database
- https://www.admissionhands.com/ says "Govt vs Private Seats 45% : 55%". https://www.admissionhands.com/mbbs-india says "55,000+ Government Seats 53,000+ Private Seats", which is about 51:49 government-majority.
- /mbbs-india: "Total Colleges 706+", "Govt Colleges 380+", "Private Colleges 300+", "1,08,940+ Total MBBS Seats" (also repeated in its FAQPage JSON-LD). None of these is dated or sourced, and the site's own MBBS directory lists 839 colleges.
- Fee ranges typed in by hand while the site holds real fee data. /mbbs-india: "Private Colleges Rs 5L - Rs 25L/yr... Management Quota Rs 15L - Rs 40L/yr". / : "private college fees range Rs 10L to Rs 25L/year". /nri-quota: "Government Colleges NRI Quota Seats Annual Tuition Fee Rs 15-25 Lakhs... Total Rs 85-1.35 Cr". /services: "Rs 5L-2Cr Budget Range".
- State coverage: "36 States Covered" and "38 States Covered" both appear on /services. /know-us and /mbbs-india say "36 state counsellings". The data covers 34 UG states and 41 counsellings.
- The same 2100+ figure is labelled "Students Guided", "Families Guided", "Doctors Guided", "Students Placed" and "Admits" on different pages, and /mbbs-india adds an unexplained "+1k". /nri-quota says "helped hundreds of students" (`src/components/nri/NRICTA.tsx:85`).

**Fix:** Every number that describes the data must come from `getDataStats()`, as the project rules already require. Replace the typed fee ranges with database medians and 10th-90th percentiles, labelled with year and quota, using the method /md-ms-india/private-college-fees already uses, and link to /nri-quota/fees and /management-quota. Pick one label for the 2100+ figure, for example "families counselled since <year>", and use it everywhere. Remove "+1k". If the NMC seat totals stay, cite and date them: "NMC, 2025-26: N seats".

### HIGH-4: Key content is missing from the HTML, and FAQ schema doesn't match what's on the page
- FAQ answers aren't in the server HTML on https://www.admissionhands.com/nri-quota ("Is NEET mandatory for NRI quota admissions?" has no answer text in the DOM) or on https://www.admissionhands.com/md-ms-india ("What is the eligibility for NEET PG counselling?", "How is Admission Hands different from other counselling services?"). The accordion only renders the answer after a click.
- FAQPage JSON-LD doesn't match visible content. /mbbs-india marks up 5 Q&As ("What is the eligibility criteria for MBBS admission in India?", "How many MBBS seats are available in India?"...) and none of them appears on the page. /nri-quota marks up 2 Q&As ("What is NRI Quota in medical admissions?", "Who is eligible for NRI Quota?") that also aren't visible, while the 5 questions that are visible have no markup. Google's structured-data guidelines require markup to describe visible content.
- https://www.admissionhands.com/neet-ug-process says "We break down the 15 critical milestones" but only step 1 has body text in the HTML. Steps 2-15 are tab state. The page has 449 words.
- https://www.admissionhands.com/neet-pg-process: R2 ("upgrade, or hold what you have"), R3/mop-up and Stray show a one-line teaser each. Their detailed rules, such as free exit and forfeiture, are missing from the HTML. These are the most citable paragraphs on the site.

**Fix:** Render every accordion and tab body on the server. Use `<details>`/`<summary>`, or keep the content in the DOM and hide it with CSS, rather than mounting it on click. Generate FAQPage JSON-LD from the same array the visible FAQ renders from, so the two can't drift. On /mbbs-india, either show the 5 FAQs or drop the markup.

### HIGH-5: Programmatic college pages have duplicate entities, mislabels and contradictory figures
(These pages are about 3,480 of 3,760 sitemap URLs. Defer to `seo-programmatic` for the full gating policy.)

- **Duplicate entity pages.** At least 21 exact-name pairs among the 2,168 PG pages, each with a self-canonical and indexable. For example:
  - /md-ms-india/colleges/christian-medical-college-vellore: "252 PG seats across 28 branches"
  - /md-ms-india/colleges/christian-medical-college-vellore-tamil-nadu-632002: "2 PG seats across 1 branches"

  More cases: Hindu Rao Hospital (`-delhi` and `-delhi-110007`), RML Lucknow x2, KMC Mangalore (`kasturba-medical-college-mangalore` and `kasturba-medical-college-hospital-kmc-hospital-mangalore-karnataka-575001`), ESI Basaidarapur x2. These are the MCC entry and the NBEMS/DNB entry for the same hospital, published as separate pages that compete for the same query, and one of them understates the college badly.
- **Wrong course label.** 1,472 of 2,168 PG URLs carry a PIN-code name; these are NBEMS hospitals offering DNB or diplomas. They are titled "MD/MS Cutoff", for example "Fehmicare Hospital, Hyderabad, Telangana MD/MS Cutoff". Gurukripa Hospitals' FAQ says "How many MD/MS seats... 6 seats", but its rows are "DNB Orthopedics Surgery" and "Diploma in ...-NBE".
- **Title year doesn't match the data.** "Maulana Azad Medical College, New Delhi - MD/MS Cutoff 2026" and "Christian Medical College, Vellore - MD/MS Cutoff & Fees 2026", but the page body says "Years 2024-2025" and "In 2025, the hardest seat...". The branch pages correctly say "Cutoff 2025".
- **Three seat counts on one page.** MAMC shows "244 PG seats" in the hero, "Seats 792" in the summary, and "for 83 of its 158 seats" in the FAQ. Gurukripa shows "6 PG seats" and "Seats 19". MD Anaesthesiology shows "Seats 3,850", "Seats 4,368" and "524 of the 727 GEN seats". These figures can't be quoted safely, and an AI answer engine will pick one of them at random.
- **UG template bugs.**
  - "Seats 0" next to every quota (/mbbs-india/colleges/aarupadai-veedu-medical-college-pondicherry-ug: "Deemed 0 9,18,859 - 11,82,026"; /mbbs-india/colleges/government-medical-college-bhadradri-telangana-ug: "All India Quota 0 20,375 - 1,51,630"). It reads as "no seats".
  - The fee FAQ renders null quotas: "From Rs 19.50 lakh a year on a — seat to Rs 30.00 lakh on a — seat". UG fees never carry a quota, so every UG page with a fee range will show this.
  - "Similar colleges" for an MBBS college lists dental and AYUSH colleges, e.g. Bhadradri GMC -> "Kamineni Institute of Dental Sciences", "Malla Reddy Dental College for Women".
  - The "largest move" FAQ leaves out quota and category ("MBBS, which closed at 1,06,101 in round 1 and reached 1,33,388"), which breaks the site's own one-row-one-seat rule.
- **Template share.** Comparing 5-word sequences, about 50-64% of a UG college page and 44-58% of a PG college page is text shared with every other page. The unique part (per-quota rank ranges, round movement, fee, stipend and net cost) is real value no competitor publishes this way. On pages with only 1-2 cutoff rows and "Seats 0", though, it is too little to stand on its own.

**Fix:**
1. Merge duplicate institutions under one canonical slug (the MCC name), with a 301 from the PIN-code variant, and show the DNB/NBEMS seats as a section on the merged page.
2. Title each page by what it actually offers: "DNB & Diploma Cutoff" when there are no MD/MS rows. Fix "MD/MS seats" in the FAQ the same way.
3. Take the title year from `MAX(latest_year)` for that institute.
4. Define one seat figure (seats in the published matrix for the latest year) and use it in the hero, summary and FAQ. Rename the others, e.g. "792 seat-category rows" or "158 seats with a later round".
5. Hide the Seats column when it is 0 or unknown. Rewrite the UG fee sentence as "Rs 19.50-30.00 lakh a year (the source does not say which quota each fee is for)".
6. Filter "Similar colleges" to the same course.
7. Name quota and category in the round-move FAQ.
8. Consider `noindex` for pages below a threshold (for example under 3 cutoff rows and no fee) until they gain data.

### MED-1: No named people anywhere, although this is a YMYL-adjacent service
None of the 18 pages names a counsellor, founder or reviewer. /know-us has the meta description "Meet the team, read how we work from published counselling data...", but there is no team on the page. The report's JSON-LD author is a bare `Organization`. https://www.admissionhands.com/about returns 404.

**Fix:** Add a team section to /know-us with names, roles, years in counselling, and states or authorities each person specialises in. Add "Written by / Reviewed by <counsellor>, <date>" on /neet-pg-process, /neet-ug-process, /nri-quota and /reports/*. Use `Person` schema in `author` and `reviewedBy`, and `founder` on Organization. 301 /about to /know-us.

### MED-2: Testimonials can't be verified
https://www.admissionhands.com/ shows "Dr. Ananya Sharma, MBBS - AIIMS Jodhpur, Round 1 AIQ Selection", "Rahul Verma, MD Radiology - KMC Manipal" and "Priya Nair, MBBS - GMC Trivandrum", with initials-only avatars, no year and five-star glyphs (`src/components/home/Testimonials.tsx`). The names look like stock names. The AIIMS round-1 story also undercuts the counselling pitch, because a rank that takes AIIMS in R1 needs little choice-ordering help.

**Fix:** Replace them with consented testimonials that give the year, the rank band, and a redacted allotment-letter snippet or a video link, ideally ones where counselling changed the outcome (float or freeze, state vs AIQ). If verified testimonials aren't available, remove the section.

### MED-3: "Direct College Connections" reads like management-seat brokering
https://www.admissionhands.com/nri-quota: "Direct College Connections: We have established relationships with top medical colleges across India." (`src/components/nri/NRICTA.tsx:8`). This contradicts /know-us ("Merit-Driven Strategy... through the official counselling system") and is a trust red flag in this sector. **Fix:** remove it, or replace it with "We track every NRI seat's published fee and closing rank".

### MED-4: The data pages never link to the source they cite
/neet-pg-cutoff ("from MCC's published round results"), /neet-ug-cutoff, /md-ms-india/stipend ("as each college publishes it") and /reports/neet-pg-stipend-2026 have no outbound link to mcc.nic.in, NBEMS or a state authority. The only external links on these pages come from the alerts bar. **Fix:** add a "Sources" block listing each result PDF or page used (authority, round, year, retrieval date, link). This is a strong Trust signal and gives AI answer engines a provenance chain to follow.

### MED-5: Freshness isn't visible
No data page shows "Data as of ..." or "Last updated". Only the report has `datePublished` (2026-10-08). **Fix:** show "Data: MCC NEET PG 2025, R1-Stray - updated <date>" under each H1 and add `dateModified` to the WebPage JSON-LD, driven by `institutes.updated_at` or the level's newest import, the same value the sitemap `lastmod` already uses.

### MED-6: The marketing copy is hard to read for this audience
The audience is Indian parents and students, often reading in a second language on a phone. The marketing pages score Flesch-Kincaid grade 12.7-15.3 (Flesch Reading Ease 18-38): /md-ms-india 14.9, /neet-ug-process 15.3, /nri-quota 13.5. The data pages score 8.8-10.3. The marketing copy also uses hype wording: "We Don't Just Guide. We Engineer Admissions.", "precision admission engineering", "Document rejection is the #1 silent killer of confirmed seats", "Bulletproof Documentation", "Your Unfair Advantage". Several H1s are slogans with no topic in them (/md-ms-india: "Your MBBS Was the Beginning. Your Specialty Defines Your Legacy."; /services: "Your Unfair Advantage in MBBS Admissions", although the page covers PG too). **Fix:** rewrite to the voice of /neet-pg-process (grade 9-10, concrete). Make each H1 state the topic, e.g. "NEET PG counselling for MD/MS: AIQ, state and deemed".

### MED-7: /neet-ug-process is thin next to its PG equivalent
At 449 words, with the steps hidden, the UG guide covers the larger audience far less well than /neet-pg-process (1,120 words, specific, first-hand). Its claim "Every year, thousands of students lose their seats" has no source. It also invites a "personalized roadmap based on your predicted rank", which contradicts the no-prediction position. **Fix:** rebuild it on the PG page's structure (two counsellings, rounds in order, float or freeze with UG numbers, documents, four mistakes), all rendered on the server.

### MED-8: The stipend table has outliers and duplicate institutions
https://www.admissionhands.com/md-ms-india/stipend shows the Karnataka range starting at "Rs 5,000" and Pondicherry at "Rs 7,000", which are probably source slips. The top-25 list double-counts institutions: "Hindu Rao Hospital, Delhi-110007" and "Hindu Rao Hospital, Delhi"; "PGIMER, Dr Ram Manohar Lohia Hospital, Delhi-110001" and "Atal Bihari Vajpayee Institute... Dr RML Hospital (Prev. PGIMER Dr RML Hospital)"; "ESI Hospital, Basaidarapur, Delhi-110015" and "ESI-PGIMSR, ESI-Hospital, Basaidarapur". **Fix:** show p10-p90 instead of min-max, as the fee pages already do, and remove duplicates once the entities are merged (HIGH-5).

### LOW
- Grammar in metadata: "1 PG seats across 1 branches" (Fehmicare, Sanjay Gandhi Institute, Prakash Netra Kendr). Fix the pluralisation.
- Source typos carried into H1s and titles: "Piprali Raod", "Prakash Netra Kendr", "Employees State Insurance Coporation". Add a name-normalisation map. Site typos: "a probabability" (/know-us) and "2,168 PG college" (/md-ms-india).
- MAMC's fee table repeats an identical row 42 times (Rs 16,200 / Rs 16,000 / Rs 1.32 L). When every branch has the same values, collapse them into one row: "All 21 branches, AIQ and DU".
- Quota codes on branch pages are never explained (IP, JM, MM, DU, AMU, MNG, GM, OPN). Add a short glossary and tooltips; it helps readers and gives entity definitions to AI.
- PG college FAQs repeat the full address name up to 10 times ("Gurukripa Hospitals, Jyoti Nagar, Piprali Raod, Sikar, Rajasthan-332001"). Use the short name after the first mention.
- /neet-college-predictor has 173 words of copy. Add a 150-250-word "How the bands work" section (safe, likely, possible, stretch, with definitions) and 3 FAQs.
- UG dental and AYUSH college pages sit under /mbbs-india/colleges/ (about 471 of 1,310 URLs, e.g. "SDM College of Dental Sciences & Hospital,Dharwad BDS Cutoff"). This is a taxonomy mismatch; consider /bds-india/colleges/ for future URLs.

## What is working (keep it)
- **The data hubs are first-rate citation assets.** /neet-pg-cutoff and /neet-ug-cutoff answer first with exact figures ("general-category seats closed from AIR 15 in round 1 ... to AIR 1,87,915"), define their terms, and separate the qualifying percentile from the admission cutoff. The 2026 rounds-in-progress are labelled separately.
- **The cite box, CSV, embed, Report schema and /data page** make the site easy to cite. llms.txt is excellent: it explains how to read the numbers.
- **The report has a method section** ("States with fewer than three publishing colleges are left out... Colleges that publish no stipend are not counted as paying none").
- **/neet-pg-process** has real experience: "An unlocked list is auto-locked as it stands, which is how people end up allotted to a choice they meant to delete."
- **Honest limits:** "Where a figure is missing the authority did not publish it — we do not estimate one"; "A range: the source does not say which quota each fee belongs to."
- **Image credits with CC licences, a non-affiliation disclaimer on /mbbs-india, and a full address on /know-us.**
- **The gated design is coherent.** The per-quota summaries anonymous visitors see are themselves quotable.

## AI citation readiness: 72/100
Strengths: llms.txt; answer-first FAQs with numbers on the hubs and college pages; consistent definitions; Report, Dataset and BreadcrumbList schema; cite box. The gaps that cost points: FAQ and process content missing from the HTML (HIGH-4); contradictory seat counts (HIGH-5); no source links or visible dates (MED-4, MED-5); no named authors (MED-1). AI crawlers are not verified crawlers, so they only see the summary layer of gated pages. That's fine by design, as long as the summaries carry the year, the source and one consistent seat figure.

## Metadata templating (metadata_template.py, 39 pairs)
`site_risk: low`, `templated_ratio: 0.0`, `shared_cta_phrases: {}`. Descriptions are built from data and differ per page. The only secondary problems are the pluralisation bug and the title year mismatch (HIGH-5).

---

## Structured findings (for audit-data.json -> Content Quality)

```json
{
  "category": "Content Quality",
  "score": 61,
  "eeat": {"experience": 55, "expertise": 58, "authoritativeness": 50, "trustworthiness": 52, "weighted": 54},
  "ai_citation_readiness": 72,
  "metadata_template": {"site_risk": "low", "templated_ratio": 0.0, "pages_checked": 39, "shared_cta_phrases": {}},
  "findings": [
    {"id": "content-unverifiable-outcome-claims", "severity": "high", "urls": ["/services", "/md-ms-india", "/know-us", "/mbbs-india"], "evidence": "\"Our students have a 0% rejection rate on documentation.\"; \"85% Upgrade Success\"; \"100% Reporting Success\"; \"Zero document rejection guarantee\"; \"India's Most Trusted\"; \"5+ years of cutoff trends to predict\"", "fix": "Remove percentage/guarantee claims (ServicesClient.tsx:164,180,443; KnowUsClient.tsx:71,152; data/mbbs-india.ts:40,142; CMS rows); derive data claims from getDataStats(); add strings to the smoke.mjs claims check"},
    {"id": "content-factual-errors", "severity": "high", "urls": ["/nri-quota", "/md-ms-india"], "evidence": "\"Age between 17-25 years\"; \"NEET qualification (for most colleges)\"; \"Some deemed universities accept international qualifications\"; \"200 MCQs\"; \"Conducted by NBE\"", "fix": "No upper age limit; NEET mandatory for all MBBS/BDS incl. NRI; NBEMS, 180 questions (2026) from neetLimits.ts; standardise round names"},
    {"id": "content-hardcoded-stats-contradict-db", "severity": "high", "urls": ["/", "/mbbs-india", "/nri-quota", "/services"], "evidence": "Home \"45% : 55%\" vs /mbbs-india \"55,000+ Government Seats 53,000+ Private Seats\"; \"706+\" colleges vs 839 in directory; \"36 States Covered\" and \"38 States Covered\" on same page; NRI \"Rs 15-25 Lakhs\" govt NRI tuition", "fix": "Read every data stat from getDataStats(); replace typed fee ranges with DB median/p10-p90 by quota and year; one label for 2100+"},
    {"id": "content-hidden-faq-and-schema-mismatch", "severity": "high", "urls": ["/nri-quota", "/md-ms-india", "/mbbs-india", "/neet-ug-process", "/neet-pg-process"], "evidence": "FAQ answers absent from server HTML; FAQPage JSON-LD on /mbbs-india (5 Q) and /nri-quota (2 Q) not visible on page; UG process steps 2-15 and PG R2-R4 detail absent", "fix": "Render accordions/tabs server-side (<details>); generate FAQPage JSON-LD from the visible FAQ array"},
    {"id": "content-programmatic-duplicates-and-mislabels", "severity": "high", "urls": ["/md-ms-india/colleges/christian-medical-college-vellore", "/md-ms-india/colleges/christian-medical-college-vellore-tamil-nadu-632002", "/md-ms-india/colleges/maulana-azad-medical-college-new-delhi", "/mbbs-india/colleges/aarupadai-veedu-medical-college-pondicherry-ug", "/md-ms-india/branches/md-anaesthesiology"], "evidence": ">=21 duplicate institution pairs (CMC Vellore 252 vs 2 seats); 1,472 DNB hospital pages titled 'MD/MS Cutoff'; title 'Cutoff 2026' on 2024-25 data; MAMC 244/792/158 seats; UG 'Seats 0'; 'on a — seat'; dental colleges as Similar colleges for MBBS", "fix": "301-merge duplicate entities; label DNB/Diploma correctly; year from data; one seat definition; hide zero seats; fix null-quota sentence; same-course similar colleges; noindex below data threshold"},
    {"id": "content-no-named-authors", "severity": "medium", "urls": ["/know-us", "/neet-pg-process", "/nri-quota", "/reports/neet-pg-stipend-2026", "/about"], "evidence": "No person named sitewide; meta says 'Meet the team' but no team; /about 404", "fix": "Team profiles with credentials; Written/Reviewed by with dates; Person schema; 301 /about -> /know-us"},
    {"id": "content-unverifiable-testimonials", "severity": "medium", "urls": ["/"], "evidence": "\"Dr. Ananya Sharma MBBS - AIIMS Jodhpur Round 1 AIQ Selection\"; initials-only avatars, no year", "fix": "Consented, dated testimonials with rank band and redacted allotment proof, or remove"},
    {"id": "content-college-connections-claim", "severity": "medium", "urls": ["/nri-quota"], "evidence": "\"Direct College Connections - We have established relationships with top medical colleges across India.\"", "fix": "Remove (NRICTA.tsx:8)"},
    {"id": "content-no-source-links", "severity": "medium", "urls": ["/neet-pg-cutoff", "/neet-ug-cutoff", "/md-ms-india/stipend", "/reports/neet-pg-stipend-2026"], "evidence": "'from MCC's published results' with no link to mcc.nic.in or result PDFs", "fix": "Sources block: authority, round, year, retrieval date, link"},
    {"id": "content-no-visible-freshness", "severity": "medium", "urls": ["/neet-pg-cutoff", "/md-ms-india/colleges/*", "/mbbs-india/colleges/*"], "evidence": "No 'data as of' or 'last updated'; dateModified absent", "fix": "Visible data-as-of line and WebPage.dateModified from import date"},
    {"id": "content-readability-hype", "severity": "medium", "urls": ["/md-ms-india", "/know-us", "/services", "/neet-ug-process", "/nri-quota"], "evidence": "FK grade 12.7-15.3; 'We Engineer Admissions', 'silent killer', 'Bulletproof', slogan H1s", "fix": "Rewrite to grade 9-10 or below in /neet-pg-process voice; topical H1s"},
    {"id": "content-thin-ug-process", "severity": "medium", "urls": ["/neet-ug-process"], "evidence": "449 words; 'based on your predicted rank'", "fix": "Rebuild to PG process standard, server-rendered"},
    {"id": "content-stipend-outliers-duplicates", "severity": "medium", "urls": ["/md-ms-india/stipend"], "evidence": "Karnataka min Rs 5,000; Hindu Rao / RML / ESI Basaidarapur listed twice", "fix": "p10-p90 ranges; dedupe after entity merge"},
    {"id": "content-low-polish", "severity": "low", "urls": ["/md-ms-india/colleges/*", "/know-us", "/neet-college-predictor", "/md-ms-india/branches/*"], "evidence": "'1 PG seats across 1 branches'; 'Raod', 'Kendr', 'probabability'; 42 identical fee rows; unexplained quota codes; predictor 173 words", "fix": "Pluralise; name normalisation; collapse identical rows; quota glossary; predictor explainer + FAQ"}
  ]
}
```
