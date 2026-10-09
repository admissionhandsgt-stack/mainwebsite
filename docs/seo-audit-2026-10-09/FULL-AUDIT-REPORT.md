# Full SEO audit — www.admissionhands.com, 2026-10-09

Run with the claude-seo toolkit (v2.4.2): eleven specialist passes plus Search Console and CrUX data
from the project's own scripts (`scripts/gsc.mjs`, `scripts/perf_field.mjs`). All passes were
read-only against production — no form submitted, no OTP or lead endpoint called.
Business type: **hybrid** — national online NEET UG/PG counselling with a walk-in office in Noida.

## SEO Health Score: 74 / 100 (at audit time)

| Category | Weight | Score | Source |
|---|---|---|---|
| Technical SEO | 22% | 84 | findings/technical.md, sitemap.md (91) |
| Content quality | 23% | 61 | findings/content.md (E-E-A-T 54) |
| On-page SEO | 20% | 80 | site crawl: 3,760 pages, titles ≤65, one H1, 0 broken links; weak keyword H1s, ~20 duplicate titles |
| Schema | 10% | 68 | findings/schema.md |
| Performance (CWV) | 10% | 86 | findings/performance.md; CrUX p75 LCP 2.88 s (window mostly before the India edge) |
| AI search readiness | 10% | 62 | findings/geo.md; agentic 3/3 (findings/agentic.md) |
| Images | 5% | 85 | alt text present everywhere; college LCP image oversized |

Separate scores: Local SEO 23 (no GBP yet), search-experience gap 62 (findings/sxo.md).
Backlinks: not scored — admissionhands.com is absent from the Common Crawl graph (Jan–Mar 2026,
before the link assets existed) where all four competitors rank in the top ~500k domains; no Moz/Bing
key for referring-domain data. Use the Search Console Links report from ~mid-November
(findings/backlinks.md).
Many content and schema findings were fixed the same day — see ACTION-PLAN.md.

## Executive summary

**Strong:** server-rendered pages served from an Indian edge; the cutoff, stipend, fee, SS and MDS
hub pages lead with labelled numbers and are what AI engines can cite; sitemap valid (3,760 URLs,
sampled 41 all 200 + self-canonical); the paywall gate is declared and holds against spoofed
crawlers; desktop PageSpeed 97–100, mobile 80–92.

**Top problems found**
1. The paywall declaration said the page itself was free (`isAccessibleForFree: true`) — Google's
   reference wants `false` at the top level. Fixed.
2. Auto-written college FAQs printed ranks without quota/category ("31,622 … 9,99,525") and a broken
   UG fee sentence ("on a — seat") on ~3,500 pages. Fixed.
3. On phones the PG college page's locked summary overflowed and hid the sign-in button — the
   conversion point. Fixed.
4. Claims the data cannot support were still live in code and CMS rows, plus YMYL errors (NRI age
   limit, NEET optional for NRIs, NEET PG 200 MCQs). Fixed.
5. Intent mismatches: /nri-quota/fees (searchers want MBBS NRI fees), /neet-pg-cutoff (searchers
   want qualifying marks), /neet-pg-process (searchers want dates). Open.

**Search Console (2026-10-09):** homepage, /neet-pg-cutoff, /md-ms-india/branches and a state page
indexed; the predictor "discovered, not indexed"; sitemap re-read pending. Too early for ranking data.

**Field speed (CrUX, 28 days, mobile p75):** LCP 2.88 s, FCP 2.69 s, TTFB 1.44 s, CLS 0.06 — behind
Shiksha / Collegedunia / Careers360 / CollegeDekho (LCP 1.6–2.1 s). The window predates the in-India
edge (live 2026-10-08); lab TTFB is now 20–60 ms. Re-check after ~2026-11-05.

## Limitations

Web search was unavailable to most passes (brand mentions, citations and SERP positions could not be
checked from here). The verified-Googlebot view of gated pages cannot be tested from outside.
Moz / Ahrefs / DataForSEO keys are not configured, so backlink data is limited to free sources.
Screenshots (46, 29 MB) were kept out of the repo.
