# Agent readiness: https://www.admissionhands.com (checked 2026-10-09)

Read-only audit. No form, predictor, /api/auth, /api/leads, /api/unlock or /api/predict call was made. No --ua-matrix (WAF/UA testing not authorized, so WAF behaviour toward AI agents is NOT TESTED).

## Summary
- Lighthouse Agentic Browsing: **3/3** (Lighthouse 13.5.0, mobile) on `/`; **3/3** (desktop) on `/`; **3/3** (mobile) on `/neet-college-predictor`. PSI returned HTTP 429 (shared anonymous quota exhausted), so these are local runs of lighthouse@13.5.0 (headless Chrome 154) fed through `lighthouse_agentic.py --from-json`. Raw files: scratchpad/lh_home.json, lh_home_d.json, lh_pred.json.
- Agent-UX heuristic (local 0-100, separate from Lighthouse): **100, complete** for `/` and **100, complete** for `/neet-college-predictor`.
- P0 failures: 0. P1 failures: 0. No defects found; the remaining items are opportunities.
- What most limits agents today: nothing structural. The one real limit is by design: seat rows are behind a sign-in, so an agent acting for a visitor gets band counts and the locked summary, not the list.

## Lighthouse Agentic Browsing (13.5.0)
| Audit | `/` mobile | `/` desktop | predictor mobile |
|---|---|---|---|
| agent-accessibility-tree (counted) | pass | pass | pass |
| cumulative-layout-shift (counted) | pass, 0 | pass, 0.003 | pass, 0.013 |
| llms-txt (counted) | pass | pass | pass |
| webmcp-form-coverage | N/A | N/A | N/A |
| webmcp-registered-tools | N/A | N/A | N/A |
| webmcp-schema-validity | N/A | N/A | N/A |
| ard-schema | N/A | N/A | N/A |

Paths that add a counted audit (options, not goals): publishing a valid `/.well-known/ai-catalog.json` adds `ard-schema` (only worthwhile with agent resources to list; an invalid one adds a counted failure). WebMCP audits count only if the testing browser supports WebMCP and the page registers tools or annotates every form; N/A here is not a defect.

## Evidence by check
- Server rendering (P0): pass. 1,938 words without JS on `/`. Predictor HTML is 113 KB with H1, rank `<label for="rank">`, course tablist, category `aria-pressed` buttons and BreadcrumbList + WebSite + WebPage JSON-LD in the initial HTML.
- robots.txt (P0): 200, one group (`User-Agent: *`): Allow `/`, Allow `/api/content/`, Disallow `/admin`, `/api/`, `/account`; Sitemap declared. Every AI token falls through to `*` and is allowed at root. No named AI groups, no Content-Signal (info only).
- http-404 (P1): pass. Unknown URL returns a real 404.
- llms.txt (P1): pass. 200, text/plain, 3,623 bytes, H1 + blockquote + sectioned link lists. All 25 linked URLs return 200 with no redirects (checked one by one). `/llms-full.txt` is 404 (optional).
- Markdown delivery (P1 info): `Accept: text/markdown` returns text/html (200); `Vary` lists RSC/Next headers and Accept-Encoding, not Accept; `/index.md` 404; no rel=alternate markdown link. Absence is an opportunity, not a defect.
- WebMCP (P2 info): 0 registerTool call sites, no `document.modelContext`; 1 static `<form>` on `/` unannotated. Lighthouse WebMCP audits N/A.
- /.well-known: api-catalog, oauth-protected-resource, oauth-authorization-server, agent-card.json, ucp and ai-catalog.json all 404 (real 404s, not a catch-all 200). All N/A: the site runs no public API or agent services.
- Predictor form (manual, from source and HTML, nothing submitted): rank input has a real label; course is a `role=tablist` with `aria-selected`; category and seat-type are `aria-pressed` buttons with descriptive `title`s; submit is `disabled` until a valid rank is typed. `?rank=` and `?course=` query params seed the form and auto-run the search (PredictorClient.tsx lines 148-156 and 243), a stable, agent-friendly deep link.
- Headers: pages are `private, no-cache, no-store`; CSP `form-action 'self'`, `frame-ancestors 'none'`. No X-Robots-Tag noindex on www pages.

## Findings by priority
No P0 or P1 failures.

### P1 (manual, no script evidence): results and error states are not announced
- Evidence: grep of `src/components/predictor/` finds no `aria-live`, `role="status"` or `role="alert"`. `aria-live` is used elsewhere (AuthFlow, ProfileTuner, RankLens) but not on the predictor results region or its `rank-error`/loading states. Not confirmed at runtime because the predictor must not be submitted in this audit.
- Fix: put `role="status"` (or `aria-live="polite"`) on the results summary and loading text, and `role="alert"` on the error block, so an agent or screen-reader user sees that the search finished and why it failed.
- Helps real users and accessibility-tree-reading agents today (accessibility, not a speculative standard). Verify: run the predictor once manually and check the tree after submit.

### P2: robots.txt has no deliberate AI-purpose groups
- Evidence: single `*` group. Training bots (GPTBot, ClaudeBot, CCBot), search bots (OAI-SearchBot, Claude-SearchBot, PerplexityBot) and user agents are all allowed implicitly.
- This is a coherent policy for a site whose pages are meant to be found (the gate protects rows, not pages). Only add named groups if the owner wants a different policy by purpose (for example block CCBot/GPTBot training but keep OAI-SearchBot). Owner decision; nothing is broken.
- Named Disallow groups are honoured by GPTBot, ClaudeBot and CCBot, so that is a real control today. Content-Signal lines would be a stated preference only.

### P2: gate and AI crawlers other than Googlebot/Bingbot
- By design (CLAUDE.md), only IP-verified Googlebot/Bingbot see seat rows. OAI-SearchBot, Claude-SearchBot, PerplexityBot and user-triggered agents get the locked per-quota summary plus `isAccessibleForFree:false` paywall markup. Consistent and declared, not cloaking, but AI answer engines can cite summaries, band counts, the ungated hubs, /data CSVs and /embed tables, not individual college cutoff rows from gated pages. Owner decision, not a defect.
- Not tested: whether Cloudflare WAF/Bot Fight or the Pages worker treats OAI-SearchBot, ClaudeBot or PerplexityBot differently from `*`. Needs authorization to run `--ua-matrix` plus Cloudflare logs.

### P3 / opportunities (all optional)
1. llms.txt: add a line documenting the deep link `/neet-college-predictor?rank=<n>&course=<mbbs|bds|pg>` and that rows need sign-in while band counts do not. Accurate and costs nothing. Speculative as to consumers (no named agent is confirmed to read llms.txt; Lighthouse does check it).
2. Markdown delivery for the data pages (`Accept: text/markdown` or `.md`), for example `/neet-ug-cutoff`, `/neet-pg-cutoff`. No consumer agent is confirmed to request it. Speculative; low priority.
3. WebMCP for the predictor: a possible imperative tool ("find seats for rank, category, course") bound to the existing handler. Emerging draft; only ChatGPT desktop calls tools by default. The sign-in and lead flows are consequential, so a tool should stop at band counts and never submit auth or lead forms. Speculative; skip unless the owner wants it.
4. ai-catalog.json, A2A card, API catalog: not applicable (no public API or agents). Do not publish.
5. The `Host:` line in robots.txt is a Yandex-only legacy directive; harmless.

## Access policy (robots.txt, evaluated for `/`)
- Training (GPTBot, ClaudeBot, CCBot; Google-Extended and Applebot-Extended control tokens): allowed via `*`. No Content-Signal.
- Search and AI-search indexing (OAI-SearchBot, Claude-SearchBot, PerplexityBot, plus Googlebot/Bingbot): allowed via `*`; /admin, /api/ (except /api/content/) and /account disallowed. Verified Googlebot/Bingbot see gated rows; others see the locked summary.
- User-triggered (ChatGPT-User, Claude-User, Perplexity-User, Google-Agent): allowed at root. Per the vendor matrix, Claude-User honours robots.txt, ChatGPT-User may not apply it, and Perplexity-User and Google-Agent generally ignore it. Private paths therefore rely on authentication, not robots.txt: admin, depth APIs and documents answer 401 per project notes (not re-tested here).

## Standards status (draft or proposal; dates from vendor-matrix.md, last full check 2026-09-23)
- WebMCP: W3C Community Group draft, not a standard; Chrome origin trial M149-M156, no ship milestone; WebKit opposes, Mozilla neutral. Checked 2026-09-23.
- Content-Signal: Cloudflare CC0 policy; IETF draft expired 2026-04-04; Google does not act on it. Preference only. Checked 2026-09-23.
- ai-catalog.json (ARD 1.0): draft spec; Lighthouse 13.5 checks it. Checked 2026-09-23.
- Web Bot Auth: draft-ietf-webbotauth-httpsig-protocol-00 (2026-09-01). Not relevant here yet.
- llms.txt: community spec; Lighthouse checks it; Google Search ignores it; no named consumer agent is confirmed to read it.
- Lighthouse 13.5.0 is current per the matrix (2026-09-18). The matrix is 16 days old, inside the 60-day refresh window.

## Recommendations: real today versus speculative
Real, today: (1) add live-region roles to predictor result and error states (accessibility; helps all tree-reading agents and users). (2) Keep SSR, real 404s, canonical + JSON-LD and the ungated cutoff/data hubs as they are; that is what search engines and AI search actually consume.
Speculative or emerging: llms.txt deep-link note, Markdown delivery, named AI robots groups with Content-Signal, WebMCP, ai-catalog.json.
No item here is shown to change ranking, citations or traffic.

## Structured findings for audit-data.json (AI Search Readiness)
```json
[
  {"title":"Lighthouse Agentic Browsing 3/3","severity":"info","description":"Lighthouse 13.5.0 local run: 3/3 on / (mobile, desktop) and on /neet-college-predictor (mobile). agent-accessibility-tree, CLS and llms.txt pass; WebMCP and ard-schema N/A. PSI API was quota-limited.","recommendation":"No action required."},
  {"title":"Agent-UX heuristic 100/100 on / and predictor","severity":"info","description":"Complete accessibility-tree check: 0 unnamed interactive nodes, labelled rank input, semantic landmarks, server-rendered content (1,938 words without JS).","recommendation":"Keep as is."},
  {"title":"Predictor results and errors not announced via live regions","severity":"low","description":"No aria-live, role=status or role=alert in src/components/predictor; agents and screen readers get no signal when a search completes or fails. Not verified at runtime (predictor not submitted).","recommendation":"Add role=status to the result summary and loading text and role=alert to the error block. Helps users and tree-reading agents today."},
  {"title":"robots.txt has a single * group, no AI-purpose groups or Content-Signal","severity":"info","description":"Training, search and user-triggered AI agents are all allowed implicitly. Content-Signal is a draft preference that Google does not act on.","recommendation":"Optional: add named groups only if the owner wants a training policy different from search. Named Disallow groups are honoured today; Content-Signal is speculative."},
  {"title":"llms.txt valid but lacks predictor deep-link note","severity":"info","description":"llms.txt passes the Lighthouse rule and all 25 links return 200. It does not mention the /neet-college-predictor?rank=&course= deep link or that rows need sign-in.","recommendation":"Optional one-line addition. No confirmed consumer agent reads llms.txt, so low-cost and speculative."},
  {"title":"No Markdown delivery, WebMCP or ai-catalog.json","severity":"info","description":"Accept: text/markdown returns HTML, /index.md is 404, no WebMCP tools, ai-catalog.json is a real 404.","recommendation":"Opportunities only; emerging or draft standards with no confirmed ranking or citation effect."},
  {"title":"AI crawlers other than verified Googlebot/Bingbot see the locked summary, not seat rows","severity":"info","description":"By design with declared paywall markup. AI answer engines can cite summaries, ungated hubs and open data, not per-college rows. WAF treatment of AI user agents was not tested (no authorization).","recommendation":"Owner decision. Confirm Cloudflare WAF and bot settings do not challenge OAI-SearchBot, Claude-SearchBot or PerplexityBot if AI search visibility is wanted; run --ua-matrix with authorization."}
]
```
