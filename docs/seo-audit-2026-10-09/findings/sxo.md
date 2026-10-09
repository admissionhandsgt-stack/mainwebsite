# SXO (Search Experience) Findings: admissionhands.com

Audited 2026-10-09. 8 target pages rendered with `render_page.py --mode always` (Playwright, anonymous visitor) and parsed with `parse_html.py`. 4 pages also captured at mobile viewport. 16 web searches covered the 8 target queries plus variants. Read-only: no forms were submitted and the predictor was not run.

> **SXO Gap Score** is separate from the SEO Health Score. It measures how well each page's type, layout and free content match what the SERP rewards.

---

## 1. Headline findings (in severity order)

| # | Severity | Finding | Page |
|---|---|---|---|
| 1 | **CRITICAL** | **Intent mismatch on "nri quota mbbs fees".** All 18 results across 2 searches are MBBS NRI fee lists: annual fee per college, 5-year totals and USD figures. Our page leads with MD/MS NRI seats ("PG colleges 229 · Typical fee ₹64.50 L"). Its MBBS section says outright "We do not publish a fee for these". The page cannot answer the query it is meant to rank for. | /nri-quota/fees |
| 2 | **HIGH** | **Sub-intent mismatch on "neet pg cutoff 2025".** 8 of 9 results are about the NBEMS **qualifying** cutoff: 2025 was 276/255/235 marks, cut in Jan 2026 to the 7th/0th percentile (103 / 90 / −40). 2026 is now out at 262/244/226. Our page shows only closing ranks. Its own FAQ says "the qualifying percentile is not the cutoff rank" but gives none of the numbers. | /neet-pg-cutoff |
| 3 | **HIGH** | **The gated pages do not show the one number the SERP leads with.** On "md radiology cutoff" the ranker (sartha.in, 6–7 of 10 results) puts the AIQ category row (GEN AIR 6,656) and a 2024-vs-2025 comparison in the first screen, with no college rows, behind no login. Our branch page's first screen shows "Best R1 (GEN) **1**" and no AIQ figure. Our own hub page says the AIQ round-1 close was **AIR 25**, so the two pages contradict each other. The college page's free part has no branch-level answer at all (only per-quota ranges). Results ranking for "madras medical college md ms cutoff" show branch-wise ranks for free, even though their data is from 2023. | /md-ms-india/branches/md-radio-diagnosis, /md-ms-india/colleges/madras-medical-college-chennai |
| 4 | **HIGH** | **The paywall markup does not follow Google's pattern.** `src/lib/paywall.ts:51` sets the page-level `isAccessibleForFree: true`, and only `hasPart` is `false`. Google's documented example sets `false` at **both** levels. The file's own header comment also says "false on the page". `verify_gate.mjs` passes because it only looks for a `false` somewhere. The gate is declared to justify serving crawlers more than visitors, so ambiguity here is a cloaking risk. | all gated pages (branch, college, NRI/mgmt quota) |
| 5 | **HIGH** | **The same screen shows contradicting numbers (trust).** Branch: hero "2,667 seats / 427 colleges / 29 states", locked summary "3,579 seats / 226 colleges / 25 states", FAQ "576 GEN seats". NRI: hero "229 colleges / 2,102 seats", summary "59 colleges / 2,825 seats". MMC: hero "468 PG seats", summary "1,553 seats". The word "seats" counts rows in one place and intake in another. State merit ranks (MMC "TN Govt Quota 4 – 8,117", FAQ "closing at rank 4") are printed beside AIR without a label. The branch, college and NRI pages never use the word "AIR". | branch, NRI, college |
| 6 | **HIGH** | **Freshness gap at peak demand on "neet pg counselling process".** All 9 results carry 2026 dates. The headline is the MCC schedule: round 1 registration from Oct 12, 2026. Our page says "We do not publish dates here". Our own alerts bar already carries "MCC (PG): PG All India Quota schedule 2026". | /neet-pg-process |
| 7 | MEDIUM | **The predictor opens on the wrong stream for the generic query.** All "neet college predictor" results are UG (MBBS/BDS/AYUSH). Our tool opens on **MD / MS** with the label "Your NEET PG rank". On mobile the rank box sits at the fold and the floating phone and WhatsApp buttons cover the "Find my colleges" button. The page has 172 words of main content, no FAQ and no WebApplication schema. Careers360 shows "500K+ users", testimonials, an FAQ and marks-vs-rank help. | /neet-college-predictor |
| 8 | MEDIUM | **Missing co-intent: service bond.** 5 of 9 stipend results pair stipend with **service bond** in the title (bodmas, meducate, formity). Hike news is also present (Bihar Jan 2026, TN). Our page has no bond data (`fees.bond_years` is empty). | /md-ms-india/stipend |
| 9 | MEDIUM | **UG cutoff is one round behind.** Results quote 2026 **Round 3** AIQ closes (Open 27,080; Sartha), but we show "2026, rounds published so far (R1, R2)". Our own alert bar says the MCC UG R3 final allotment is out. The title year is 2025. | /neet-ug-cutoff |
| 10 | LOW | **Copy bugs in the locked summary.** On a single-college page it says "the cheapest fee is not the widest rank, and they are often different colleges" (`LockedSummary.tsx:170`). On the MBBS NRI block, which has no fee, it says "college, quota, rank and fee on every row" (`GatedSeatTable.tsx:129`). The MMC FAQ says "From ₹20,000 a year on a AIQ seat to ₹50,000 on a AIQ seat. The difference is the quota" (`collegeSeo.ts:150`), but both are AIQ; the difference is diploma vs degree. | college, NRI |
| 11 | LOW | **Weak keyword H1s.** Predictor H1 "Enter your rank. See the colleges it reaches." has no "NEET college predictor" (that text sits in a small label). Branch H1 "MD Radio Diagnosis" has no "cutoff". College H1 has no "MD/MS cutoff". | predictor, branch, college |
| 12 | INFO | **No AIIMS PG page, and that is correct:** AIIMS PG admits through INI-CET, not NEET PG. Results for "AIIMS Delhi MD MS cutoff" are INI-CET pages (Collegedunia, Careers360). Not a mismatch, but the query family is unserved; the INI-CET data is not held. | n/a |
| 13 | INFO | **No admissionhands.com URL appeared in any of the 16 result sets** (US-index search tool; see Limitations). | all |

---

## 2. SERP analysis per query

Taxonomy: `seo-sxo/references/page-type-taxonomy.md`. Data-reference pages with tables plus CTA are classed **Hybrid**. Editorial news and guides are **Blog Post**.

| Query | Results analysed | SERP mix | Dominant type (confidence) | Our page type | Verdict |
|---|---|---|---|---|---|
| neet college predictor | 9 | Careers360, Allen, Motion, Aakash, Vedantu, Matrix ×2 tools; Allen news ×2. All UG/AYUSH; inputs are rank/score + category + domicile + **OTP** | Tool (78%) | Tool | **ALIGNED**. Default stream is wrong (PG); supporting content is thin |
| neet pg college predictor | 9 | Careers360 holds all 9 (6 tool URLs incl. state variants, 3 articles). Mobile number required before results | Tool (67%) | Tool | **ALIGNED**. A phone gate is normal in this SERP |
| neet pg cutoff 2025 | 9 | Careers360 news ×6, NBE PDF via medicaldialogues, pw.live branch-wise, dmaedu. 8/9 are about **qualifying marks/percentile** | Blog/News (89%), qualifying sub-intent | Hybrid (closing-rank data hub) | **HIGH** (sub-intent) |
| neet ug cutoff mbbs aiq | 10 + 9 | Careers360 news ×6–8, Allen news, ETV Bharat, Sartha. Category-wise AIQ tables; freshest cite 2026 R2/R3 | Blog/News with tables (80%) | Hybrid (data tables) | **MEDIUM**. Format matches; freshness gap |
| md radiology cutoff | 10 + 10 | Sartha branch × state × year data pages ×6–7, Careers360 Q&A ×3–4 | Hybrid data reference (65%), Q&A forum (35%) | Hybrid (branch data, gated rows) | **MEDIUM**. Type matches; free tier misses the AIQ headline and year-on-year comparison |
| nri quota mbbs fees | 9 + 9 | allenoverseas, formity, Careers360 article + Q&A, timesofcollege, motion. Fee by college type, 5-yr total, USD | Blog/List (100%) | Hybrid (PG-first seat data) | **CRITICAL** |
| pg stipend in india state wise | 9 + 9 | bodmas, meducate, formity, Careers360 article (stipend + **bond**), news on hikes, Q&A | Blog/List (70%), News (20%) | Hybrid (state table) | **ALIGNED**. Bond co-intent missing |
| madras medical college md ms cutoff | 9 | edufever, motion ×2, admistay ×3 (college profiles showing branch-wise R1 GEN ranks, 2023 data), Careers360 Q&A ×3 | College profile / Hybrid (67%) | College profile, rows gated | **HIGH**. Type matches; the core answer is gated |
| neet pg counselling process | 9 | Careers360 schedule/live ×5, primebook, academically ×2, bodmas. All dated 2026; schedule leads | Blog/News (100%), time-sensitive | Blog-style guide, no dates | **HIGH** (freshness) |

**Competitive note.** sartha.in is the real data-native rival: closing ranks by branch × state × year, quota-level free, with year-on-year deltas and a "reviewed by Dr …" byline. Careers360 owns the PG predictor SERP outright. Shiksha, Collegedunia and CollegeDekho barely surfaced for these queries.

---

## 3. User stories (from observed signals)

1. **As a NEET UG rank-holder after round 3**, I want to see which MBBS colleges my AIR still reaches, because mop-up is days away, but I'm blocked by **time pressure**. The tool opens on MD/MS and an anonymous run returns only counts.
   *Signals: all 9 "neet college predictor" results are UG; titles say "2026"; our alert bar shows UG R3 final allotment published.*
2. **As a NEET PG 2026 candidate (results Sept 24)**, I want to know first whether I even qualified for counselling, because cutoffs were cut sharply last year, but I'm blocked by an **information gap**. /neet-pg-cutoff never states the qualifying marks.
   *Signals: 8/9 results for "neet pg cutoff 2025" are qualifying-mark news; Careers360 headline "general category needs 262 marks".*
3. **As a PG aspirant weighing radiology**, I want the AIQ closing rank by category and how it moved from 2024, because I must rank branches in choice filling, but I'm blocked by **comparison fatigue**. Our first screen shows "Best R1 (GEN) 1" and unexplained quota codes (MNG, JM, MM, IP).
   *Signals: Sartha titles "2025 Closing Rank in AIQ and State Quotas" with 2024 versions; Careers360 Q&A "MD pediatrics and also radiology", "Management, NRI & Regular quota".*
4. **As an NRI parent abroad**, I want the yearly and 5-year MBBS NRI fee per college in a currency I can compare, because I am budgeting ₹1–1.6 crore, but I'm blocked by **price uncertainty**. Our page has PG fees and no MBBS fees.
   *Signals: every result is an MBBS NRI fee list; "5-year cost ₹1–1.6 crore"; USD figures.*
5. **As a first-time PG counselling candidate**, I want the 2026 round-by-round dates and what to do at each step, because round 1 registration opens Oct 12, but I'm blocked by **time pressure**. Our guide explains the process well but refuses to give dates.
   *Signals: Careers360 "schedule out; round 1 registration from October 12"; every result dated 2026.*

Journey stages covered: awareness (2, 5), consideration (3, 4), decision (1).

---

## 4. SXO Gap Score per page (100 points)

Dimensions: Page Type /15 · Content Depth /15 · UX Signals /15 · Schema /15 · Media /15 · Authority /15 · Freshness /10

| Page | Type | Depth | UX | Schema | Media | Auth | Fresh | **Total** | Main evidence |
|---|---|---|---|---|---|---|---|---|---|
| /neet-college-predictor | 13 | 6 | 11 | 6 | 6 | 8 | 7 | **57** | Tool in first screen. 172 words, no FAQ. Schema is WebPage + Breadcrumb only. Opens on PG. No user counts or testimonials |
| /neet-pg-cutoff | 9 | 12 | 11 | 11 | 5 | 10 | 5 | **63** | Strong category + branch tables, MCC cited, cite box. No qualifying marks. 2025 only, while 2026 qualifying cutoff is out |
| /neet-ug-cutoff | 12 | 12 | 11 | 11 | 5 | 10 | 6 | **67** | Right format. Explains AIQ vs state quota. Stops at 2026 R2 |
| /md-ms-india/branches/md-radio-diagnosis | 12 | 10 | 9 | 11 | 6 | 8 | 6 | **62** | Per-quota summary is good. "Best R1 1" contradicts the hub's AIR 25. Opaque quota codes. Counts contradict. No 2024 comparison. H1 lacks "cutoff" |
| /nri-quota/fees | 4 | 9 | 8 | 10 | 6 | 8 | 6 | **51** | MBBS fee absent by design. 229 vs 59 colleges on one screen. Title says "2026" over 2025 data |
| /md-ms-india/stipend | 12 | 12 | 12 | 11 | 5 | 10 | 7 | **69** | Clean state table with govt/private split and top 25. No bond. No year-2/3 by state |
| /md-ms-india/colleges/madras-medical-college-chennai | 10 | 11 | 9 | 13 | 8 | 9 | 7 | **67** | CollegeOrUniversity + FAQ schema, fees and stipend free. Branch cutoffs gated. Rank checker sits below the fold. 468 vs 1,553 seats. Unlabelled state ranks |
| /neet-pg-process | 11 | 12 | 11 | 6 | 8 | 9 | 3 | **60** | Excellent float-or-freeze content. No dates at schedule time. No FAQ, Article or dateModified schema |

Cluster average: **62/100**.

---

## 5. Persona scoring

| Persona (evidence) | Page | Relevance | Clarity | Trust | Action | Total | Rating |
|---|---|---|---|---|---|---|---|
| **Eligibility Checker**: "did I qualify?" (8/9 qualifying-mark results) | /neet-pg-cutoff | 8 | 6 | 15 | 12 | **41** | Needs Work |
| **NRI Parent**: MBBS fee per college, 5-yr, USD (18/18 fee-list results) | /nri-quota/fees | 6 | 8 | 14 | 13 | **41** | Needs Work |
| **College Shortlister**: "MMC MD/MS cutoff" (profile pages with branch-wise ranks) | MMC page | 15 | 12 | 15 | 17 | **59** | Needs Work |
| **UG Rank-holder**, round 3/mop-up (UG-only predictor SERP, OTP norm) | /neet-college-predictor | 17 | 15 | 14 | 16 | **62** | Good |
| **Branch Chooser (PG)**: radiology vs others (Sartha + Q&A) | branch page | 19 | 12 | 13 | 18 | **62** | Good |
| **Process Navigator**: 2026 timeline (schedule news) | /neet-pg-process | 17 | 15 | 16 | 15 | **63** | Good |
| **Stipend/Bond Evaluator** (stipend + bond titles, hike news) | /md-ms-india/stipend | 19 | 21 | 16 | 14 | **70** | Good |

Recommendations below run from the weakest persona to the strongest.

### Eligibility Checker (41)
**Top issue:** the qualifying cutoff is the first thing searched and it is missing.

**Fix:** put an H2 block "NEET PG qualifying cutoff (NBEMS)" above the category table:

| Year | Gen/EWS | Gen-PwBD | SC/ST/OBC |
|---|---|---|---|
| 2026 | 262 (50th pct) | 244 (45th) | 226 (40th) |
| 2025 | 276 | 255 | 235 |
| 2025, revised Jan 2026 | 103 (7th pct) | 90 | −40 (0th pct) |

Link each row to the NBEMS notice. Follow it with one sentence: "Qualifying only lets you register; the seat cutoff is the rank below." Retitle to "NEET PG Cutoff 2026 & 2025: Qualifying Marks and Branch-wise Closing Ranks". Do the same on /neet-ug-cutoff with the NTA percentile marks.

### NRI Parent (41)
**Top issue:** the page answers "PG NRI fee" while the query is "MBBS NRI fee".

**Fix:**
- (a) Re-scope this page's title and H1 to its real asset: "NRI Quota MD/MS Fees & Closing Ranks (2025 counselling)".
- (b) Add an MBBS-NRI page or section built from the states' **official NRI fee notifications** (KEA Karnataka, Maharashtra FRA, TN selection committee, AP/Telangana Cat-C, Kerala, Puducherry CENTAC). Show a per-college annual fee, a 5-year total and a USD column, each with its source notice. This follows the "authority's own figure" rule, not a guess from unlabelled fee blocks.

### College Shortlister (59)
**Top issue:** branch cutoffs are gated, and the free per-quota ranges cannot answer "can I get radiology here?". Rank 4 (a TN state rank) is shown next to AIR without a label.

**Fix:** move "Can you get in here?" to directly under the H1. On submit, return a **per-branch band list** for this college (safe / likely / possible / stretch, four buckets, no ranks), the same disclosure level /api/college-bands already allows. Label every range "AIR" or "TN merit rank".

### UG Rank-holder (62)
**Fix:**
- Open the bare URL on **MBBS**, or show "NEET UG / NEET PG" as the first choice with nothing preselected.
- Shorten the hero on mobile (remove the duplicate logo card) so the rank box and button sit above the fold, clear of the floating buttons.
- For anonymous visitors, show **college names with band chips** (already public in the directory) next to the counts. Keep the quota, closing-rank and fee rows gated.
- Add an FAQ ("How is this different from a rank predictor?", "Which rounds are included?"), the data vintage, and WebApplication schema.

### Branch Chooser (62)
**Fix:**
- In the first screen, replace "Best R1 (GEN) 1" with the AIQ category row (GEN/EWS/OBC/SC/ST: R1 close and last admitted, AIR), the same figures as the hub (AIR 25 / 6,656).
- Add a "2024 → 2025" column.
- Add a "by state, open category" range table (aggregates only).
- Spell out the quota codes: MNG = management, JM = Jamia, MM = ?, IP = IP University.
- H1: "MD Radio Diagnosis (Radiology) Cutoff 2025".

### Process Navigator (63)
**Fix:** add a "NEET PG 2026 counselling: current schedule" box near the top, fed from the existing `alertFeed` MCC/state notices. Each row is a date plus a link to the authority's PDF. This keeps the "dates come from the authority" principle and still answers the query. Add FAQPage schema and a visible "Updated" date.

### Stipend/Bond Evaluator (70)
**Fix:** add a per-state "Service bond (years / penalty)" column from state notifications, a "Recent revisions" note (Bihar Jan 2026, TN) and a year-1/2/3 median per state.

### Systemic issues
- **Clarity** is the lowest dimension across personas: numbers contradict, rank basis is unlabelled, quota codes are opaque, and the headline answer is not in the first screen.
- **Freshness**: 2025 framing while 2026 data and schedules are live.

---

## 6. Highest-leverage changes

1. **Make the free tier answer the SERP's headline question on every gated page, using only aggregates the gate already allows.**
   - Branch page: AIQ category row and 2024 → 2025 delta in the first screen.
   - College page: rank checker under the H1, returning per-branch bands.
   - Predictor: college names with band chips for anonymous visitors.

   No seat row (quota + rank + fee) is exposed, so the gate and the "one row, one seat" rule stay intact. *Caveat:* bands for an entered rank can be bisected to recover a closing rank over about 17 queries per seat. The existing per-IP rate limits apply; decide if that is acceptable before widening bands to branch level.
2. **Close the two intent mismatches with content.**
   - /neet-pg-cutoff (and /neet-ug-cutoff): add the NBEMS/NTA qualifying-marks table at the top and a 2026 title.
   - /nri-quota/fees: re-scope to MD/MS, and add MBBS NRI fees from official state fee notifications.
3. **Fix the trust breakers and the paywall declaration.**
   - `src/lib/paywall.ts:51` → `isAccessibleForFree: false` at page level (Google's example). Extend `verify_gate.mjs` to assert the top-level value.
   - Use one meaning of "seats" on hero and LockedSummary.
   - Label AIR vs state merit rank everywhere.
   - Fix the "Best R1 (GEN)" stat so it uses AIQ AIR only (it contradicts the hub's AIR 25).
   - Repair the three copy bugs (`LockedSummary.tsx:170`, `GatedSeatTable.tsx:129`, `collegeSeo.ts:150`).

Also: a dated 2026 schedule box on /neet-pg-process (fed from the alert feed), and import UG 2026 R3.

---

## 7. Cross-skill referrals
- `/seo schema`: WebApplication on the predictor; FAQPage and Article + dateModified on /neet-pg-process; correct the paywall `isAccessibleForFree`.
- `/seo content`: authorship/reviewer signal (Sartha uses "reviewed by Dr …"); the bond/stipend expansion.
- `/seo page`: the predictor's 172-word page.

## 8. Limitations
- WebSearch is a **US-indexed** search without visible PAA, AI Overview, featured snippets, ads or positions. It is not google.co.in mobile. SERP features could not be recorded, and our own ranking positions are unknown (none of our URLs appeared). Validate in GSC (`scripts/gsc.mjs`) for these queries.
- The predictor was not exercised (no form submission). Anonymous results were judged from the documented gate (band counts only).
- Pages were seen as an anonymous visitor only. Signed-in and verified-crawler views were not checked.
- Competitor layouts were checked for Sartha and Careers360 only, via a summarising fetch.
- The AIIMS PG query could not be scored: it is INI-CET and no page exists.
- Scores are analyst judgement against the rubric, not measured user behaviour.

Generate a PDF report? Use `/seo google report`.

---

## 9. Structured findings (for audit-data.json, category "Search Experience")

```json
{
  "category": "Search Experience",
  "sxo_gap_score_avg": 62,
  "pages": [
    {"url": "/neet-college-predictor", "query": "neet college predictor", "serp_type": "Tool", "serp_confidence": 0.78, "page_type": "Tool", "mismatch": "ALIGNED", "sxo_gap_score": 57},
    {"url": "/neet-pg-cutoff", "query": "neet pg cutoff 2025", "serp_type": "Blog/News (qualifying marks)", "serp_confidence": 0.89, "page_type": "Hybrid", "mismatch": "HIGH", "sxo_gap_score": 63},
    {"url": "/neet-ug-cutoff", "query": "neet ug cutoff mbbs aiq", "serp_type": "Blog/News with tables", "serp_confidence": 0.80, "page_type": "Hybrid", "mismatch": "MEDIUM", "sxo_gap_score": 67},
    {"url": "/md-ms-india/branches/md-radio-diagnosis", "query": "md radiology cutoff", "serp_type": "Hybrid data reference", "serp_confidence": 0.65, "page_type": "Hybrid", "mismatch": "MEDIUM", "sxo_gap_score": 62},
    {"url": "/nri-quota/fees", "query": "nri quota mbbs fees", "serp_type": "Blog/List", "serp_confidence": 1.0, "page_type": "Hybrid (PG-first)", "mismatch": "CRITICAL", "sxo_gap_score": 51},
    {"url": "/md-ms-india/stipend", "query": "pg stipend in india state wise", "serp_type": "Blog/List", "serp_confidence": 0.70, "page_type": "Hybrid", "mismatch": "ALIGNED", "sxo_gap_score": 69},
    {"url": "/md-ms-india/colleges/madras-medical-college-chennai", "query": "madras medical college md ms cutoff", "serp_type": "College profile", "serp_confidence": 0.67, "page_type": "College profile (gated rows)", "mismatch": "HIGH", "sxo_gap_score": 67},
    {"url": "/neet-pg-process", "query": "neet pg counselling process", "serp_type": "Blog/News (dated 2026)", "serp_confidence": 1.0, "page_type": "Blog guide (undated)", "mismatch": "HIGH", "sxo_gap_score": 60}
  ],
  "findings": [
    {"id": "sxo-nri-mbbs-fee-mismatch", "severity": "critical", "title": "NRI page cannot answer 'nri quota mbbs fees' (PG-first, MBBS fee withheld)", "url": "/nri-quota/fees"},
    {"id": "sxo-pg-cutoff-qualifying", "severity": "high", "title": "NEET PG cutoff page omits qualifying marks/percentile that 8/9 results lead with", "url": "/neet-pg-cutoff"},
    {"id": "sxo-free-tier-headline", "severity": "high", "title": "Gated pages' free tier lacks the SERP headline number (AIQ category row, branch-level answer)", "url": "/md-ms-india/branches/*, /md-ms-india/colleges/*"},
    {"id": "sxo-paywall-toplevel-true", "severity": "high", "title": "paywall.ts sets page-level isAccessibleForFree:true; Google's pattern is false at both levels", "file": "src/lib/paywall.ts:51"},
    {"id": "sxo-contradictory-counts", "severity": "high", "title": "Hero vs locked summary seat/college counts contradict; AIR vs state rank unlabelled; Best R1 (GEN)=1 vs hub AIR 25", "url": "branch, NRI, college pages"},
    {"id": "sxo-process-no-dates", "severity": "high", "title": "Counselling process page refuses dates while 2026 schedule dominates SERP", "url": "/neet-pg-process"},
    {"id": "sxo-predictor-default-pg", "severity": "medium", "title": "Predictor defaults to MD/MS for a UG-dominated query; thin supporting content", "url": "/neet-college-predictor"},
    {"id": "sxo-stipend-bond", "severity": "medium", "title": "Stipend page lacks service-bond co-intent", "url": "/md-ms-india/stipend"},
    {"id": "sxo-ug-r3-missing", "severity": "medium", "title": "UG cutoff shows 2026 R1-R2 while R3 is published", "url": "/neet-ug-cutoff"},
    {"id": "sxo-locked-summary-copy", "severity": "low", "title": "LockedSummary/GatedSeatTable/collegeSeo copy contradictions", "file": "src/components/seats/LockedSummary.tsx:170; src/components/seats/GatedSeatTable.tsx:129; src/lib/collegeSeo.ts:150"},
    {"id": "sxo-h1-keywords", "severity": "low", "title": "Predictor/branch/college H1s omit the target phrase", "url": "multiple"}
  ]
}
```

### Sources
- [Careers360 NEET college predictor](https://medicine.careers360.com/aiims-mbbs-college-predictor) · [Allen](https://www.allen.in/neet/college-predictor) · [Aakash](https://www.aakash.ac.in/neet-college-predictor) · [Careers360 NEET PG predictor](https://medicine.careers360.com/neet-pg-college-predictor)
- [NEET PG 2025 cutoff slashed (Careers360)](https://news.careers360.com/mcc-neet-pg-2025-cut-offs-slashed-to-0-percentile-general-40-marks-sc-st-obc-nbems-round-3-counselling-soon-md-ms-admissions/amp) · [NEET PG 2026 cutoff 262 marks (Careers360)](https://news.careers360.com/neet-pg-2026-cut-offs-slashed-for-all-categories-general-category-needs-262-marks-md-ms-admissions-counselling-natboard-edu-in/amp) · [Deccan Chronicle](https://www.deccanchronicle.com/amp/nation/education/neet-pg-2026-results-declared-general-cut-off-at-262-marks-1990187)
- [Sartha MD Radiology cutoff](https://www.sartha.in/cutoff/neet-pg/branch/md-radiology) · [Sartha 2026 R3 UG cutoff](https://www.sartha.in/blogs/mcc-neet-ug-2026-round-3-cutoff-mbbs-bds) · [Allen news 2025 AIQ closing ranks](https://news.allen.in/all-india-neet-counselling-2025-second-round-provisional-seat-allotment/)
- [Careers360 lowest NRI MBBS fees](https://medicine.careers360.com/articles/lowest-nri-mbbs-fees-in-india) · [formity NRI quota](https://formity.ai/blog/nri-quota-mbbs-india-fees-seats-2025/)
- [Careers360 state-wise stipend](https://medicine.careers360.com/articles/neet-pg-2026-state-wise-medical-stipend) · [bodmas stipend & bond](https://bodmaseducation.com/blog_details/neet-pg-2026-state-wise-stipend-and-service-bond) · [meducate](https://meducate.in/state-wise-neet-pg-bond-and-stipend/)
- [motion.ac.in MMC](https://motion.ac.in/examinfo/madras-medical-college-mmc-chennai/) · [edufever MMC](https://www.edufever.com/madras-medical-college)
- [Careers360 NEET PG 2026 counselling schedule](https://news.careers360.com/neet-pg-counselling-2026-schedule-out-registration-october-12-mcc-nic-in-fee-dates-medical-md-ms-admission/amp)
- [Google: paywalled content structured data](https://developers.google.com/search/docs/appearance/structured-data/paywalled-content)
