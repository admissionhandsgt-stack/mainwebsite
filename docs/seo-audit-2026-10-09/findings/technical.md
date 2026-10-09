# Technical SEO findings: https://www.admissionhands.com

Audit date: 2026-10-09. Read-only. About 130 GET/HEAD requests at roughly 1 per second. No forms, no /api/auth, /api/leads, /api/unlock or /api/verify calls.
Sampled: home, /neet-college-predictor, /mbbs-india, /md-ms-india, /neet-pg-cutoff, /neet-ug-cutoff, /data, /ayush-colleges, 3 branch pages, /md-ms-india/states/karnataka, 3 random UG college pages, 2 random PG college pages, plus header and status probes.

**Technical score: 84 / 100**

| Category | Status | Note |
|---|---|---|
| Crawlability (robots, sitemap) | Pass | Sitemap validated by the helper: 3,760 unique www URLs, valid XML, all HTTPS |
| Indexability (canonical, noindex, duplicates) | Pass, with 2 issues | Canonicals self-referencing and stripped of query strings. Admin subdomain is indexable. Non-MBBS colleges sit under /mbbs-india/ |
| Security (HTTPS, headers) | Pass | HSTS preload, nosniff, X-Frame-Options DENY, CSP, Referrer-Policy and Permissions-Policy all present |
| URL structure and redirects | Pass | One 2-hop redirect on http://apex. Many very long slugs |
| Mobile | Pass | Viewport is correct on every page sampled |
| Core Web Vitals (source) | Pass, with a TTFB-tail warning | Intermittent slow first bytes. HTML is heavy on the data pages |
| Structured data | Pass | Paywall declaration verified |
| JS rendering | Pass | All content is server-rendered. No SPA shell |
| IndexNow | Not testable externally | Key file is public by design; not verified from outside |

## Verified OK (do not re-open)

- **Sitemap.** The helper reports `/sitemap.xml` declared in robots.txt, status 200, kind urlset, valid. The fallbacks (`sitemap_index.xml`, `sitemap-index.xml`, `wp-sitemap.xml`) are 404, which is fine for a single-file sitemap. 827 KB and 3,760 URLs are well inside the limits. No duplicates, no non-www URLs, no trailing-slash URLs, no raw `&` characters.
- **Canonical host.** `http://www` returns 301 to `https://www`. `http://apex` returns 308 to `https://apex`, then 301 to `https://www` (see L3). `origin.admissionhands.com` returns 301 to www. `admissionhands-edge.pages.dev` and `uat.admissionhands.com` send `x-robots-tag: noindex`, and the pages.dev canonical points at www.
- **Trailing slash and case.** `/md-ms-india/` returns 308 to `/md-ms-india`. A college URL with a trailing slash returns 308 to the clean URL. `/NEET-college-predictor` returns 404.
- **Soft 404s.** Unknown paths, unknown college slugs, unknown states and unknown branches return real 404s. The 404 template carries `noindex`.
- **Canonicals and on-page tags.** `/neet-college-predictor?rank=5000&utm_source=x` canonicalises to the clean URL. All 17 sampled pages have exactly one self-referencing absolute canonical, one H1, a viewport meta tag and `lang="en"`. Titles are 47-62 characters. Descriptions are 128-159 characters. OG has 8-10 tags and Twitter has 7. The OG image is a 1200x630 JPEG. The Organization logo is `icon-512.png`, not AVIF. Favicons are square PNG plus ICO.
- **Paywall declaration** (the intentional gate). Checked on 3 UG college pages, 2 PG college pages and 1 branch page. Each has JSON-LD `WebPage` with `isAccessibleForFree:true` and `hasPart` as a `WebPageElement` with `isAccessibleForFree:false` and `cssSelector:".ah-gated-depth"`. The HTML contains an element with `class="ah-gated-depth ..."` that wraps the `data-testid="locked-summary"` block, so the selector matches a real element. The declaration is correct and I do not recommend removing the gate. I cannot test the verified-Googlebot path from outside, because it is IP-gated.
- **Noindex handling.** `/login` has `noindex, nofollow`. `/account` returns 307 to `/login?next=`. CSV downloads and `/embed/*` send `x-robots-tag: noindex`. CSVs also send `Link: rel=canonical` to the data page, and embeds carry a canonical tag and `frame-ancestors *`. This is consistent with the design.
- **Robots.txt.** The `/api/content/` allow and the `/admin` and `/account` disallows work as intended. `/login` is correctly left crawlable so its noindex can be read. `/llms.txt` exists and is well formed.
- **Rendering and compression.** Pages are fully server-rendered (H1, body copy and JSON-LD are in the raw HTML). Brotli is served. Hashed static CSS is `immutable` for 1 year. Images are cached for 1 day plus 7 days stale-while-revalidate.
- **Structured data.** Home has Organization (logo, sameAs, contactPoint) and WebSite. College pages have CollegeOrUniversity, BreadcrumbList, FAQPage and the paywall WebPage. /data has a Dataset with DataDownload for each of 9 datasets. Branch and state pages have BreadcrumbList, FAQPage and ItemList. All JSON-LD parses.
- **Word counts (anonymous view).** College pages 457-711 words, branch page 782, Karnataka state page 2,329. Not thin.

## Prioritised issues

### Critical
None.

### High

**H1. About 36% of the `/mbbs-india/colleges/*` URLs are not MBBS colleges, and some are mislabelled "MBBS".**
- Evidence: `/mbbs-india/colleges/` holds 1,309 sitemap URLs. By slug, about 471 are dental, Ayurveda, Homoeopathy, Unani, Siddha, nursing or veterinary colleges (counts by keyword, with overlap: 304 dental, 114 ayurved/ayurvedic, 55 homoeo/homeo, 9 siddha, 7 nursing, 4 unani, 3 veterinary).
- `/mbbs-india/colleges/ra-podar-ayurved-medical-college-mumbai-maharashtra-dr-annie-besant-road-worli-mumbai-400-018-maharashtra-400018-ug`: the title ends "BAMS Cutoff", but the breadcrumb reads "Home > MBBS colleges > ..." and the page sits in the MBBS folder.
- `/mbbs-india/colleges/mmm-govt-ay-mahavidyalaya-udaipur-rajasthan-rada-ji-circle-ambamata-scheme-udaipur-rajasthan-313001-ug` is an Ayurveda college ("Ay." is short for Ayurved). Its title says "MBBS Cutoff" and its description says "NEET UG MBBS closing ranks". That is a factual mislabel.
- Dental colleges (e.g. `/mbbs-india/colleges/sri-balaji-dental-college-hyderabad-ug`) are titled correctly as "BDS Cutoff", but they live under `/mbbs-india/`. The topical signal in the URL, breadcrumb and JSON-LD ("MBBS colleges") is wrong for about a third of the section.
- Why it matters: it dilutes the topical relevance of the `/mbbs-india/` folder, mismatches intent for "BDS/BAMS colleges" queries, and the course classifier misses abbreviations such as "Ay.".
- Fix:
  1. Drive the course label from the `courses` table or the rank rows, not from the college name, so "Ay." and similar abbreviations are classified correctly.
  2. Make breadcrumb level 2 follow the course: "BDS colleges" linking to `/bds-india`, "AYUSH colleges" linking to `/ayush-colleges`.
  3. Longer term, serve non-MBBS colleges under `/bds-india/colleges/<slug>` and `/ayush-colleges/<slug>`, with 301s from the old URLs and the sitemap updated in the same release. This is a bigger change; items 1 and 2 are enough to fix the wrong signals now.

### Medium

**M1. admin.admissionhands.com is crawlable and indexable.**
- Evidence: `https://admin.admissionhands.com/` returns 200 with no `x-robots-tag` and no robots meta. The title is the marketing title "AdmissionHands - Expert Medical College Admission Guidance". Its `robots.txt` is the same as the main site's: `Allow: /`, and the `Disallow: /admin` rule does not cover the host root, because admin pages are rewritten internally.
- Why it matters: Google can index the admin login page, creating a duplicate-titled page on another hostname and exposing an admin login to search.
- Fix: in Caddy or in middleware on admin hosts, add `X-Robots-Tag: noindex, nofollow` to every response. Keep it crawlable (do not `Disallow: /`) so Google can read the noindex. Use a distinct `<title>` on the admin host.

**M2. Intermittent slow first bytes, with one timeout.**
- Evidence: most responses are fast (TTFB 0.11-0.15 s, served from the DEL colo). Outliers: home 3.03 s (total 8.1 s) on the first request, `/neet-pg-cutoff` 2.58 s, `/neet-ug-cutoff` 1.25 s, a college page 1.13 s, `/ayush-colleges` 0.94 s. One request to `/md-ms-india/branches/md-radio-diagnosis` timed out at 40 s with no response; five retries over the next minutes were all 200 in 0.12-0.87 s.
- HTML responses carry `x-edge: PASS`, `cf-cache-status: DYNAMIC` and `Cache-Control: private, no-cache, no-store` on 4 consecutive requests with a browser user-agent. CLAUDE.md says anonymous HTML is cached at the edge for 60 s with background revalidation, but I did not see a HIT. This may be by design (for example, a bypass rule I tripped), so confirm in the Pages worker logs.
- Why it matters: pages are `force-dynamic`, and a crawler gets the fully rendered gated pages. Intermittent multi-second or timed-out responses lower crawl rate and can show up as "Server connectivity" in crawl stats across 3,500 dynamic pages. They also hurt field LCP on cold paths.
- Fix: find what caused the ~40 s hang around 11:00 UTC on 2026-10-09 in the origin and worker logs (DB pool exhaustion or the worker waiting on a stalled origin are the usual causes). Add an origin timeout and one retry in the Pages worker so a stall gives a fast 502 instead of a 40 s hang. Check that the anonymous HTML edge cache is actually serving. Watch Search Console "Crawl stats > Average response time" and the Host status report.

**M3. Titles truncated in the middle of a college name, and addresses in names.**
- Evidence: `<title>RA Podar Ayurved Medical College… Mumbai 400 018. BAMS Cutoff</title>` and `<title>MMM Govt. Ay.… AMBAMATA SCHEME UDAIPUR MBBS Cutoff</title>`. The ellipsis sits inside the name, leaving address fragments ("400 018.", "AMBAMATA SCHEME UDAIPUR"), because the source name field holds a postal address.
- The H1, breadcrumb and JSON-LD `name` carry the whole address too: "RA Podar Ayurved Medical College, Mumbai, Maharashtra, Dr. Annie Besant Road, Worli, Mumbai 400 018., Maharashtra, 400018". Maharashtra and the PIN appear twice. This hurts SERP appearance and CTR and pollutes the entity name in `CollegeOrUniversity.name`.
- Fix: split a clean `display_name` from the address at import time. Build the title as `<display name>, <city> — <course> Cutoff & Fees 2026`, keep the full address in an address field, and never put an ellipsis inside the college name (drop the suffix or city instead). Use the same display name in H1, breadcrumb and JSON-LD `name`. PG pages are mostly fine ("Lady Hardinge Medical College, New Delhi-110001") but still carry the PIN in the name.

**M4. Very long, address-based slugs.**
- Evidence: 140 UG college slugs exceed 100 characters and 164 end in a six-digit PIN before `-ug`. Example: `/mbbs-india/colleges/government-ayurved-college-jalukbari-guwahati-assam-po-gauhati-university-ps-jalukbari-dist-kamrup-metro-guwahati-assam-781014-ug`. PG slugs follow the same pattern and include source typos (`gurukripa-hospitals-jyoti-nagar-piprali-raod-sikar-rajasthan-332001`).
- Why it matters: long slugs look spammy in SERPs, break when a source corrects an address, and keep typos.
- Fix: not urgent. When the `display_name` work in M3 is done, generate short slugs (`<name>-<city>`), 301 the old ones, and update the sitemap in the same release. Do not change slugs without 301s.

### Low

**L1. Near-duplicate NEET SS slug.** `/neet-ss/mch-plastic-and-reconstructive-surgery` and `/neet-ss/mch-plastic-and-reconstructr-uctive-surgery` are both in the sitemap. The second is a PDF-extraction typo from a wrapped cell. Merge the names in the import and 301 the typo slug. Check the other SS and MDS names for the same artefact.

**L2. Sitemap `lastmod` is a bulk import date.** All 1,309 UG college URLs say 2026-09-22 and all 2,168 PG college URLs say 2026-09-17. An identical lastmod across thousands of URLs teaches Google to ignore the field. Set it to when each college's own data last changed. The 114 static URLs, 74 `/neet-ss/*` and 9 `/neet-mds/*` pages have none; add one for the cutoff hubs, which do change. `changefreq` and `priority` are present but Google ignores them (harmless).

**L3. Two-hop redirect from http apex.** `http://admissionhands.com/x` goes 308 to `https://admissionhands.com/x`, then 301 to `https://www.admissionhands.com/x`. Make the http apex rule redirect straight to `https://www`. Impact is small, since internal links and the sitemap are already canonical.

**L4. No dedicated privacy URL.** `/privacy`, `/privacy-policy`, `/refund-policy`, `/disclaimer`, `/contact` and `/about` all return 404. All legal documents are inside one tabbed page, `/terms`, titled "Legal Information" and linked in the footer only as "Terms". It does contain Privacy Policy, DPDP Compliance and Payment & Refund sections. The site collects phone numbers, so a findable `/privacy-policy` URL linked as "Privacy Policy" in the footer is a trust and compliance signal, and Google Ads and some OAuth flows require one. Fix: add real routes for each legal document, link them in the footer, and add them to the sitemap.

**L5. Page weight on the data hub pages.** Uncompressed HTML is 301 KB for `/mbbs-india`, 464 KB for `/ayush-colleges` and 484 KB for `/md-ms-india/states/karnataka` (about 291 KB of that is inline RSC `self.__next_f.push` data). Over the wire it is 43-83 KB, so crawl cost is fine, but parse time and INP on mid-range phones can suffer. Paginate or collapse long lists. Link counts (268 and 354 anchors) are acceptable for hub pages.

**L6. CSP allows `'unsafe-inline'` and `'unsafe-eval'`.** Needed today because of inline Next RSC data and JSON-LD. No SEO impact. A nonce-based CSP is a later hardening item.

**L7. Sitewide alerts-bar outbound links.** Every page carries about 12 external links (government notices, state boards, two Google Drive file links). They are `rel="noopener noreferrer"` only. The authority links are a positive. For the Google Drive links, consider `rel="nofollow"` or replace them with the official URL.

**L8. Organization schema is thin.** It has plain `Organization` type, no postal address and no LinkedIn or X in `sameAs` (known). A more specific type with an address helps Knowledge Panel matching. Not a ranking factor in itself.

**L9. `robots.txt` carries a `Host:` line.** `Host: https://www.admissionhands.com` is a legacy Yandex-only directive that Google and Bing ignore; remove it. There are no explicit AI-crawler rules (GPTBot, ClaudeBot, PerplexityBot, Google-Extended). That is a business decision, and `llms.txt` is present. If you want to keep the gated seat data out of training sets, add per-bot disallows, and never disallow Googlebot or Bingbot.

**L10. `og:type` is `article` on college and branch pages.** `website` is a better fit for reference data pages. Cosmetic.

## Not verified

- **Verified-Googlebot behaviour.** Cannot be exercised from outside (IP-verified). The declaration side is correct (see above). The repo's `verify_gate.mjs` and `paywall.spec.ts` cover the rest.
- **Core Web Vitals.** Source inspection only. The LCP logo is preloaded with `fetchpriority=high` (AVIF), analytics are deferred, CSS is 3 render-blocking files (a known Next 14 limitation), and I found no CLS risk from source. Use PSI or CrUX for numbers.
- **IndexNow.** The key filename is not exposed in the HTML, so I could not check it. CLAUDE.md says all URLs were submitted on 2026-10-08.
- **Duplicate-title groups** (about 20, known) were not re-tested. Merging or canonicalising the duplicate source records would fix them.
