# AdmissionHands — Project Memory

Marketing + lead-gen site for Indian medical-college admissions counselling (MBBS / MD-MS / NRI quota),
plus a password-protected admin CMS. Read this file first; it replaces exploring the tree.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router (`src/app`), React 18, TypeScript (`strict: false`, `strictNullChecks: true`) |
| Styling | Tailwind + shadcn/ui (Radix), `class-variance-authority`, `next-themes` (class dark mode) |
| Data | PostgreSQL on the VPS + Drizzle (`src/db/`). Reads via `src/lib/content.ts`, writes via `/api/admin/*` |
| Animation | framer-motion |
| Hosting | Cloudflare Workers via OpenNext (`@opennextjs/cloudflare` + `wrangler.jsonc`) |
| Tests | Playwright specs in `tests/` |

## Commands

```bash
npm run dev          # next dev on :3000
npm run build        # next build  <- run this to verify any structural change
npm run typecheck    # tsc --noEmit
npm run lint
npm run test:e2e     # playwright (expects a running dev server, see playwright.config.ts)
npm run smoke -- <url>                   # 57 black-box checks: routes, gate, redirects, claims
node scripts/audit_site.mjs <url>        # in-browser QA: a11y, tap targets, metadata, links
node scripts/verify_auth_flow.mjs <url>  # 21 checks: sends a real code, redeems it, signs in
npm run build:cf     # OpenNext build for Cloudflare
npm run deploy:cf    # deploy worker
```

Env (`.env.local`, git-ignored):

| Variable | What it does |
|---|---|
| `DATABASE_URL` | Postgres through the SSH tunnel — see "PostgreSQL" below |
| `UNLOCK_SECRET` | Signs the seat-gate cookie. Unset, unlocks die on restart |
| `WHATSAPP_VERIFY_NUMBER` etc. | **Optional.** The WhatsApp settings live in the admin now (`/admin/whatsapp`); setting one here pins it and the screen shows it as fixed |
| `WHATSAPP_TOKEN` / `WHATSAPP_RECIPIENT_NUMBER` | Optional, for lead alerts |

The Supabase keys still sitting in `.env.local` are dead — nothing in `src/` reads them.

## Layout

```
src/app/            routes (App Router). Server page.tsx usually wraps a "use client" *Client.tsx
src/components/     feature folders: home/ mbbs/ mbbs-india/ md-ms/ nri/ legal/ lead/ admin/ ui/
src/components/ui/  shadcn primitives — only the ones actually in use are kept (see "Cleanup" below)
src/hooks/          useAuth, useCTA, useContactInfo, useDeemedColleges, usePGColleges, useLiveAlerts, useVideoManager, use-toast
src/lib/            data/services: colleges, videos, legalService, mediaService, whatsappService, analytics, constants
src/utils/envHelper.ts      domain/environment detection (used by middleware AND layout)
src/styles/         base|components|utilities|animations|layout.css, all @imported by src/index.css
src/db/             schema.ts, client.ts, migrations/ (Drizzle)
src/lib/pageContent.ts | pgContent.ts | nriContent.ts   CMS-over-defaults resolvers per page
scripts/            import + seed scripts (see "Seeding the CMS")
```

## Routing / environments — the part that bites

`src/middleware.ts` + `src/utils/envHelper.ts` drive multi-domain behaviour:

- `admin.admissionhands.com` / `admin-uat.admissionhands.com` → admin subdomains. Requests are **rewritten**
  to `/admin/*` internally; an explicit `/admin` prefix in the URL is **redirected** to the clean path.
- Production frontend `admissionhands.com` → `/admin/*` redirects out to the admin subdomain.
- `localhost`, `*.workers.dev`, `uat.admissionhands.com` → admin stays inline at `/admin/*` (no subdomain hop).

`src/app/layout.tsx` reads the `host` header: on an admin host it skips `SiteShell` (no marketing header/footer/alerts).
`SiteShell` also re-checks client-side. Changing domain logic means touching **both** files.

## Data model (Postgres — Supabase is gone)

Colleges are split by level and by role, and the admin UI maps 1:1 onto them:

- UG: `ug_all_colleges`, `ug_recommended_colleges`, `deemed_colleges`, `recommended_colleges` (legacy, has `domain` ug|pg)
- PG: `pg_colleges_content`, `pg_recommended_colleges`, `pg_deemed_colleges`, `pg_branches`
- Content: `mbbs_states`, `videos`, `live_alerts`, `legal_documents` (markdown), `media_assets`, `contact_info`
- Configurable copy: `site_settings`, `content_blocks`, `content_collections` (see "Configurable content")
- Site structure: `nav_items` (every menu), `page_seo` (per-route metadata), `page_sections` (which
  blocks of a page render, and in what order)
- Leads: `leads` — **one table**, UG and PG separated by the `level` enum (`ug` | `pg`). The Supabase
  `leads` / `pg_leads` split was collapsed during the migration; `pg_leads` does not exist in Postgres.
- Counselling data: `institutes`, `courses`, `closing_ranks`, `fees`, + the `seat_options` materialized view

Conventions: rows carry `is_active` and `display_order`; **list queries order by `display_order` then `college_name`**.
Writes go through `/api/admin/*`, which enforces the session and a column allow-list — there is no RLS any more,
the API route *is* the boundary.

Volumes as of 2026-09-18: `ug_all_colleges` 765, `pg_colleges_content` 252, `deemed_colleges` 59, `mbbs_states` 33,
`pg_branches` 26, `content_blocks` 31, `site_settings` 25, `media_assets` 23, `ug_recommended_colleges` 12,
`legal_documents` 8, `content_collections` 7, `videos` 4, `live_alerts` 2, `leads` 2.
Counselling data as of 2026-09-22: `closing_ranks` 274,483 (PG 230,484 + UG 43,999),
`seat_options` 76,372 (PG 58,279 + UG 18,093), `institutes` 3,895 (PG 2,168 + UG 1,727).
**Empty by design:** `pg_recommended_colleges`, `pg_deemed_colleges` (created by migration `0005`, curated by hand).

## Admin CMS

- **Auth:** scrypt + server-side sessions (`src/lib/auth.ts`, `admin_users` / `admin_sessions`).
  `useAuth` asks `/api/admin/auth` who is signed in; `ProtectedRoute` guards the pages and
  `middleware.ts` bounces a signed-out visitor from `/admin/*` to the login page.
- **Every admin write goes through `/api/admin/[resource]`**, and `src/lib/adminResources.ts` is the
  security boundary: table and column names come from `RESOURCE_SPECS`, never from the request. Adding a
  new editable table means adding a spec, not a route. `pickColumns` drops anything not listed and
  JSON-stringifies objects so they land in `jsonb` columns.
- **Screens call `src/lib/adminApi.ts`** (`listRows` / `createRow` / `updateRow` / `deleteRow` /
  `uploadImage`) rather than fetching by hand.

| Screen | What it owns |
|---|---|
| `dashboard` | Unread leads, a 14-day trend, what is live, counselling-data health |
| `leads` | The full enquiry record + the team's own status, owner, notes, follow-up, CSV export |
| `content` | Three tabs: **Text & numbers** (`site_settings`), **Sections & lists** (`content_blocks`), **Page layout** (`page_sections`) |
| `navigation` | Header menu with dropdowns, and both footer link lists |
| `seo` | Per-route title, description, keywords, share image, and a no-index switch, with a Google preview |
| `whatsapp` | The verification number, the gateway, its keys, and pairing the phone — see below |
| `live-alerts`, `videos`, `media`, `contacts` | Site furniture |
| `colleges`, `pg-colleges`, `mbbs-states`, `pg-branches` | The data tables |

- `admin/colleges` and `admin/pg-colleges` are tabbed shells mounting `GenericCollegeManager` with a
  **`resource`** prop (`colleges-ug`, `colleges-recommended`, `colleges-deemed`, `colleges-pg-recommended`,
  `colleges-pg-deemed`); `PGCollegeManager` handles `colleges-pg`.
- **Images:** `POST /api/admin/upload` writes to `public/assets/images/uploads/`. The browser filename is
  never used — the name is generated and the extension comes from the file's magic bytes.
  `BackendImage` resolves a `media_key` through `/api/content/media/[key]` with a local `/assets/...` fallback.
- **Leads are half read-only on purpose.** `RESOURCE_SPECS.leads` allows only `lead_status`, `is_read`,
  `admin_notes`, `assigned_to`, `follow_up_on`, `last_contacted_at`. Everything the student submitted is
  rejected by the allow-list, so the record of what was actually sent cannot be rewritten.
- `GET /api/admin/leads/export` returns every lead as CSV. A cell starting with `=`, `+`, `-` or `@` is
  quote-prefixed — otherwise a submitted phone number becomes a formula Excel will run.
  The static route wins over `[resource]/[id]`, so it does not collide with a lead whose id is "export".

## Configurable content (what the admin can change without a deploy)

Two primitives cover the prose, so a new editable section is rows rather than a new admin screen:

- **`site_settings`** — one value per dotted key (`home.hero.headline`), with `value_type`
  (text | longtext | number | boolean | image | url) driving the input and `group_name` grouping the form.
  Only `value` is editable through the API; the key and type are seeded by script.
- **`content_blocks`** — repeatable items in a named `collection`, plus a `data` jsonb for anything the
  named columns do not cover.
- **`content_collections`** — registers the collections and declares which fields each one edits.
  A field named `data.outcome` renders an extra text input stored in the block's `data`.

Read side: `getSettings()` / `setting()` / `getBlocks()` in `src/lib/content.ts`.
Edit side: `/admin/content` (`SettingsEditor` + `BlocksEditor`).

**Every wired component keeps its original copy as a fallback**, so an empty collection renders the site
exactly as it shipped. Wired so far: Header and Footer (menus, tagline, social links, CTA label), Hero,
HowItWorks, ServicesList, WhyAdmissionHands, Testimonials, the homepage CtaBand,
PGFAQ (`faq_pg` — the block's `subtitle` is the tab it sits under) and NRIFAQ (`faq_nri`).
Each of those also takes its section heading, eyebrow and subheading from `site_settings`.

**How a page section gets its content.** Three shapes, in order of how much of the page they cover:

1. **One data file, many components** — the MBBS page. All ten sections read `mbbsData`, so
   `getMbbsContent()` in `src/lib/pageContent.ts` rebuilds that exact shape with the CMS layered over
   it, and each component takes `data` with the static import as its default. One resolver, one prop.
2. **An array per component** — the MD/MS and NRI pages. `src/lib/pgContent.ts` and `nriContent.ts`
   turn a collection into the shape that section already expects, and the component merges it
   **positionally over its shipped array**: the CMS supplies words, the shipped item supplies
   gradients, icons and colour classes. So a copy change is content and a design change is code.
3. **Loose settings** — headings, eyebrows, button labels. `{ ...DEFAULTS, ...pick(copy) }`.

**Nested lists** (a step's bullets, a quota's facts) are stored as one item per line in the block's
`data`, which the admin renders as a textarea. `lines()` and `pairs()` in `pgContent.ts` parse them.
A nested list editor was not worth building for four bullet points.

**Still hardcoded:** `/services` and `/neet-ug-process` (each is a single client component), and on
the NRI page the eligibility tabs and the fee tables, whose markup is interleaved rather than a clean
array.

## Site structure the admin owns

Three more tables cover the parts of the site that are structure rather than prose. Each was hardcoded in
a component before, so changing a menu label or a page title meant a deploy.

- **`nav_items`** — one row per link, `menu` says which menu (`header`, `footer_explore`, `footer_quick`)
  and `parent_id` gives the header its dropdowns. `getNav(menu)` returns the tree already nested; an
  inactive parent takes its children with it.
- **`page_seo`** — per-route title, description, keywords, share image and a no-index flag. Pages call
  `resolveMetadata(route, defaults)` from `generateMetadata`, which **merges the admin's values over the
  page's own** — a blank admin field falls through to the shipped copy rather than blanking the tag.
- **`page_sections`** — whether a block of a page renders and in what order. `getSections(page)` returns
  `{ shows, sort }`. **A section with no row is shown**, so adding a component in code does not need a row
  created first. The homepage is wired through it; other pages are not yet.

The root `layout.tsx` fetches the menus and settings and passes them into `SiteShell` as plain data,
because the shell is a client tree. Adding something the shell needs means threading it through there.

**`SEO.tsx` used to do nothing.** It wrapped everything in `next/head`, which the App Router ignores — so
the homepage and NRI page were emitting no meta tags and no JSON-LD at all. It now renders only the
JSON-LD script (the supported App Router pattern) and titles come from `generateMetadata`.

Components that take CMS copy use `pick()` from `src/lib/copy.ts`:
`{ ...DEFAULTS, ...pick(copy) }`. An unset setting arrives as an empty string, which would otherwise
blank the heading — `pick` drops empty values so the shipped text survives.

Icons in blocks are Lucide **names**, resolved through the allow-list in `src/components/ui/BlockIcon.tsx`.
A Lucide component cannot be passed from a server component to a client one, and resolving arbitrary names
at runtime would pull the whole icon set into the bundle.

**jsonb gotcha:** `db.execute` with a raw `SELECT` returns `jsonb` as a *string*, not a parsed object.
`getBlocks` normalises it; anything else reading jsonb must do the same.

## Conventions

- Path alias `@/*` → `src/*`. Always use it; no deep relative chains.
- Server components by default; add `"use client"` only where hooks/state/motion are needed. Heavy client
  components are pulled in with `next/dynamic` (see `LiveAlerts`, admin managers).
- Tailwind theme adds brand palettes `medical.*` and `teal.*`, fonts `font-heading` (Figtree, falling back
  to Plus Jakarta) / `font-body` (Inter), and the `xs: 480px` breakpoint. Colors come from CSS vars — keep
  dark mode working.

## PostgreSQL (Phase 1 — live as of 2026-09-17)

The new data layer, replacing Supabase. Postgres 18.6 on the VPS `38.49.209.165`,
**bound to localhost only** — it is not and should not be exposed to the internet.

```bash
# Reach it from a dev machine through an SSH tunnel:
ssh -i D:/Gulshan/Keys/ServoRica_TradeOS -N -L 55432:localhost:5432 root@38.49.209.165
# DATABASE_URL in .env.local already points at 127.0.0.1:55432
npx drizzle-kit generate   # schema change -> SQL migration
npx drizzle-kit migrate    # apply
```

- Schema: `src/db/schema.ts` (Drizzle). Client: `src/db/client.ts`. Migrations: `src/db/migrations/`.
- Database `admissionhands`, role `admissionhands`. The existing `pg-backup.sh` on the box picks it up
  automatically — no backup wiring needed.
- **Design:** UG and PG share one set of tables, separated by a `level` enum (`'ug' | 'pg'`), because every
  query the product runs is identical for both apart from that filter. Masters (`states`, `institutes`,
  `courses`, `counsellings`, `quotas`, `categories`) + two fact tables (`closing_ranks`, `fees`).
- Indexes are built around the three real query paths: predictor
  (`level, year, category_id, closing_rank`), explorer facets, and a college's own trend.

**Loaded:** `closing_ranks` 230,484 (PG, 2024+2025) · `fees` 35,564 · `institutes` 2,168 · 45 MB.
Predictor query benchmarks at ~324 ms *through the SSH tunnel*; single-digit ms on the box itself.

```bash
# Re-import after a source refresh (idempotent — masters upsert, facts for that level are replaced):
node scripts/import_neetpg.mjs --db "D:/Zyn/data/app/neetpg_app.db" --level pg
node scripts/import_neetpg.mjs --db "..." --level pg --dry-run   # counts only, writes nothing
```

UG facts are not loaded yet — the source extract only covers PG (see `docs/UPGRADE_PLAN.md` §1).

### UG (NEET-UG) — imported 2026-09-22

Source: the authenticated scrape at `D:/Gulshan/PG/Website/extracted-data/ug-live`.

```bash
node scripts/inspect_ug_source.mjs    # survey the list pages, writes nothing
node scripts/inspect_ug_details.mjs   # survey the 1,727 college pages, writes nothing
node scripts/import_ug_scrape.mjs --dry-run
node scripts/import_ug_scrape.mjs
node scripts/seed_ug_predictor_links.mjs   # menu entry + page_seo row
```

Loaded: 1,727 institutes · 43,999 closing ranks (2025 and 2026) · 18,093 seat options ·
3,457 fee rows · 8 courses (MBBS 33,855 rank rows, BDS 9,326, then BAMS/BHMS/B.Sc. Nursing/BVSc/BUMS/BSMS) ·
41 counsellings · 34 states.

**Parse the saved HTML, never the CSV or JSON the scraper also wrote.** Those were keyed from the
header row, but the body rows carry two extra cells of HTML-comment debris, so every column after the
first is shifted by one in them — `institute` holds the quota, `course` holds the institute, `fees`
holds the category. `scripts/lib/parseUgPages.mjs` strips comments first, which makes the cells line
up with the header exactly; it throws if any row does not match its own header rather than importing
shifted data.

**Hidden columns are commented out, not removed.** On the rank tables `State` and `Score 2026(R0)`
are commented out in the header *and* every body row, so the rank tables carry no state at all. The
state comes from the college's own detail page.

**Where each fact comes from:**

| Fact | Source | Why |
|---|---|---|
| Colleges, state, establishment year | `details/*.html` `<h1>` + `<h4>` | The only place these appear |
| 2025 closing ranks (42,546 rows) | `details/*.html` "Cutoff UG 2025" table | 18× more rows than the list pages |
| 2026 R1/R2 closing ranks (1,456) | `pages/closing-rank1__*` | The only place 2026 appears |
| Fee schedules | `details/*.html` "College Fee" tables | — |

The list pages' 2025 columns are deliberately ignored — the detail pages cover the same year far more
fully, and taking both would double-count.

**Rank basis is recorded honestly.** NEET-UG is one national exam, but state authorities publish their
own merit ranks, so `rank_basis` is `'State/Counselling rank'` for state counselling and
`'All India Rank'` otherwise, and `ai_rank` is only filled for the latter. A state rank of 5,000 and
an all-India rank of 5,000 are not the same seat.

**Fees have no quota.** The source shows several unlabelled "College Fee" blocks per college and never
says which quota each belongs to, so `fees.quota_id` is null for UG. Read them as a range per college;
do not attribute one to a seat.

**Two traps the import guards against, both found the hard way:**

1. `categories` is unique on `(code, scheme)`, and Postgres treats NULLs in a unique index as
   distinct — inserting with a null scheme adds a second `GEN` beside the existing one, and does it
   again on every re-run. The import reuses any row that already has the code.
2. `institutes.slug` is `varchar(180)` and nine college names slugify past it. Slugs are capped where
   they are built (collisions take a `-<sourceId>` suffix); *codes* are validated instead, because
   truncating a code could merge two distinct categories.

The import runs in one transaction, only ever deletes `level = 'ug'` rows, and fails at the end if the
PG counts moved.

### `seat_options` — the view the predictor reads

`closing_ranks` has one row per round, so answering "can I get this seat?" from it means aggregating on every
request. `seat_options` (migration `0002`) collapses it to one row per seat: 230k rank rows → **58,279 seats**.
Rebuild it after every import:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY seat_options;
```

**The subtlety that migration 0002 exists for:** the last round's closing rank is *not* the widest the cut
reached. In mop-up and stray rounds, seats freed by upgrades go to much better ranks, so the final round can
close far tighter than round 2 — e.g. Bangalore Medical College, MD Anatomy, general, 2025 went
`R1 39,431 → R2 74,529 → R3 8,550`. Reading R3 as "where the cut ended" understated that seat by 66,000 ranks.
It affects 7.4% of seats and always hides options from the candidate, so the band boundary is
`MAX(closing_rank)` within the year, never the last round's value.

### Predictor

- Bands live in `src/lib/predictor.ts` — **one place**, not split between SQL and TS.
  `safe` (inside round 1's cut) › `likely` (inside the year's widest cut) › `possible` (inside the widest ever)
  › `stretch` (no precedent). Historical, not a forecast — the UI says so, and so should any copy about it.
- API `GET /api/predict?rank=&level=&category=&states=&ownership=&maxFee=`. Results sort by band, then by
  **tightest closing rank first** — of the seats you are safe for, the best ones lead. Sorting by comfort
  would surface the weakest seat first, which is the opposite of what a counsellor does.
- UI: **one tool at `/neet-college-predictor`** (see "One tool" below), which takes every stream's
  facets and a `StreamSpec[]`. The two old per-level routes are 308 redirects.
- **The general category is `GEN` in PG data and `UR` in UG data.** `PredictorClient` picks its default
  from the categories the level actually publishes; hardcoding `GEN` made the UG predictor open on a
  category it has almost no rows for.
- Drizzle expands a JS array in a `sql` template into `$1, $2, …`, so `= ANY(${arr})` is invalid.
  Use `IN (${sql.join(arr.map((v) => sql`${v}`), sql`, `)})`.
- `PageHero` is a client component: pass `eyebrowIcon` as a **name** (`"target"`), never a Lucide component —
  functions cannot cross the server/client boundary.

### One tool — `/neet-college-predictor` (2026-09-23)

MBBS, BDS and MD/MS each had a predictor and "after round 1" had two more pages: **five URLs for one
question about one rank**, splitting the search traffic for the phrase candidates actually type, and
making somebody retype their rank to ask the obvious follow-up.

Now the course is a filter and the round movement is a tab.

- `src/lib/predictorFacets.ts` defines `STREAMS` (`mbbs` | `bds` | `pg`). A stream is a `level` plus,
  for the undergraduate ones, a single course. Facets are loaded and cached **per stream**, because
  the categories genuinely differ — UG publishes `UR`, PG publishes `GEN` — and offering a category
  the chosen course has no seats for is how the UG predictor used to open on an empty result.
- **Branch only exists for PG** (`hasBranches`). State and college type always.
- **BDS was in the data all along** — 3,244 seats, 326 colleges — and no page had ever offered it.
- `/api/predict?stream=` is what the tool sends; `level=` is still accepted so old links work.
  A single-course stream adds `AND c.name ILIKE ${course}`.
- `/api/rounds` is fetched **alongside** `/api/predict` on the same search, so the "what changed after
  round 1" tab is instant rather than a second wait. Gated the same way: totals free, rows behind
  the sign-in.
- All five old routes 308 to it with `?course=` set (`next.config.mjs`), and
  `scripts/merge_predictor_nav.mjs` repointed `nav_items`, the footer and `page_seo`. The tool is a
  **top-level header item** now; it used to be a third-level child of two different dropdowns.

### The lead gate on the seat data (2026-09-22)

The closing ranks are the product, and `/api/predict` was handing out 300 fully detailed seats per
call to anyone. The gate splits what is free from what is not:

- **Free, always, and complete:** the band counts (`223 safe, 60 likely, …`) plus the three tightest
  safe seats. Enough to prove the answer exists and is real.
- **Behind a phone number:** the rest of the list. `src/lib/leadGate.ts` mints an HMAC-signed,
  `HttpOnly` cookie; `POST /api/unlock` records the lead and issues it. The cut happens **server-side** —
  a locked payload never leaves the process, so there is nothing to read out of the network tab.
- The same rule applies to the after-round-1 data, now served by `/api/rounds` into the tool's second
  tab: the two totals are free and the rows are not, and the slice happens server-side.

**This is a gate, not verification.** Real OTP costs money per message (SMS and WhatsApp
authentication templates both bill in India) and the brief was zero-cost, so nothing is sent. The
number is validated for shape (`[6-9]\d{9}`) and recorded. The free half of verification is the
WhatsApp button beside the form: the visitor messages *us* from their own number, which is inbound and
therefore free. A paid provider drops into `POST /api/unlock` and nowhere else.

`UNLOCK_SECRET` signs the cookie. Unset, a per-process key is generated and unlocks stop surviving a
restart — degraded, but a hardcoded fallback secret would let anyone mint their own cookie forever.

### WhatsApp verification, run backwards (2026-09-22)

The gate above asks for a number. This proves it, for nothing, without ever sending a message.

The visitor taps a `wa.me` link that opens **their** WhatsApp with a code already written; they send
it; a self-hosted gateway on the VPS posts that inbound message to `/api/whatsapp/inbound`; the code
matches and the number it came from is verified.

**Why not just send an OTP.** WhatsApp's ban models weight reply-ratio, contact-graph distance and
timing regularity, and outbound OTP is the worst possible score on all three — nobody replies to an
OTP, every recipient is a stranger, and a form submit fires it. On an unofficial gateway that gets a
number restricted in weeks. Receiving inverts all three. It also verifies *more*: an inbound message
proves the number has a live WhatsApp account and that the person acted, which matters because this
business runs on WhatsApp. And it costs nothing on any tier, because nothing is sent.

- Logic: `src/lib/waVerify.ts`. Routes: `/api/verify/start`, `/api/verify/status`,
  `/api/whatsapp/inbound`. State: `verification_attempts` (migration `0008`) — in Postgres, not
  memory, because the three steps are separate requests that may not share a Workers isolate.
- **Configured from `/admin/whatsapp`, not from the environment.** The number, the gateway address,
  its API key and the webhook secret are rows in `integrations` (migration `0009`), so a
  non-technical admin changes them behind the normal login and they take effect within 30 seconds
  with no redeploy. `src/lib/integrations.ts` is the reader; an env var of the same name still wins
  where one is set, and the screen shows those as fixed.
- **`integrations` is server-only and must stay that way.** `site_settings` looked like the obvious
  home, but the root layout hands every setting to `SiteShell` as props — an API key there would be
  published on every page load. Never add `integrations` to the allow-list in
  `/api/content/[resource]`, and never import `integrations.ts` from a client component.
- The admin screen **cannot start the container**, and deliberately so: the site runs on Workers with
  no shell on the VPS, and a button that ran commands there would be a remote shell behind a login
  form. It composes the `docker run` line with the secret filled in instead. Everything after that —
  pairing by QR or phone code, status, disconnect — is in the screen via WAHA's REST API.
- **The HMAC check on the webhook is the entire security model.** The endpoint is public; without it
  anyone could POST a code and a number of their choosing. It refuses everything when
  `WAHA_WEBHOOK_SECRET` is unset, so a misconfiguration fails closed.
- The number recorded is the one that **sent** the message, never the one typed into the form.
- Gateway: WAHA (`devlikeapro/waha`, Apache-2.0, fully free since 2026.6.1), GOWS engine — that is
  `whatsmeow` over a WebSocket, so no headless Chromium on the database box. Setup, the exact Docker
  command and the verification results are in `docs/whatsapp-verify.md`.
- Unset `WHATSAPP_VERIFY_NUMBER` and the inbound path disappears cleanly: `/api/verify/start`
  answers `503`. Since 2026-09-23 this is the *fallback* — see "Sending the code" below.

### Sending the code (2026-09-23) — `src/lib/otp.ts`

The section above argues, correctly, that outbound OTP is the worst thing you can do to a WhatsApp
number: the ban models weight reply-ratio, contact-graph distance and timing regularity, and an OTP
scores worst on all three. Sending anyway was a product decision — the receive-only flow was losing
people — so the three signals are paid down deliberately rather than ignored:

- **Volume.** 3 codes per number per hour, 8 per day, and a ceiling on the gateway's own daily total.
  Counted **in `otp_codes`, not in memory** — an in-memory cap resets on every deploy and is
  per-isolate, which for a guard whose job is keeping a phone number alive is no guard at all.
- **Timing.** A randomised delay before the send, so it does not land a machine-exact interval after
  the form submit.
- **Reply-ratio.** The message invites a reply, into the inbox the counsellors already use.

**The receive-only path from migration 0008 is still there and is the fallback.** When a send fails
or the gateway is unpaired, `/api/auth/otp` returns `channel: "inbound"` with a `wa.me` link and the
screen says why. It is the thing that works when nothing of ours is working.

**Only the HMAC of a code is stored.** Six digits is too small a space for hashing to be brute-force
protection; the point is that reading the table — or a backup, or a log line — does not hand over
live credentials. Keyed by `OTP_SECRET`, falling back to `UNLOCK_SECRET`, then a per-process key.

Digits come from `crypto.getRandomValues` with **rejection sampling**, not `% 10`, which would bias
toward the low digits.

### Accounts (2026-09-22)

Visitors have real accounts now, separate from `admin_users` in every way that matters.

**Phone-first, with a password after the first time** (rebuilt 2026-09-23; migration `0012`).

The original design was passwordless and proved the number over WhatsApp on *every* visit. That is
fine on a phone and hostile on a laptop: it asked somebody to put the laptop down, find our number
and send a message to read a page already open. So the number is still the identity and is still
proved once — but a password gets them back in from any device.

```
first visit   phone -> code we send -> verified -> offered a password
every visit   phone -> password
forgot it     phone -> code -> set a new one
```

**The password is optional.** Skip it and the code path still works, so nobody is locked out by
having forgotten something. `users.password_hash` reuses the admin's scrypt helpers from
`src/lib/auth.ts` — one place that knows how a password is stored.

The screen asks for the **number alone first** and `/api/auth/lookup` decides the next step, because
"are you new here?" is a question only we can answer. That does reveal whether a number is
registered; the route is rate-limited hard and returns nothing but a first name.

Routes: `/api/auth/lookup` · `/api/auth/otp` · `/api/auth/verify` · `/api/auth/login` ·
`/api/auth/password`. UI: `src/components/auth/AuthFlow.tsx` (used by both `AuthDialog` and
`/login` via `LoginFlow`). `UnlockCard` is gone.

- `src/lib/userAuth.ts`, tables `users` / `user_sessions` / `saved_colleges` (migration `0010`).
- Sessions are **rows, not signed tokens**, like the admin's: signing out has to revoke, not merely
  stop presenting. Verified by replaying a signed-out cookie — 307, and 3 of 300 seats.
- Both gate entry points (`/api/unlock`, `/api/verify/status`) now create the account and the
  session alongside the unlock cookie. The WhatsApp path marks it `verified`; the typed path does not.
- **`hasAccess(request)` / `hasAccessServer()` in `userAuth.ts` are the single check** for "is this
  visitor through the gate" — an account or an unlock cookie, treated identically. They live there
  rather than in `leadGate.ts` so the dependency stays one-way and there is no import cycle.
- `/login` and `/account` are `noindex`. `/login?next=` only ever redirects to a path matching
  `^/[^/]` — `//evil.com` is an open redirect otherwise.
- The account holds the rank and category, so the tools open where the visitor left off. That is
  what the account is *for*; a profile page for its own sake would not earn its keep.

### The rule for every data surface: a real slice free, the depth gated

Settled 2026-09-22. Each page that sits on the counselling data gives away something complete and
genuinely useful, and charges a phone number for the rest. Not a teaser that proves nothing, and not
a wall Google cannot see past.

| Surface | Free | Gated |
|---|---|---|
| Seat predictor | all four band counts + the 3 tightest safe seats | the other ~297 |
| After Round 1 | both totals | rows beyond the first 5 of each list |
| Per-college page | headline stats, fees, net over three years, 8 cutoff rows | the remaining rows |
| College directory | everything — rank bar, band chips, the whole list | nothing |

The directory is deliberately open: a band is four buckets and cannot be turned back into the cutoff
table, and it is the hook that sends people to the predictor where the real gate is.

**The per-college pages had to stay static.** Around 3,500 of them carry the site's search traffic,
pre-rendered and cached for a day. Reading the unlock cookie in the page would make every one
per-request and throw that away — so the page renders the 8-row preview into its HTML (which is what
Google indexes) and `src/components/colleges/CollegeCutoffs.tsx` fetches the rest from
`/api/college-cutoffs`, which answers 401 unless unlocked. Static page, indexed content, gated depth.

**`/md-ms-india/fees` is gone**, 308 to the college list. It was a whole page for one number, and
that number — three years of stipend against the fee — is already on every college's own page, where
someone is standing when they actually ask what a seat costs. `listNetCost` in `cutoffQueries.ts` is
now unused and can go with it.

### The rank lens on the college directories

An A-to-Z list of colleges is something every competitor has. `src/components/colleges/RankLens.tsx`
puts a rank box over it: every card gets a band, the list sorts safe-first, and the band chips filter it.

`GET /api/college-bands` **returns the band and nothing else** — no closing ranks. Four buckets per
college cannot be turned back into the cutoff table, which is why it can sit outside the gate while
still being the hook that sends people to the predictor. The bands are fetched client-side so the
directory page stays cached, and the rank is written to the URL with `replaceState` rather than a
router push, because the page does not read the param.

### PG pages built on this data

| Route | What it is |
|---|---|
| `/neet-college-predictor` | **The tool.** MBBS / BDS / MD-MS by rank, plus the after-round-1 tab |
| `/mbbs-india/colleges/[slug]` | Per-college page for all 1,727; top 200 pre-rendered, rest ISR at 24h |
| `/md-ms-india/colleges` | All 2,168, filters in the URL |
| `/md-ms-india/colleges/[slug]` | **Per-college SEO page** — cutoffs, movement, fees, JSON-LD. Top 120 pre-rendered, rest ISR at 24h |

Queries live in `src/lib/collegeQueries.ts` (colleges, seat view) and `src/lib/cutoffQueries.ts` (row-level
cutoffs, net cost). **All filters go through the URL**, never component state, so a filtered view is
shareable, indexable, and the back button works.

### After Round 1 — now a tab, not a page

Served by `/api/rounds` into the tool's second tab. Query layer: `src/lib/roundQueries.ts`.
It was two standalone pages with their own rank boxes, which asked people to retype the rank they
had just entered to ask the question that follows immediately from the answer.

A rank predictor answers a round-1 question and stops. The decision that costs people a year comes
next: you hold a seat and have to choose whether to float for something better or freeze what you
have. These pages answer it the only honest way the data allows — by showing what already happened.

Given a rank and a category, two lists:

- **Opened** — seats round 1 closed *above* the rank that a later round reached. Upgrades free
  seats, and a freed seat goes to whoever is next, which is why a later round can reach much further
  down. This is the case for floating, counted rather than promised.
- **Tightened** — seats within reach in round 1 whose later rounds closed at *better* ranks only.
  Counted across all ranks and categories (every later round below round 1's own close):
  **2,595 PG** seats. The 2,795 quoted here previously did not reproduce — re-derive before
  publishing this figure anywhere, because `/neet-pg-process` prints it. Give one of those up and you could not take it back. No
  competitor shows this, because it needs clean round-by-round data.

**The aggregation trap:** `widest = MAX(closing_rank)` across all rounds can never be less than
round 1's own value, because the maximum includes it — so "tightened" matched nothing until the
later-round maximum was filtered to `round_label <> 'R1'`. Any comparison of round 1 against
"later" has to exclude round 1 from the later side.

Rank and category live in the URL, so a result is shareable and the page renders server-side with
real content. The aggregate groups 274k rows and takes seconds through the tunnel, so
`getRoundMoves` is wrapped in `unstable_cache` for an hour — it only changes when an import runs.

### Seeding the CMS

All idempotent, and none of them overwrite a value someone edited in the admin:

```bash
node scripts/seed_content.mjs            # site_settings + the first collections
node scripts/seed_settings_extra.mjs     # headings, footer, social, header CTA
node scripts/seed_site_control.mjs       # nav_items, page_seo, page_sections
node scripts/seed_page_sections.mjs       # section rows for the MBBS, MD/MS and NRI pages
node scripts/seed_mbbs_content.mjs       # the whole MBBS page, read out of src/data/mbbs-india.ts
node scripts/seed_pg_content.mjs         # MD/MS section copy + the closing banner
node scripts/seed_nri_content.mjs        # NRI timeline and benefits
node scripts/lift_content_to_cms.mjs     # one-off: moved hardcoded FAQ/testimonial copy into blocks
node scripts/align_services_collection.mjs  # one-off: matched the services collection to the live cards
```

**Rule for lifting content:** the site must render identically before and after. Making existing copy
editable is the job; changing it is not. The `services` collection had six speculative rows with no links
in them — wiring those in as-is would have silently removed the UG and PG links from the homepage, which
is why `align_services_collection.mjs` exists.

### Supabase migration — complete (2026-09-18)

`src/` contains **zero Supabase calls**. `scripts/migrate_supabase.mjs` copied 13 tables / 1,188 rows with
every count verified, and `scripts/pull_supabase_storage.mjs` pulled all 43 storage images into
`public/assets/images/uploads/` and repointed every URL column.

`src/lib/content.ts` is the read layer. Client components cannot query Postgres, so they go through
`/api/content/[resource]` (and `/api/content/media/[key]`), which exposes an allow-list, not arbitrary queries.

The last pieces moved on 2026-09-18: `POST /api/leads` (it was still **writing new leads into Supabase while
the admin read Postgres** — new enquiries were invisible), `whatsappService`, and the admin leads / media /
mbbs-states / pg-branches screens plus both college managers.

`src/integrations/supabase/` still exists but **nothing imports it**; the `@supabase/supabase-js` dependency is
only kept alive by a few one-off scripts in `scripts/`. The Supabase project can be deleted.

**The trap that bit here:** `mediaService` was rewritten to read from Postgres, which pulled the `postgres`
driver into `BackendImage` — a client component — and the build failed with `Can't resolve 'net'`. Server
reads belong in `lib/content.ts`; anything a browser imports must go through an API route.

### Working on this repo — two traps that cost time

1. **Never run `next build` while `next dev` is running.** They share `.next`, and the dev server then throws
   `Cannot find module './NNNN.js'` or `Cannot read properties of undefined (reading 'call')` on unrelated
   pages. Fix: stop dev, `rm -rf .next`, restart. Both were chased as code bugs before this was understood.
2. **Bash heredocs mangle TypeScript.** Backticks and `${}` in a `sql` template get eaten. Write `.ts` files
   with the file tools, not `cat <<EOF`.

## Design system (rebuilt 2026-09-17)

Tokens live in `src/styles/base.css` under `:root` / `.dark`. **Never hardcode a colour in a component —
use the token classes**, so dark mode and future re-skins keep working.

| Token | Role |
|---|---|
| `primary` (#0891B2 = cyan-600) | All actions, links, active nav. `primary-soft` for tinted backgrounds, `primary-strong` for text on light |
| `secondary` (#22D3EE = cyan-400) | Gradient end-stop, highlights |
| `accent` (#16A34A = green-600) | Success, WhatsApp, confirmation. `accent-soft` for its tint |
| `signal-safe` / `signal-borderline` / `signal-stretch` | **Reserved for admission chance only.** Never decorative — colour is data here |
| `surface-1/2/3` | Three elevation levels, used instead of stacking shadows |

Utility classes in `src/styles/utilities.css`: `.tnum` (tabular figures — put on every rank/fee/seat number),
`.text-gradient-brand` and `.bg-gradient-brand` (the teal→cyan brand gradient), `.ambient-blob` (the drifting
background light), `.panel-glass`, `.card-lift`, `.bg-grid`, `.marquee-track`.
Shadows: `shadow-glow` / `shadow-glow-lg` (brand-tinted, for primary actions) and `shadow-lift` (neutral cards).

**Colour discipline:** the whole app was migrated off blue/indigo/violet/purple/pink onto
cyan (primary) + teal (depth) + emerald (accent). If you reach for `blue-*` or `violet-*`, you are off-brand —
the design brief explicitly rules out AI purple/pink gradients.

**Motion:** `src/components/ui/Reveal.tsx` wraps marketing sections for a single scroll reveal (once, never
replays). The hero runs one staggered entrance on load. Ambient blobs drift continuously. Everything is
switched off under `prefers-reduced-motion`, which `utilities.css` enforces globally — do not add an
animation that escapes that block.
- Contact details are centralised in `src/lib/constants.ts` (`CONTACT_INFO`) and overridden at runtime by the
  `contact_info` table via `useContactInfo`.
- `POST /api/leads` is `force-dynamic`, rate-limits 5 req/min per IP in memory, and fires a WhatsApp notification.
  The in-memory limiter is per-isolate — it is not a real distributed limit.

## Checking the work (2026-09-23)

Three suites, all runnable against production:

| Script | What it proves |
|---|---|
| `scripts/smoke.mjs` | 57 black-box checks — routes answer, the gate holds, removed pages redirect, no claim we cannot back, the sitemap is real |
| `scripts/audit_site.mjs` | Renders every route in Chromium at 390px and 1440px: headings, labels, tap targets, text sizes, metadata, broken images and links, console errors |
| `scripts/verify_auth_flow.mjs` | Sends a **real** code to our own gateway number, reads it back out of the gateway, redeems it, sets a password, signs in again on the password alone — then deletes its own rows |

**Two traps the audit harness fell into first, both worth remembering:**

1. `networkidle` never settles on a page with a marquee and an analytics beacon, so it timed itself
   out and reported 22 working pages as broken. Wait for `load` and settle for a fixed beat instead.
2. Counting every inline link in a sentence as an undersized tap target buried the standalone
   controls that can actually be fixed. WCAG 2.5.8 exempts inline links for the same reason.

A number a tool produces is worth nothing until you have checked the tool is measuring the thing you
think it is.

## Cleanup baseline (2026-09-22)

The repo is Supabase-free on disk as well as in code. Deleted: `.cleanup-quarantine/` (114 MB of
2026-09-17 leftovers), the whole `supabase/` tree (migrations, edge functions, legacy dumps),
`src/integrations/supabase/`, `DATABASE_SETUP.md`, `scripts/data/pg_colleges.csv`, and the four
Supabase-Storage scripts. The `@supabase/supabase-js` dependency is gone from `package.json`, and
`.wrangler/` and `playwright-report/` were untracked (they were gitignored but still committed).

- Unused shadcn primitives were deleted. To bring one back: `npx shadcn@latest add <name>` (config in `components.json`).
- `src/components/services/*` is gone — the services page renders entirely from `ServicesClient.tsx`.
- Before adding a component, check it is actually reachable from a `page.tsx`; this repo accumulated
  parallel unused versions of the header, services and college-listing UI.
- A scan for files nothing imports under `src/` returns **zero** — keep it that way.

## Audit findings, 2026-09-22

Measured against the production build, not guessed at.

**Information architecture, settled in the second pass:**

- **The tool is called "Seat Predictor", on both sides of the site.** It never predicted a rank — it
  takes the rank you already have and finds the seats it reaches, which is what the H1 always said.
  The menu said "MBBS Rank Predictor" on one side and "Rank Predictor" on the other. `scripts/fix_navigation.mjs`
  is the repeatable fix; the `<title>` still says "College Predictor" deliberately, because that is the
  phrase people search for.
- **The row-level cutoff explorers are gone**, 308-redirected to the predictors. They asked a visitor to
  scan 230,000 rows for something the predictor answers from their rank in one step, and the per-college
  pages carry the same numbers with context. `cutoffQueries.ts` stays for `listCutoffs`/`getCutoffFacets`.
- **`/nri-quota/colleges` and `/nri-quota/documents` had no inbound link from anywhere.** Now children of
  the NRI menu.
- **Every college name in `/mbbs-india/colleges` rendered as plain text.** `CollegeItem` declared `slug`
  and the page passed it, but the `allColleges` memo never copied it — so `college.slug` was always
  undefined and the `{slug ? <Link> : name}` branch always took the second path. All ~840 per-college
  pages were unreachable from the listing that exists to reach them.
- **The UG predictor's hero was a 400.** It hardcoded `/assets/images/hero/mbbs_hero_campus.avif`; the
  file lives under `uploads/` and `media_assets` knew where. Now resolved through `getMediaAsset`.
- **`/mbbs-india/colleges` listed 749 dental, ayurveda, homoeopathy and nursing colleges** among its
  1,727, because the UG extract covers every stream NEET feeds. Filtered to MBBS by course — 839 now.

**Fixed in this pass:**

- **Two UG college lists disagreed.** `/mbbs-india/colleges` read `ug_all_colleges` (765 rows) while
  the predictor searched `institutes` level='ug' (1,727) — one site telling a student two different
  things. They are not duplicates: `institutes` is the complete list the closing ranks attach to,
  `ug_all_colleges` is the curated 765 with city, university and intake. `getUgColleges()` now joins
  them on the name with punctuation stripped (the two sources punctuate differently) so the page shows
  all 1,727, enriched where the CMS has facts.
- **Four pages made their database calls one at a time.** `/mbbs-india/colleges` and
  `/mbbs-india/deemed-universities` looped four `getMediaAsset` calls sequentially; deemed went from
  3.7s to 0.88s. `/services` and `/neet-ug-process` had the same shape.
- **`next build` opened more connections than Postgres allows.** The pool was `max: 10` *per process*
  and Next runs one worker per CPU core — 120 connections against a 100-connection server on a 12-core
  machine, and static generation failed with "Failed query" on whichever pages lost the race. Now 4.
- **Claims that argued against the product.** "95% accuracy in rank-based college predictions",
  "insider cutoff intelligence", "100% success rate in document verification" (four places) and
  "guaranteed results" in the root metadata. The differentiator here is publishing the authorities'
  own closing ranks and refusing to invent a forecast; those lines claimed the opposite. Counts the
  team can stand behind (2,100+ students, 12+ years) were left alone. The CMS rows carrying the same
  copy were updated too — a `content_blocks` row wins over the code fallback.
- **SEO.** `resolveMetadata` now emits a canonical, Open Graph and Twitter tags for every route that
  uses it; `metadataBase` added. `/videos`, `/nri-quota/colleges` and `/nri-quota/documents` had no
  metadata at all. `sitemap.xml` and `robots.txt` are now routes built from the database — 2,220 URLs
  against the 25 the static file listed, and robots finally points at the sitemap and keeps crawlers
  out of `/admin`.

**Also fixed:**

- **UG had no per-college pages.** `/mbbs-india/colleges/[slug]` now exists for all 1,727, mirroring the
  PG page; the 200 most-searched are pre-rendered and the rest are ISR at 24h. The colleges list and the
  cutoff table both link into them, so they are not orphaned.
- **A bare `header { height: 72px }` in `layout.css`** forced *every* semantic `<header>` to 72px. The new
  college page used one for its hero, which collapsed to a strip with its own white heading spilling onto
  the white page below. Scoped to `header[data-site-header]`.
- **The homepage had no lead form**, nor did the cutoff pages. `LeadCapture` is now on the homepage (as an
  orderable, hideable section), both cutoff pages, and carries a `level` — without it every UG enquiry
  landed in the admin labelled PG, because that is the API's default.
- **`/mbbs-india/colleges` forced dynamic *and* set `revalidate`**; `force-dynamic` wins, so the caching
  did nothing. `getUgColleges()` is now cached through `unstable_cache` for ten minutes instead, which
  works regardless of the page's render mode: 5.1s to 0.67s.
- **A page's static `metadata` silently shadowed its layout's CMS-backed `generateMetadata`** on
  `/neet-ug-process`, so the admin's title was ignored. Removed.
- **An active alert advertised UGC-NET** on a NEET counselling site. Hidden, not deleted.
- **Titles, canonicals, Open Graph and JSON-LD** are now complete across every page. The audit's
  canonical (18 pages), structured-data (13) and Open Graph (4) findings are all at zero.

**Still open — these are decisions, not clean-ups:**

1. **`headers()` in the root layout rules out ISR for pages that cannot enumerate their params.**
   `src/app/layout.tsx` reads the `host` header to decide whether to render `SiteShell`. Pages with
   `generateStaticParams` still pre-render — the college pages prove it — but everything else is
   per-request. The fix is a `(site)` route group so the host check leaves the root layout, which means
   moving every marketing route; domain logic is the part of this repo that bites, so it needs testing
   against all four host shapes first.
2. **`/mbbs-india/colleges` ships every college at once** (~600 KB). It renders state cards with all
   1,727 nested, so the whole country arrives to read one state. Server-side filtering through
   `/api/content/college-list` would fix it, but that is a redesign of a working component.
3. **Building through the SSH tunnel is fragile.** Two runs in this pass logged a handful of
   "Failed query" lines from a momentary tunnel drop. `safe()` catches them, so the build succeeds with
   an empty section baked into a page that is then cached for 24h. On the VPS the app and Postgres share
   a box, so this is a dev-environment hazard — but a build that can silently ship a blank section is
   worth a guard.
4. **Core Web Vitals are fine** — mobile LCP 1.1–2.5s, CLS under 0.05, no horizontal overflow at 390px.
   The remaining slowness is server-side and mostly the tunnel.

## Numbers on the site come from the database

`src/lib/dataStats.ts` counts what we actually hold, and every stat that describes the data reads
from it. This exists because the 2026-09-22 audit found the marketing quoting **"250+ PG colleges"
against a real 2,168**, "60+ branches" against 101, and "36 states" against 38 — underselling the
product by nearly nine times — while inflating the one number it could not back: **"5-year cutoff
intelligence"** over two years of PG data (2024–25) and two of UG (2025–26).

Removed in the same pass, from code *and* from the CMS rows that override it: "95% Success Rate",
"95%+ historical accuracy", "100% verification success rate", "Prediction Accuracy", "exact
admission probability", "Zero document rejection guarantee". Several of these sat directly beside
the predictor's own "published closing ranks, never an estimate" — the copy was arguing with itself.

Checked in both places, because **a `content_blocks` or `site_settings` row wins over the code
fallback**: fixing the component alone would have left the live site unchanged. `page_seo` too — the
PG page's description came from there.

Outcome claims that cannot be derived (2,100+ students guided, 12+ years) are the team's to state
and were left alone. Anything that describes the data must come from `getDataStats()`.

## Deployment (2026-09-23)

**The app runs as a plain Node server on the VPS, beside Postgres.** Not on Cloudflare Workers.

The Workers build succeeds and the worker boots, but it cannot serve this site: the OpenNext preview
answered one page in 9.7s and then returned 500 on every request after it, because a connection pool
held at module scope cannot be reused across Workers requests. That is fixable. What is not, is that
**Postgres is bound to localhost on the VPS and should stay that way** — an edge worker has no route
to it, and the only reason any of this ever worked locally is the SSH tunnel on the dev machine.
`wrangler.jsonc` and `open-next.config.ts` are kept, but nothing uses them.

On the box the difference is decisive: **TTFB is 44–59 ms** across every page, against ~14 s measured
through the tunnel. The tunnel was always the slowness, never the queries.

```bash
./scripts/deploy.sh              # build, package, upload, switch, verify
./scripts/deploy.sh --no-build   # ship what is already built
npm run smoke -- http://localhost:8120   # 54 checks, through an SSH tunnel
```

- `output: 'standalone'` in `next.config.mjs`. The deploy is a directory copy, not an npm install
  on the box — `.next/static` and `public/` are copied in separately because standalone omits them.
- Releases are timestamped under `/opt/admissionhands/releases/` and `current` is a symlink, so a
  switch is atomic and the previous five releases stay for rollback.
- Runs as the unprivileged `admissionhands` user, `ProtectSystem=strict`, bound to **127.0.0.1:8120**.
  Only Caddy should ever reach it. Secrets are in `/opt/admissionhands/.env`, mode 600.
- **This box is shared.** mining-app, cryptoway, smartscanner, tradeos and upi-collect run here, plus
  `/opt/ah-counselor` (a separate Python app on `ah.aismartscan.in`). Ports 8080 and 8090–8110 are
  taken; this app uses 8120. Do not restart anything you did not deploy.
- **Docker is not installed**, which WAHA needs — install it before wiring up WhatsApp verification.

### Not yet live

`admissionhands.com` still resolves to **93.127.173.119** (Hostinger) and serves the existing site.
Nothing here is public: the new deployment answers only on localhost, there is no Caddy block for it,
and no DNS points at it. Going live means adding the Caddy site blocks and moving DNS — a cutover on
a running business, and the user's call to make.

## Known gaps (what is left before production)

Ordered by what would hurt first.

1. **The UG source misfiles some cutoffs, and the import reproduces it faithfully.** Verified on
   2026-09-22 by reading the saved HTML: `details/1434.html` is titled "MES Dental College, Malappuram"
   and its own cutoff table carries MBBS rows. Four colleges are affected — MES Dental (27 MBBS rows),
   State Shri Durgaji Homoeopathic (24), The North Bengal Dental College (20), Nimra Institute of Dental
   Sciences (8) — **79 rank rows in total**.

   The seats are probably real and belong to a sibling institution: Nimra and North Bengal each have a
   separate medical college in the data whose MBBS count looks short, and **MES Medical College,
   Perinthalmanna — a 150-seat MBBS college in the same district, same trust — is missing from the
   import entirely.** So the rows are not junk to delete; they are real seats under the wrong banner.

   `getUgColleges()` keeps these four out of the MBBS directory by name, because a college's own name
   is better evidence of its stream than an attribution we have proved unreliable. **They are still
   reachable through the seat predictor**, which is the open decision — rename, merge or delete needs a
   human who can check the source. `node scripts/audit_ug_attribution.mjs` re-runs the whole check after
   every import and also flags the missing-sibling case.

   Two more holes in the same extract: `institutes.district` is NULL for all 1,723 UG rows and
   `ownership` is `'other'` for all of them. The directory therefore shows a Govt/Private badge only
   where the CMS curates one and says nothing for the rest, because guessing put a PRIVATE badge on
   government colleges.
2. **No error tracking and no deploy pipeline.** Nothing reports a 500 from production.
3. **Rate limiting is per-isolate**, in memory — `/api/leads` (5/min), admin login (8/10min),
   `/api/predict` (30/min), `/api/unlock` (5/hr), `/api/college-bands` (60/min). Across Workers isolates
   that is not a real limit; it is a speed bump. A real one needs Redis or a Durable Object, and it is
   what stands between the gate and someone cycling numbers to walk the rank space.
4. **The per-college pages now show 8 cutoff rows and gate the rest** (see the table above), so the
   long tail is no longer a free full dump. What stays public by design is those 8 rows across
   ~3,500 pages — the price of the SEO, and a far smaller surface than the whole table was.
5. JSON-LD renders only on the homepage, NRI page, PG college pages and `/mbbs-india/colleges`.
6. **Playwright specs in `tests/` predate all of this** and have not been updated.
7. **`/services` and `/neet-ug-process` are not section-controlled** — each is one client component,
   so there is nothing to order or hide yet.
8. Global `cache: 'no-store'` fetch override means no client caching anywhere.
9. ESLint config is still the Vite-era flat config (`react-refresh` plugin, `dist` ignore) and does not
    cover Next.js rules.
10. **UG fees carry no quota** (see above) and only 2026 UG rows carry a per-seat fee, because that is
   the only place the source published one. The predictor shows a fee where it has one.
11. 7 possibly-unused images in `public/assets/images/` (`hero/neet-hero.avif`, `hero/dy-patil-mumbai.avif`,
    `hero/india-medical-college-campus.avif`, `hero/medical-admission-counselling-session.avif`,
    `hero/neet-counselling-students.avif`, `hero/services_hero_counselor.avif`, `exam/neet-exam.avif`).
    Check `media_assets` before deleting — the homepage CtaBand still uses the counselling-session one.

### Waiting on the user

- Delete `/var/backups/marketscalper-removal-20260917/` on the VPS (788 MB).
- Remove the `scalper.aismartscan.in` DNS A record.
- Change the admin password (currently a generated one from setup).
