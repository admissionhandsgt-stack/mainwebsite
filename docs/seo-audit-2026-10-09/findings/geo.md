# GEO / AI Search Readiness: www.admissionhands.com

Audited 2026-10-09 (read-only; at most 2 concurrent requests; no forms submitted).
Pages fetched: /, /neet-pg-cutoff, /neet-ug-cutoff, /neet-ss-cutoff, /md-ms-india/stipend,
/md-ms-india/private-college-fees, /reports/neet-pg-stipend-2026, /data, /know-us, /neet-pg-process,
/md-ms-india/branches/md-radio-diagnosis, /mbbs-india/colleges/all-india-institute-of-medical-sciences-new-delhi-ug,
plus robots.txt, llms.txt, sitemap.xml, and 13 crawler user-agents against a gated page.

## GEO Readiness Score: 62 / 100

| Dimension | Weight | Score | Weighted |
|---|---|---|---|
| Citability | 25% | 70 | 17.5 |
| Structural Readability | 20% | 75 | 15.0 |
| Multi-Modal Content | 15% | 45 | 6.8 |
| Authority & Brand Signals | 20% | 30 | 6.0 |
| Technical Accessibility | 20% | 85 | 17.0 |
| **Total** | | | **62** |

The content and technical side are well ahead of the entity and brand side. The pages can be read and
are worth citing, but AI systems have almost no independent evidence about who AdmissionHands is. On the
three page families AI answers lift from first, auto-generated sentences contradict each other: the
college FAQ blocks, the locked summaries and the hero stats.

## Platform scores (estimated)

| Platform | Score | Why |
|---|---|---|
| Google AI Overviews / AI Mode | 62 | Googlebot (verified) gets full rows; SSR; FAQ/Breadcrumb/Dataset markup; GSC only verified 2026-10-08, backlinks near zero, so the ranking pool AIO draws from is still small |
| Bing Copilot | 60 | Bingbot (verified) gets full rows; IndexNow already used; same weak off-page profile |
| ChatGPT Search | 50 | OAI-SearchBot and ChatGPT-User allowed but served the locked summary on seat pages; no Wikipedia/Wikidata entity; tiny YouTube; no LinkedIn |
| Perplexity | 52 | PerplexityBot allowed (summary only on seat pages); likes tables and dated figures, but finds no visible dates and no Reddit presence to corroborate |

## AI crawler access

robots.txt has a single `User-Agent: *` group (Allow /, Disallow /admin, /api/ except /api/content/, /account).
No bot-specific rules. Live check, 13 user-agents against /md-ms-india/branches/md-radio-diagnosis:
every one got HTTP 200 with the same 155 KB SSR page and the locked summary (no `seat-table`). There is no
Cloudflare "block AI bots" interference. A spoofed Googlebot UA is also locked, as designed (IP verification).

| Crawler | What it governs | robots.txt | Served |
|---|---|---|---|
| OAI-SearchBot | ChatGPT Search citations | Allowed | 200, summary only on seat pages |
| ChatGPT-User | Live fetches inside ChatGPT | Allowed | 200, summary only |
| GPTBot | OpenAI model training only (not search) | Allowed | 200, summary only |
| Claude-SearchBot | Claude search citations | Allowed | 200, summary only |
| ClaudeBot | Anthropic training only | Allowed | 200, summary only |
| PerplexityBot / Perplexity-User | Perplexity index / live fetch | Allowed | 200, summary only |
| Googlebot | Google Search and AI Overviews/AI Mode inclusion | Allowed | Full rows when IP-verified |
| Google-Extended | Gemini/Vertex training and grounding; not Search or AIO inclusion | Allowed (via *) | n/a (robots token only) |
| Bingbot | Bing and Copilot grounding | Allowed | Full rows when IP-verified |
| Applebot / Applebot-Extended | Siri/Spotlight / Apple Intelligence training | Allowed | 200, summary only |
| CCBot, cohere-ai | Training corpora | Allowed | 200, summary only |

Training crawlers are allowed. That suits a brand that wants to be known by models, and nothing gated
leaks to them. The non-standard `Host:` line in robots.txt is harmless.

### The gate, assessed honestly (the business decision stands: seat rows stay gated)

- **What it costs:** for ChatGPT, Perplexity and Claude, the long tail of "X college MBBS cutoff for OBC"
  style questions gets only the per-quota range and the 3-question FAQ, so those engines will answer from
  competitors who publish rows. The aggregate questions ("NEET PG radiology cutoff", "PG stipend by
  state", "private MD fees") are answered on ungated hub pages, and those are the queries AI engines
  handle most. So the gate mostly costs college-level depth, not topical presence.
- **What it does not stop:** Googlebot and Bingbot receive every row, so **Google AI Overviews/AI Mode and
  Copilot can quote individual gated rows in a zero-click answer**. A visitor who never reaches the gate
  can still get the rows from Google's or Bing's AI answer. If that is unwanted, Google honours
  `data-nosnippet` on the gated block. The content is still indexed and used for ranking, but it is kept
  out of snippets and AI features. Bing's AI controls are page-level (`nocache` / `noarchive`), so
  there is no element-level equivalent there. Decide this deliberately; do not change it as an incidental
  "fix".
- The paywall declaration is present and correct (`isAccessibleForFree:false`, `cssSelector: .ah-gated-depth`).

## llms.txt: present, well-formed

200 text/plain, 3.6 KB, valid structure (H1, blockquote summary, sections of links). It is better than
most because it explains how to read the numbers: round 1 close vs last admitted, a seat = (institute,
course, quota, category), AIR vs state rank, fee 0 = not published. Gaps:
- It does not say what an anonymous or AI fetcher will see on seat pages (summary only), or point to the CSVs.
- Missing: the MDS/SS detail families, `/data/*.csv` direct links, a "data as of" date per dataset.
- No `/llms-full.txt` (404). Optional.
- **RSL 1.0:** none (`/license.xml` 404, no `License:` line in robots.txt). Optional. The /data page says
  "free to use with a link" but no machine-readable licence exists anywhere.

## Citability

**Strong (keep doing this):**
- Hub pages open with a definition-grade sentence and labelled numbers: "Where All India Quota seats actually
  ran out ... from MCC's published results. Not a prediction and not the qualifying percentile."
- FAQ answers are self-contained, numeric and scoped. Example (/neet-ug-cutoff): "the most sought-after
  general-category MBBS seat closed at AIR 103 in round 1, and the last general-category seat was taken at
  AIR 27,360 across all rounds." Each answer is 25-60 words, which suits extraction.
- Terms are defined on the page ("Round 1 close: the tightest seat in round 1. Last admitted: the furthest
  any round reached"), ranks are labelled AIR vs group rank, and methodology is stated (stipend report
  "How this was compiled"; fee pages use median and 10th-90th percentile).
- A "Cite the source" box with ready HTML and a citation string sits on every data hub, plus CSV and embeds.

**Problems (in order of harm). These are the passages AI engines extract verbatim:**
1. **Misleading auto-generated FAQ on per-college pages.** On the AIIMS New Delhi page: "The largest move
   was MBBS, which closed at 31,622 in round 1 and reached 9,99,525 by the widest round." No quota or
   category is named, so an engine will state that AIIMS Delhi MBBS admitted rank 9,99,525. This breaks
   the site's own "one figure, one seat" rule, in exactly the text built for extraction. The same
   template runs on about 3,500 pages.
2. **Self-contradiction on the same page.** On the AIIMS page the hero says "Best round 1 close · 2026: 48"
   while the FAQ says "In 2025, MBBS ... closed at rank 48 in round 1". The locked summary shows
   "Seats 0" and "Open Seat Quota | 0 | 48 - 9,99,525" above "13 cutoff rows". It also says "the cheapest
   fee is not the widest rank" in a table with no fee column, and lists a dental college as a "Similar
   college" for AIIMS MBBS.
3. **Three different seat counts on one branch page** (MD Radio Diagnosis): the hero says 2,667 seats in
   427 colleges and 29 states; the locked summary says 3,579 seats in 226 colleges and 25 states; the
   FAQ says 576 GEN seats; and the table heading says "300 seats". An engine cannot tell which figure is
   the answer.
4. **Fee page counts DNB hospitals as "private colleges".** It shows "Tamil Nadu · 120 private colleges"
   and "DNB / NBEMS diploma | 998 colleges". An extracted "Tamil Nadu has 120 private PG medical
   colleges" would be wrong.
5. **No visible data date and no link to the primary source.** Cutoff pages name MCC but never link
   mcc.nic.in in the body; zero pages show "data as of / updated". The stipend page never states which
   year the stipends are from ("most recent year"). Perplexity and AIO favour dated, sourced figures.
6. **Year/freshness mismatch with how people search now (October 2026).** /neet-ug-cutoff is titled
   "NEET UG cutoff 2025" although it already holds 2026 R1-R2. /neet-ss-cutoff is "2024" with no
   on-page note explaining that SS 2025 R1/R2 results are no longer public, so it reads as stale rather
   than deliberate.
7. **Homepage and About copy argue with the data pages.** Unsourced figures ("private college fees range
   Rs 10L to Rs 25L/year", "85% seats filled via state counselling", "NRI ... 15% of total"),
   predictive language ("Trend analysis of expected cutoff shifts", "Understanding your probability"),
   and on /know-us "secret weapon", "proprietary cutoff intelligence", "India's most analytically
   rigorous", "Zero document rejection track record", "36 states", and a typo, "probabability". The
   project notes say several of these claims were removed, so they may be living in CMS rows. They lower
   the trust score of the whole domain and give an engine nothing it can cite.

## Structural readability

- Clean H1 -> H2 hierarchy; tables are real `<table>` elements in server HTML (the PG branch table is in
  the raw HTML even though trafilatura's boilerplate stripping drops it).
- FAQ sections exist on every hub and per-college page, with matching FAQPage JSON-LD. Since Aug 2023,
  FAQ rich results only show for gov/health sites, but the on-page Q&A still helps extraction.
- Section H2s are mostly labels ("PG stipend by state", "Branch-wise cutoff, GEN - 2025"), not questions.
  The FAQ questions themselves are not headings. Making the 3-4 FAQ questions H3s would give engines
  cleaner question-to-answer boundaries.
- Per-college pages are thin for anonymous readers: about 420 words, most of them gate UI copy.

## Multi-modal

- Tables are excellent, and all sampled images have alt text (0 missing across 25 images on 8 pages).
- No charts or infographics (e.g. a stipend-by-state bar chart, a round-1 vs last-admitted chart), no
  video embedded on any data page, no VideoObject. The 1200x630 JPEG share card is correct.
- YouTube channel @admissionhands: **61 subscribers, 7 videos**. YouTube mentions are the strongest
  observed correlate of AI citation (about 0.74), and this is the largest single gap.

## Authority & brand signals

- **Organization JSON-LD (homepage):** name, alternateName, logo, image, areaServed, contactPoint (phone,
  email, en/hi), sameAs = Facebook, Instagram, YouTube. Missing: `address` (the About page shows
  915, Bhutani City Center, Sector 32, Noida 201301), `foundingDate`, `legalName`, `founder`,
  `knowsAbout`. /know-us has no Organization or AboutPage markup.
- **No named people anywhere.** No founder or counsellor names, credentials or Person schema; the Report
  author is the Organization. For YMYL-adjacent admissions advice this is the biggest E-E-A-T gap.
  Testimonials ("Dr. Ananya Sharma", "Rahul Verma", "Priya Nair") are unverifiable, with no photos,
  dates or links.
- **Entity presence:** Wikipedia no article (404); Wikidata no item for "AdmissionHands" or
  "Admission Hands"; LinkedIn and X profiles do not exist yet (known); Instagram handle is
  "admissionhandss" (double s), which invites entity confusion; Facebook and Instagram resolve (200).
  The spelling is inconsistent: copy uses "Admission Hands", schema uses "AdmissionHands".
- **Third-party mentions:** could not be verified. Web search was not usable from this environment
  (DuckDuckGo CAPTCHA, Brave 429, Reddit API 403, Bing returned unrelated results). Indirect evidence
  points to near zero: an earlier Semrush audit reported 0% off-page/backlinks, Search Console was first
  verified 2026-10-08, and GSC showed /neet-college-predictor as "unknown to Google". Treat brand
  mentions as absent until a manual Google/Reddit/Quora check says otherwise.

## Technical accessibility

- SSR throughout (`is_spa: false`); all text and tables are present in the initial HTML. Served from the
  Cloudflare Pages edge in India (cf-ray DEL), HTML cache HIT. No meta robots restrictions on content
  pages; canonicals correct.
- sitemap.xml: 3,760 URLs, 3,646 with `lastmod` (data-driven). The **data hubs have no lastmod**
  (/neet-pg-cutoff, /neet-ug-cutoff, /md-ms-india/stipend, /data and others) even though they change with
  every import.
- No `dateModified` in any WebPage JSON-LD; the Report has only `datePublished`. The Dataset markup lacks
  `license`, `temporalCoverage`, `dateModified` and `version`. Google Dataset Search recommends `license`,
  and engines use the temporal fields to judge freshness.

## Top 5 highest-impact changes

| # | Change | Impact | Effort |
|---|---|---|---|
| 1 | **Make every auto-generated sentence obey the one-seat rule.** College FAQ "largest move" must name quota + category (or be dropped); reconcile the hero year with the FAQ year; fix "Seats 0"; use one labelled seat count per branch page ("2,667 seats in the 2025 seat matrix" vs "576 GEN seat options"); relabel fee-page DNB hospitals as "DNB hospitals", not "private colleges". Re-check with a script across all ~3,500 college pages. | High: these are the exact passages AI engines quote, multiplied by 3,500 | 1-2 days |
| 2 | **Stamp source and date on every data hub.** Add a visible line under each H1, e.g. "Source: MCC All India Quota results, 2025 rounds R1-R3 + stray (mcc.nic.in). Data updated 6 Oct 2026." Link the specific MCC/state result pages. Add `dateModified` to WebPage/Report JSON-LD, `lastmod` for hubs in the sitemap, and `license`, `temporalCoverage`, `dateModified` to the Dataset markup. Put the year in the stipend page and the cite-box citation. | High for Perplexity/AIO, which favour dated, sourced figures | 0.5-1 day |
| 3 | **Match the current search year.** Retitle /neet-ug-cutoff to cover "2026 (rounds so far) and 2025"; add a sentence on /neet-ss-cutoff explaining why 2025 is absent; plan the NEET PG 2026 and MDS 2026 refresh into the same templates as soon as rounds publish. | Medium-high: October 2026 queries say "2026" | Hours |
| 4 | **Build the entity.** Put named counsellors and a founder with credentials and years on /know-us (Person schema, `founder`/`employee` on Organization); add the Noida `address`, `foundingDate` and `legalName`; create LinkedIn company and X profiles and add them to `social.*` (they flow into sameAs); create a Google Business Profile for the Noida office; create a Wikidata item once there are 2-3 independent references. Remove the superlatives, "Zero document rejection", "proprietary", the unsourced homepage fee and quota bullets, and the typo (check the CMS rows, not just code). | High: authority is the weakest dimension (30/100) | 1-2 days + account setup |
| 5 | **Earn off-site mentions where AI engines look.** YouTube first: one short video per data hub (e.g. "NEET PG 2025 radiology cutoff, explained"), with the page linked in the description and the video embedded on the page with VideoObject markup. Answer r/NEET / r/NEETPG / Quora questions with the table and a link, posted one at a time by a person (no automation). Pitch the stipend report to medical and education press using the existing /admin/outreach kit. | High: brand mentions correlate with AI citation far more than backlinks | Ongoing, 2-4 h/week |

**Also worth doing:** decide on `data-nosnippet` for `.ah-gated-depth` (see the gate section); extend
llms.txt (what AI fetchers see, CSV links, a "data as of" date); add 1-2 charts per hub as images with
descriptive alt text and a caption that states the figure; turn the FAQ questions into H3s; optionally
publish RSL or at least a `license` URL for the "free with attribution" terms.

## Structured findings (for audit-data.json, category "AI Search Readiness")

```json
{
  "category": "AI Search Readiness",
  "score": 62,
  "dimensions": {"citability": 70, "structural_readability": 75, "multimodal": 45, "authority_brand": 30, "technical_accessibility": 85},
  "platform_scores": {"google_aio": 62, "bing_copilot": 60, "chatgpt": 50, "perplexity": 52},
  "crawler_access": {"robots_txt": "single * group, all AI crawlers allowed", "edge_blocking": "none (13 UAs all 200)", "gated_seat_rows": "verified Googlebot/Bingbot only; all AI crawlers get locked summary"},
  "llms_txt": "present, well-formed (3.6 KB); llms-full.txt 404; no RSL licence",
  "findings": [
    {"id": "geo-01", "severity": "high", "title": "College-page FAQ states a rank with no quota/category (AIIMS Delhi MBBS 'reached 9,99,525')", "url": "/mbbs-india/colleges/all-india-institute-of-medical-sciences-new-delhi-ug", "scope": "~3,500 college pages"},
    {"id": "geo-02", "severity": "high", "title": "Same-page contradictions: hero 2026 vs FAQ 2025 for rank 48; locked summary 'Seats 0'", "url": "/mbbs-india/colleges/all-india-institute-of-medical-sciences-new-delhi-ug"},
    {"id": "geo-03", "severity": "medium", "title": "Branch page shows four different seat counts (2,667 / 3,579 / 576 / 300)", "url": "/md-ms-india/branches/md-radio-diagnosis"},
    {"id": "geo-04", "severity": "medium", "title": "Fee page counts DNB/NBEMS hospitals as 'private colleges' (TN 120, India 998)", "url": "/md-ms-india/private-college-fees"},
    {"id": "geo-05", "severity": "high", "title": "No visible 'data as of' date or mcc.nic.in source link on any data hub; no dateModified in JSON-LD; hubs lack sitemap lastmod", "url": "/neet-pg-cutoff, /neet-ug-cutoff, /md-ms-india/stipend, /data"},
    {"id": "geo-06", "severity": "medium", "title": "Hub titles lag the search year: UG cutoff titled 2025 despite 2026 R1-R2 data; SS page 2024 with no explanation", "url": "/neet-ug-cutoff, /neet-ss-cutoff"},
    {"id": "geo-07", "severity": "high", "title": "No named experts/authors, no Person schema; Organization lacks address/foundingDate; About page lacks Organization markup", "url": "/know-us, /"},
    {"id": "geo-08", "severity": "medium", "title": "Unsourced or superlative claims on homepage/About ('secret weapon', 'proprietary', 'Zero document rejection track record', 'Rs 10L-25L/year', typo 'probabability')", "url": "/, /know-us"},
    {"id": "geo-09", "severity": "high", "title": "Weak entity footprint: no Wikipedia/Wikidata, no LinkedIn/X, YouTube 61 subs / 7 videos, third-party mentions unverified (likely ~0)", "url": "off-site"},
    {"id": "geo-10", "severity": "medium", "title": "Gated rows reach Google/Bing AI answers (zero-click); consider data-nosnippet on .ah-gated-depth", "url": "gated page families"},
    {"id": "geo-11", "severity": "low", "title": "Dataset JSON-LD missing license, temporalCoverage, dateModified", "url": "/data"},
    {"id": "geo-12", "severity": "low", "title": "No charts/video on data pages; FAQ questions not headings", "url": "data hubs"}
  ],
  "limitations": "Web search unavailable from the audit environment (DuckDuckGo CAPTCHA, Brave 429, Reddit 403, Bing irrelevant results); brand-mention analysis is based on direct profile checks and prior audit notes. No DataForSEO tools available for live ChatGPT visibility."
}
```
