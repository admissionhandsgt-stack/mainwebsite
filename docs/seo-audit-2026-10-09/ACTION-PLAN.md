# SEO action plan — admissionhands.com (audit of 2026-10-09)

Health score at audit time: **74/100**. Items marked ✅ were fixed and deployed the same day
(commits `84dadcb`, `560fbb9` on `develop`); everything else is open, most important first.
Per-area evidence is in `findings/`.

## Fixed on 2026-10-09 ✅

| Area | What |
|---|---|
| Paywall markup | Top-level `isAccessibleForFree` is now `false` (Google's reference for a partly gated page); `verify_gate.mjs` and `paywall.spec.ts` check that level |
| College FAQs (~3,500 pages) | Every rank names quota + category; the year is the seat's own; UG fee answer no longer prints "on a — seat"; same-quota fee pairs say the difference is the course |
| Mobile | PG college locked summary no longer pushes the sign-in button off a 390px screen; swipe hint on wide tables; unknown seat counts show "—" not "0" |
| Course labels | UG college titles take the course from the college's own cutoff rows (16 of 1,309 were mislabelled) |
| Claims | "secret weapon", "proprietary", "0% document rejection", "85% / 100% success", "most trusted", "5+ years … predict", unsourced ₹10–25L range — removed from code and (guarded) CMS rows |
| YMYL facts | NRI: no upper age limit, NEET mandatory for NRI seats; NEET PG: 180 MCQs, NBEMS, percentile notified yearly |
| Admin host | `X-Robots-Tag: noindex, nofollow` on admin.admissionhands.com |
| Titles | `/neet-ug-cutoff` leads with 2026 & 2025 |

## Critical / High — next

1. **Google Business Profile + /contact page** (owner + code). Office at 915 Bhutani City Center,
   Sector 32, Noida is real and public; no GBP, no /contact (404). Build /contact with NAP, hours
   (Mon–Sat 10–7), map link; create GBP (Educational consultant) pointing at it. `findings/local.md`.
2. **/nri-quota/fees vs "nri quota mbbs fees"** — every result is an MBBS NRI fee list; ours leads
   with MD/MS and says we publish no MBBS NRI fee. Needs MBBS NRI fees from official state fee
   notices (KEA, Maharashtra FRA, TN…). `findings/sxo.md`.
3. **/neet-pg-cutoff answers ranks, searchers want qualifying marks** — add the NBEMS qualifying
   score table (2025 incl. the Jan-2026 cut; 2026 262/244/226 — verify against NBEMS) at the top;
   same idea for NEET UG.
4. **Free part misses the headline number** — branch pages show "Best R1 (GEN) 1"; show the AIQ
   closing rank by category and the year-on-year change free (a group range, not a seat row).
5. **Figures contradict each other** — hero vs locked summary seat counts (branch 2,667 vs 3,579;
   MMC 468 vs 1,553), hero "2026" vs FAQ "2025" year, state merit ranks unlabelled beside AIR.
   One definition of "seats", label every rank AIR / state.
6. **DNB / NBEMS hospitals titled "MD/MS Cutoff"** (~1,472 pages) — label DNB/diploma correctly.
7. **Duplicate college records** (~20 pairs, e.g. CMC Vellore 252 vs 2 PG seats) — merge with 301s
   (needs the owner's go-ahead: it changes seat data).
8. **FAQ content only after a click / FAQ schema for invisible questions** on /mbbs-india,
   /nri-quota, /md-ms-india; /neet-ug-process promises 15 milestones but renders 1 server-side.
   Render with `<details>`, build schema from the same array.
9. **No "data as of" date or source link** on data pages; Dataset markup lacks
   `temporalCoverage`, `dateModified`, `publisher` and sits only on /data.
10. **Entity / E-E-A-T** — no named counsellors (Person schema), Organization lacks address,
    `legalName`, `foundingDate`; LinkedIn/X profiles missing; Facebook "About" is stale
    (MBA/B.Tech/abroad).

## Medium

- Performance: framer-motion (37 KB gz) ships everywhere for the mobile drawer — lazy-load it;
  gtag long tasks inflate TBT on the predictor — load on interaction; trim Plus Jakarta @font-face
  and unused weights; college LCP image quality 50, drop logo `fetchPriority`. `findings/performance.md`.
- Predictor: opens on MD/MS though the generic query is UG; 172 words, no FAQ; add `aria-live`
  to results.
- Homepage: predictor not offered above the fold; ~150px dead space on mobile.
- Hero CTAs under 44px on /mbbs-india, /md-ms-india; image credit overlaps "Call Expert".
- /neet-pg-process has no dates — a dated 2026 schedule box fed by the alert feed.
- Sitemap index split by family (monitoring in Search Console); lastmod for SS/MDS pages.
- College names polluted with addresses/PINs in H1, JSON-LD names, breadcrumbs.
- Stipend page: bond information (5 of 9 results pair them); outliers (₹5,000).
- Remaining CMS copy: home testimonials unverifiable; "Direct College Connections" (NRI).

## Low / later

- 235 slugs > 100 chars (301s if renamed); `/neet-ss/mch-plastic-and-reconstructr-uctive-surgery`
  typo duplicate; `Host:` line in robots.txt; priority/changefreq removable; micro text 7–10px on
  /md-ms-india; robots named groups for AI training crawlers (owner decision); `data-nosnippet` on
  gated rows (owner decision: keeps rows out of AI Overviews while still ranking).

## Off-site (owner)

GBP; Justdial / Sulekha / Bing Places with identical NAP; LinkedIn + X added to Admin → content
`social.*`; YouTube explainers per data page; hand-written Reddit/Quora answers; press pitch for the
stipend report. Brand-mention checks could not run from here (search blocked) — check manually.
