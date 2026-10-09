# Performance audit: https://www.admissionhands.com (2026-10-09)

Method: PageSpeed Insights API v5 (Lighthouse 13.5.0, run from Google's servers, PSI_KEY from .env.local), mobile x3 and desktop x1 per page. Runs 2 and 3 used `?psi=N` to get past PSI's result cache, so they hit the edge on a different cache key. A second set of 3 local Lighthouse 13.5.0 mobile runs (this PC in India, headless Chrome 154) was taken on the two weak templates. Everything is LAB data. The only field data is the origin-level CrUX block that PSI returns. Read-only: no forms submitted. Raw JSON is in the scratchpad `lh/` and `local/` folders.

## Overall performance score: 86 / 100
Mobile PSI: median of page medians is about 89 (range 80-92). Desktop is 97-100. Field LCP is "needs improvement". The templates flagged earlier (PG college 81, branch 77) did not reproduce on PSI today (88 and 90). They did reproduce on a slower local CPU (see below).

## Per page (mobile PSI, median of 3; per-run scores in brackets)
| Page | Score | LCP | LCP element | FCP | TBT | CLS | Desktop |
|---|---|---|---|---|---|---|---|
| / | 89 [87/90/89] | 3.38 s | h1 headline (text) | 1.95 s | 130 ms | 0.001 | 100 |
| /neet-college-predictor | 80 [80/67/90] | 2.99 s | hero subtitle p (text) | 1.50 s | 535 ms (runs: 535 / 1685 / low) | 0.024 | 99 |
| /md-ms-india/colleges/bangalore-medical-college-and-research-institute-bangalore | 88 [80/88/88] | 3.60 s | img campus backdrop (opacity-45, fetchpriority=high) | 1.95 s | 98 ms | 0.000 | 97 |
| /mbbs-india/colleges/maulana-azad-medical-college-new-delhi-ug | 89 [89/90/89] | 3.45 s | img campus photo | 1.80 s | 112 ms | 0.001 | 100 |
| /md-ms-india/branches/md-general-medicine | 90 [95/88/90] | 3.30 s | span in the "Read the quota column with the rank..." note paragraph (text) | 1.80 s | 109 ms | 0.017 | 100 |
| /neet-pg-cutoff | 92 [92/94/91] | 3.00 s | h1 (text) | 1.50 s | 128 ms | 0.009 | 99 |

TTFB in every lab run was 20-60 ms (edge). INP cannot be measured in the lab, so TBT is the proxy. No INP appears in the CrUX block (insufficient data).

Local Lighthouse on this PC (mobile, simulated throttling, slower and noisier CPU, benchmarkIndex 1100-2200):
- PG college: 62 / 61 / 69, LCP 4.5-4.9 s, TBT 409-598 ms
- Branch: 45 / 67 / 71, LCP 4.6-9.1 s, TBT 315-510 ms (the 45 is a cold first run, FCP 7.4 s)

This matches the 370-500 ms TBT seen earlier. The two templates are sensitive to CPU speed, so TBT is the number to watch on mid-range Android phones even though PSI's CPU model scores them 88-90.

## Core Web Vitals status
Field (CrUX, origin-level, 28-day, from PSI `originLoadingExperience`; per-URL data was not available, so the same block came back for every page):
- LCP p75 2879 ms, AVERAGE (62% good / 28% / 10%). Fails the 2.5 s bar.
- FCP p75 2690 ms, AVERAGE.
- TTFB p75 1442 ms, AVERAGE. This window is mostly before the in-country Pages edge went live on 2026-10-08, so expect it to improve over the next weeks.
- CLS p75 0.06, FAST (91% good). Passes.
- INP: not reported (insufficient data).

Lab: LCP is 3.0-3.6 s on all six pages in the simulated slow-4G / 4x-CPU profile. TTFB is not the cause (20-60 ms). Lab CLS passes everywhere (0.000-0.024).

## Findings, by evidence and impact

1. **Every page ships framer-motion for a drawer that starts closed.** `src/components/Header.tsx` line 10 imports `motion, AnimatePresence`, used only inside the mobile menu (lines 253-376). Chunk `9845-*.js` (110 KB raw, 37 KB gzip, contains framer's VisualElement code) loads on every page. In the local runs the bootup table attributes 0.55-1.3 s of total main-thread time to this chunk. Only 87-194 ms of that is script; the rest is style/layout work its code triggers. The attribution is my reading of the trace, not a profiled cause. It is the largest single JS item that can come off the critical path of every template.
   Fix: load the drawer with `next/dynamic` (`ssr:false`, mounted only after the first tap), or use `LazyMotion` with `domAnimation` and the `m` component, or a CSS transition for the drawer. Expected: -37 KB gzip, roughly -100 to -300 ms TBT on slow CPUs, fewer long tasks near hydration.

2. **Google tag is the largest remaining long-task source, and it lands inside the TBT window.** `gtag/js` is 178 KB (73 KB unused) with 197-391 ms scripting. On PSI it produces the long tasks at 4.9-5.5 s, just before TTI. On predictor run 2 it produced 699 ms and 512 ms tasks, which explains TBT 1685 and the 67 score. `lazyOnload` already fires after `load`, but on a slow phone that is still before Lighthouse's TTI cutoff.
   Fix: start it from a first-interaction or `requestIdleCallback` trigger with a 3-5 s cap, or move GA4 off the main thread (Partytown / server-side tagging). Expected: TBT -100 to -400 ms; the predictor's variance largely goes away.

3. **Main-thread cost of the shared shell (hydration plus style/layout), not page-specific code.** Per-page JS is tiny (PG college page chunk 7 KB, layout 35 KB raw). The cost is the shared runtime: `fd9d1056` (react-dom, 173 KB raw / 53 KB gz), `2117` (Next client runtime, 124 KB raw / 32 KB gz, includes polyfills for `Array.prototype.at/flat/flatMap`), the Radix/toast chunk `8808` (35 KB raw), and about 11 small shared chunks that all hydrate on every page. On PSI, Script Evaluation is 340-880 ms and Style and Layout 180-475 ms. Locally, Style and Layout alone is 1.3-1.7 s. Local long tasks of 380-470 ms occur at about 1.0 s: parse, style and first layout of a 200 KB / ~1000-element document with 183 KB of CSS, followed by 150-200 ms hydration tasks.
   Fixes:
   - Raise the browserslist target so Next stops shipping the Array polyfills (legacy-JS insight, 11 KiB).
   - Dynamic-import below-the-fold client components on the PG college and cutoff pages.
   - Add `content-visibility:auto` with `contain-intrinsic-size` to long below-fold sections and tables. This cuts first-layout cost without touching the DOM.

4. **Render-blocking CSS: 3 sheets; the main one (`a8975920*.css`) is 183 KB raw / 27 KB gzip.** Lighthouse's render-blocking insight estimates about 1.5 s of savings on the PG college page, about 750-900 ms of it from the largest sheet. This is why FCP is 1.5-1.95 s with a 30-60 ms TTFB. Next 14.2 cannot inline critical CSS (per CLAUDE.md), so reduce bytes instead:
   - About 30 KB of the raw size is `@font-face` rules. Plus Jakarta Sans is declared for 5 weights x 4 subsets, although CLAUDE.md says it is only a fallback. Drop it from `next/font` if nothing renders in it. Trim Figtree to the weights actually used (400-900 are declared).
   - Check Tailwind content globs and safelists for unused classes, and keep admin-only CSS out of the public bundle if it is included.

5. **Web fonts add 150-180 KB on content pages and trigger late relayout.** PG college and UG college load 152-163 KB of fonts, home 180 KB, against 68 KB on the predictor. Three files are fetched at VeryHigh about 100 ms after the HTML: `e4af272c` (48 KB, Inter latin), `d9fef5bf` (11 KB, Figtree latin-ext) and `8e9860b6` (84 KB, Inter latin-ext). The latin-ext files are pulled in by the rupee sign and similar characters, as CLAUDE.md already notes. The layout-shift audit on the PG college page names these three font loads as the cause of its (tiny) shifts.
   Fixes:
   - Render the rupee sign in a system-font span (for example `font-family: system-ui`), or subset Inter to include U+20B9 so latin-ext is never requested. Saves about 95 KB per page and one relayout.
   - Use `display: optional` for Inter (body) so a late font never reflows text. The size-adjust fallbacks are already set by next/font.

6. **LCP is an image on the two college templates, with about 290-310 ms resource load delay and 250-350 ms render delay.** The image is preloaded and has fetchpriority=high (good). Problems:
   - The logo (`logo.avif`, 17 KB) is also `fetchPriority=high` and preloaded, so it competes with the LCP image. Drop the high priority on the logo.
   - The image-delivery insight flags 37-50 KB of wasted bytes in the LCP image (`w=750&q=75`). The hero is an `opacity-45` backdrop, so lower quality is invisible: use `quality={50}` for these backdrops and set `sizes` to match the container.
   - If the backdrop is decorative, make the visible h1 the LCP candidate by using a tiny inline placeholder (the home page already does this via `lib/backdrop.ts`) and lazy-loading the full photo. This removes LCP's dependency on an image.
   Expected: LCP -300 to -600 ms on the college templates.

7. **Text-LCP pages (home, predictor, branch, cutoff) have 0.9-1.6 s element render delay after a 30-60 ms TTFB.** Text LCP paints when the CSS arrives and the fonts swap (findings 4 and 5). The predictor's LCP element is the subtitle paragraph, not the headline. Fixing 4 and 5 is what moves this number.

8. **Predictor has the worst variance and a small CLS (0.024).** The shifted node is the tool card `div.relative.z-10.-mt-12` (rank box and tabs), 541 px tall. It moves when fonts swap or the client tool hydrates. Give the card a fixed `min-height` or a same-height skeleton, and use `display: optional` for Inter. TBT here swings 90-1685 ms between runs (gtag plus the 2117 and fd9d chunks).

9. **Inline payload is modest but not free.** Per page: document 27-40 KB gzip (110-221 KB raw); inline RSC flight data 27-80 KB raw (PG college 78 KB, PG cutoff 80 KB, home 45 KB; it mirrors the rendered tree); inline SVG 23-54 KB raw (home 135 SVGs / 54 KB, other pages 62-71 SVGs / 24-28 KB); 640-1300 tags. Gzip keeps this cheap on the wire, so the cost is parse and style, not network. Using one SVG sprite or CSS masks for icons repeated in lists would save about 20 KB of HTML. Low priority.

## Prioritised recommendations
| # | Change | Where | Expected impact |
|---|---|---|---|
| 1 | Lazy-load framer-motion in the mobile drawer (dynamic or LazyMotion) | `src/components/Header.tsx` | -37 KB gz JS on every page; TBT -100 to -300 ms on slow CPUs |
| 2 | Defer GA4 to first interaction / idle with a cap | `src/app/layout.tsx` | TBT -100 to -400 ms; removes the 500-1700 ms predictor spikes |
| 3 | Stop the rupee sign pulling Inter latin-ext; drop unused Jakarta/Figtree weights; Inter `display: optional` | `src/app/layout.tsx`, font config | -95 KB per content page; fewer relayouts; smaller CSS |
| 4 | College hero: remove high priority from the logo, quality 50 on the backdrop, or use an inline placeholder | `src/app/md-ms-india/colleges/[slug]`, `src/app/mbbs-india/colleges/[slug]`, Header logo | LCP -300 to -600 ms on both college templates |
| 5 | Shrink the main CSS (font-face, unused Tailwind) | `src/styles/*`, `tailwind.config.ts` | FCP/LCP -150 to -400 ms (render-blocking) |
| 6 | `content-visibility:auto` on below-fold sections; dynamic-import below-fold client components | college, branch and cutoff pages | Less first-layout cost (380-470 ms task locally) |
| 7 | Raise browserslist to drop Array polyfills | `package.json` / `next.config.mjs` | -11 KB JS |
| 8 | Reserve height for the predictor tool card | `PredictorClient` | CLS 0.024 to about 0 |

## What is already good
TTFB 20-60 ms in the lab at the edge; LCP image preloaded with fetchpriority; CLS under 0.025 on every page; no hero opacity-0 fade; Figtree preloaded and the other fonts not; all scripts async; desktop 97-100; page-specific JS under 12 KB; total transfer 530-700 KB. The PSI mobile score is dominated by simulated CPU slowdown, so the gap to 100 is JavaScript and CSS bytes, not network.

## Notes and caveats
- PSI scores swing 10-15 points between identical runs (PG college 80 vs 88, predictor 67 vs 90). Treat medians as indicative.
- Runs 2 and 3 used a cache-busting query string, so they measure edge cache misses. They scored the same or better than run 1, so the edge is not hiding a slow origin.
- CrUX data is origin-level only. The window spans the pre-edge period, so the 1.44 s TTFB and 2.88 s LCP should improve in the next 2-4 weeks. Re-check with `crux_history.py` after about 2026-11-05.
- I created and then deleted one temporary script (`scripts/_tmp_psi_run.mjs`) in the repo. The modified files showing in `git status` (KnowUsClient, md-ms-india/colleges/[slug]/page.tsx, collegeSeo.ts and others) are not from this audit.
