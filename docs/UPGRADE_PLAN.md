# AdmissionHands 2.0 — Production Grade Plan

**Banaya:** 17 Sep 2026 · **Status:** draft, tumhare approval ka wait
**Bhasha:** simple Hinglish. Har section mein "kya" + "kyun" + "kaise".

---

## 0. Pehle reality check — abhi humare paas hai kya

Maine teeno jagah scan kar li. Ye raha sach:

### A. `D:\Admisson Hands` — current website

| | |
|---|---|
| Stack | Next.js 14 + Supabase (hosted) + Cloudflare Workers |
| Data | 765 UG colleges, 252 PG colleges, 59 deemed, 33 states |
| Cutoff data | **ZERO** |
| Nature | Sundar brochure site — content dikhata hai, tool kuch nahi |

Ye site dekhne mein achhi hai par **koi student isse baar baar wapas nahi aayega**, kyunki isme kaam ki cheez (rank daalo → college batao) hai hi nahi.

### B. `D:\Zyn` — NEET PG counsellor tool ⭐

Yahan asli dum hai:

| Table | Rows | Kya hai |
|---|---|---|
| `closing_ranks` | **2,30,484** | Round-wise closing rank, 2024 + 2025, 39 counsellings, 35 states |
| `cutoff_history` | 55,689 | Saal-dar-saal comparison |
| `options` | 55,689 | Seat options |
| `fees` | 35,564 | Fee + hostel + stipend + bond |
| `college_fee_matrix` | 3,501 | Fee matrix |
| `colleges` / `institutes` | 2,168 / 2,211 | College master |
| `college_stipend` | 2,132 | Stipend data |
| `nmc_register` | 727 | NMC register |

Plus `serve/app.py` — 1,870 lines ka **working FastAPI tool** jisme:
- `chance()` — admission probability engine (AIR daalo → chance batata hai)
- `net_cost()` — fee + stipend + bond ka net cost
- `home_state_report()` — home state quota ka faayda
- `relaxations()` — filter dheela karne ke suggestions
- `cheapest_reachable()`, `spread()`, `desirability()` — ranking logic

**Aur sabse badi baat: VPS already chal raha hai.**

| | |
|---|---|
| Server | `38.49.209.165`, Ubuntu 26.04 |
| Live URL | https://ah.aismartscan.in |
| Front door | Caddy + Let's Encrypt (auto-renew) |
| **PostgreSQL** | **Already installed** — `pg-backup.sh` roz saari DB dump karta hai |
| Backups | Daily, verified, 7-day retention, Windows pe pull hote hain |
| Disk | 84 GB used / 37% — jagah hai |
| Aur kya chal raha | TradeOS, MarketScalper, SmartScanner, CryptoWay, CryptoMinerX, UPI Collect |

Matlab **VPS kharidne ki zarurat nahi**, Postgres setup karne ki zarurat nahi. Wo already hai.

### C. `D:\Gulshan\PG\Website` — competitor ka mirror

`muzaffarkhan.in` (MedEduinfo) ka 1.3 GB full mirror, 6,800+ pages. Unke features:

`advance-predictor` · `allotment-tracker` · `check-fee-structure` · `check-ipd` · `choice-filling-assistance` · `closing-cutoff` · `cutoff-comparison` · `expected-rank` · `neet-college-predictor` (all-india / state) · `nri-quota` · `personalised-counselling` · `pricing` · OTP login

**Unki live site ab tooti hui hai** — `/PG/suggestion` ab 2,168 ki jagah 1 college return karta hai. Unka extracted data bhi sirf ~1,200 closing ranks ka hai.

**Humare paas 2,30,484 hain. Yaani 190x zyada.**

---

## 1. ✅ DECISIONS LOCKED (17 Sep 2026)

| # | Decision | Final |
|---|---|---|
| 1 | Data | **Website scrape + ZyNerd extract dono use karenge.** Risk bata diya gaya, user ne confirm kiya. Aage discuss nahi karna. |
| 2 | VPS | **Purana box (38.49.209.165).** MarketScalper hata diya gaya — ~6 GB free hua. |
| 3 | Scope | **UG + PG dono** |
| 4 | Mobile | **Web + mWeb + Android app** (Play Store) |
| 5 | Repo | **Turborepo monorepo** (Section 9 dekho) |
| 6 | Migration | **Parallel build → big bang switch** (Section 10 dekho) |

### UG data ka sach — jo tumne poocha

Maine dono jagah check kiya. Ye raha exact hisaab:

| Cheez | UG | PG | Source |
|---|---|---|---|
| College master | **1,687** ✅ | 2,168 ✅ | Website scrape |
| Fee items | **55,481** ✅ | 7,272 | Website scrape |
| Established year | 982 colleges | — | Website scrape |
| **Cutoffs / closing ranks** | **572** ⚠️ | **2,30,484** ✅ | scrape / ZyNerd |
| Cutoff coverage | **sirf 181 colleges** | 2,168 colleges | — |

**UG ka college aur fee data bahut achha hai** — 55,481 fee items to PG se bhi zyada hain.

**Lekin UG cutoffs nahi hain.** Sirf 572 rows, 181 colleges ke. Predictor ke liye ye kaafi nahi — usme har college × course × quota × category × round chahiye.

**Kyun nahi hain:** Zyn wala ZyNerd subscription **"NEET PG 2026, exam id 1"** ka tha. UG unka alag package hai (`packages` endpoint pe milega). Isliye scraper ne kabhi UG chhua hi nahi — `scraper/mcc/` aur `scraper/state/` folders khaali pade hain.

**Fix (3 options):**

| Option | Kaam | Time | Kharcha |
|---|---|---|---|
| **A. ZyNerd ka UG package lo** ⭐ | Wahi scraper, bas exam id badlo | 3-5 din | Subscription fee |
| B. MCC + state sites se scrape | Naya scraper likhna padega | 3-4 hafte | Free |
| C. Sirf fees/colleges dikhao, predictor PG-only | Kuch nahi | 0 | Free |

**Meri salah: Option A.** Tumne already ZyNerd route choose kiya hai, to UG ke liye alag standard rakhne ka koi matlab nahi. Ek subscription mein UG ka data bhi utne hi scale pe aa jayega (~2 lakh rows expected), aur scraper already likha hua hai — sirf exam id badalna hai.

Batao to main scraper ko UG ke liye ready kar dunga.

---

## 1b. Purani legal note (record ke liye — decision ho chuka hai)

Ye chhupane wali baat nahi thi, isliye likhi thi. **User ne padh kar ZyNerd data use karne ka faisla le liya hai**, to aage ise dobara nahi uthaya jayega.

**Zyn ka saara cutoff data ZyNerd (zynerd.com) se aaya hai** — unke paid subscription account ka bearer token use karke, unke `infra.zynerd.com/api_v2` se. Maine verify kiya: `scraper/mcc/` aur `scraper/state/` folders **khaali** hain. Saara data `scraper/portal/` yaani ZyNerd se nikla hai.

**Iska matlab kya:**

- Ye official MCC/NMC data **nahi** hai — ye ek competitor ka paid database hai
- Isko public commercial website pe daalna = unki ToS ka breach, aur India mein database rights / unfair competition ka case ban sakta hai
- **Business risk:** agar kal ko legal notice aaya, to tumhare product ka pura core hi gayab ho jayega

**Practical solution (aur ye actually behtar hai):**

Closing ranks, fees, seat matrix — ye sab **public record** hain. MCC aur state counselling authorities khud publish karte hain. Tumhare paas `data/reference/` mein **MCC PG bulletin 2024 aur 2025 ke PDF already pade hain**, `nmc_colleges.json`, `state_rules.json`, `state_category_codes.json` bhi.

To plan ye hai:
1. **ZyNerd extract ko internal QA benchmark** ki tarah use karo — ship mat karo
2. Same data **official sources se dobara nikalo** (MCC portal + state authority sites + bulletins)
3. Jab humara number ZyNerd ke number se match kare → tumhe pata chal gaya ki extraction sahi hai

Isse data **100% tumhara** ho jayega, koi legal risk nahi, aur quality bhi verified. Extra kaam: ~2-3 hafte. Meri strong recommendation yahi hai.

> **Tumhara call hai.** Agar tum kehte ho "abhi ZyNerd data se launch karo, baad mein replace karenge" — to main wo bhi bana dunga, par risk likhit mein bata diya hai. Baaki sab kuch (2-8 phases) dono raaston mein same rahega.

---

## 2. Target picture — banega kya

```
                        ┌─────────────────────────────┐
   admissionhands.com   │  Next.js 15 (App Router)    │
   (web)                │  React 19 + Tailwind v4     │
                        │  shadcn/ui design system    │
                        └──────────────┬──────────────┘
                                       │
   Expo app (iOS+Android) ─────────────┤  same design tokens
   React Native Reusables              │  same API
                                       │
                        ┌──────────────▼──────────────┐
                        │  API layer (Next route      │
                        │  handlers + server actions) │
                        │  Drizzle ORM                │
                        └──────────────┬──────────────┘
                                       │
                        ┌──────────────▼──────────────┐
                        │  PostgreSQL 16 (apna VPS)   │
                        │  + full-text search         │
                        │  + materialized views       │
                        └─────────────────────────────┘
                        Auth: better-auth (apna)
                        Files: Cloudflare R2 ya MinIO
                        Deploy: Docker + Caddy + systemd
```

**Supabase se kya kya hatega:**

| Abhi (Supabase) | Baad mein (apna) |
|---|---|
| Postgres (hosted) | Postgres on VPS — **already chal raha hai** |
| Supabase Auth | better-auth (email + OTP) |
| Supabase Storage | Cloudflare R2 (sasta, CDN free) ya MinIO |
| `supabase-js` client | Drizzle ORM (type-safe, no `as any`) |
| Auto-generated types | Drizzle schema = single source of truth |
| RLS policies | API layer pe auth checks |

---

## 3. UI/UX library — jo tumne poocha 🎨

Short answer: **shadcn/ui hi rakho, par usko properly istemal karo.** Reason — tumhare project mein wo already hai, aur ab shadcn ka naya "registry" system aa gaya hai jisse tum **ek saath kai libraries se components kheench sakte ho**, sabka look same rahega.

### Step 1 — extra registries jodo

`components.json` mein ye add karo:

```json
{
  "registries": {
    "@originui":   "https://originui.com/r/{name}.json",
    "@kibo":       "https://www.kibo-ui.com/r/{name}.json",
    "@magicui":    "https://magicui.design/r/{name}.json",
    "@aceternity": "https://ui.aceternity.com/registry/{name}.json"
  }
}
```

Phir aise install karo:

```bash
npx shadcn@latest add @originui/input-43
npx shadcn@latest add @kibo/table
npx shadcn@latest add @magicui/number-ticker
```

| Registry | Kis kaam ka |
|---|---|
| **@shadcn** (base) | Foundation — button, dialog, form. Ye already hai |
| **Origin UI** | 500+ polished inputs/selects/filters. Admin panel aur filters ke liye best |
| **Kibo UI** | Advanced blocks — heavy tables, kanban, AI chat UI |
| **Magic UI** | Marketing page animations — counters, marquee, beams |
| **Aceternity** | Landing page ke "wow" sections (soch samajh ke, warna slow ho jayega) |

### Step 2 — theme unique banao

**tweakcn** (https://tweakcn.com) — visual editor hai shadcn tokens ke liye. Isse humara brand color/radius/font set karke CSS variables export kar lenge. **Yahi hai "unique dikhne" ka asli raaz** — sab log shadcn default theme use karte hain, isliye sab websites ek jaisi lagti hain. Tokens badlo, pura feel badal jata hai.

### Step 3 — heavy data ke liye

| Zarurat | Library |
|---|---|
| 2.3 lakh rows ka table | **TanStack Table** + **TanStack Virtual** (virtual scroll — warna browser hang) |
| Charts (cutoff trends) | **Recharts** already hai — isi pe rehte hain |
| Forms | react-hook-form + zod — already hai |
| Animations | framer-motion already hai |

### Step 4 — mobile app

**React Native Reusables** (https://reactnativereusables.com) — ye shadcn/ui ka React Native version hai, NativeWind pe bana. Maine iske docs check kiye: same `components.json`, same `cn()` helper, same CSS variables.

Matlab: **ek baar design system banao, web aur mobile dono pe chalega.** Expo se iOS + Android dono nikal jayenge.

### MCP servers

- **shadcn MCP already connected hai** tumhare setup mein — maine abhi use karke test kiya, kaam kar raha hai (abhi sirf `@shadcn` registry dikhti hai; upar wali add karoge to wo bhi dikhengi)
- **Context7 MCP bhi connected hai** — latest docs ke liye
- Aur kuch connect karne ki zarurat nahi. Jo hai wo kaafi hai.

---

## 4. Phase-wise plan

Har phase ka apna deliverable hai. Ek phase khatam → dikhaunga → tab agla shuru.

### Phase 0 — Decisions & setup (2-3 din)

- [ ] Data ka faisla (Section 1 wala) — official re-source ya ZyNerd extract?
- [ ] VPS ka faisla: purana shared box vs naya dedicated (neeche Section 5 padho)
- [ ] Domain plan: `admissionhands.com` (main), `api.` , `admin.`
- [ ] Naya Postgres database + user banao VPS pe
- [ ] Backup script mein naya DB add karo (`pg-backup.sh` khud hi utha lega)
- [ ] Staging environment khada karo

**Deliverable:** likhit decisions + khaali DB ready

---

### Phase 1 — Data foundation (1-2 hafte) 🔑

Ye sabse important phase hai. Yahan galti hui to aage sab kharab.

- [ ] Postgres schema design karo (Drizzle mein):
  - `institutes`, `courses`, `quotas`, `categories`, `counsellings` — master tables
  - `closing_ranks` — partitioned by year (2024/2025/2026)
  - `fees`, `stipends`, `bonds`
  - `college_facts` — beds, established year, university, management
- [ ] SQLite (225 MB) → Postgres migration script
- [ ] Indexes: `(year, counselling_id, course_id, quota, category)`, rank pe B-tree
- [ ] Full-text search: college naam ke liye `tsvector` + GIN index
- [ ] Materialized views: "cutoff trend by course", "state summary"
- [ ] Data validation: row counts match karo, spot-check 50 rows

**Deliverable:** Postgres mein 2.3 lakh rows, query 100ms se kam mein

---

### Phase 2 — Backend layer (1 hafta)

- [ ] Drizzle setup + schema + migrations (`drizzle-kit`)
- [ ] Supabase client ko replace karo — saare `as any` casts khatam
- [ ] API routes: `/api/colleges`, `/api/cutoffs`, `/api/predict`, `/api/search`
- [ ] `serve/app.py` ka Python logic TypeScript mein port karo:
  - `chance()` → probability engine
  - `net_cost()` → cost calculator
  - `home_state_report()` → state advantage
- [ ] Response caching (Redis ya Next cache)
- [ ] Rate limiting — abhi wala in-memory hai, wo VPS pe theek kaam karega

**Deliverable:** saari API working, Postman/curl se testable

---

### Phase 3 — Auth + Storage (4-5 din)

- [ ] **better-auth** setup: email + phone OTP (competitor bhi OTP use karta hai)
- [ ] Admin users migrate karo Supabase Auth se
- [ ] Sessions properly persist karo (abhi `persistSession: false` hai — reload pe logout ho jata hai, ye bug hai)
- [ ] Images: Supabase Storage → Cloudflare R2
- [ ] `BackendImage` component ko naye URLs pe point karo

**Deliverable:** Supabase ka koi bhi hissa ab zaroori nahi

---

### Phase 4 — Design system (1-2 hafte) 🎨

- [ ] Brand tokens define karo (tweakcn se) — colors, radius, shadows, fonts
- [ ] `src/styles/` refactor — abhi 5 CSS files hain, tokens-first karna hai
- [ ] Dark mode har component pe test karo
- [ ] Extra registries add karo (Section 3)
- [ ] Core components rebuild: CollegeCard, FilterBar, DataTable, CutoffChart
- [ ] Mobile-first layouts — abhi desktop-first hai
- [ ] Accessibility: keyboard nav, focus rings, contrast ratios
- [ ] Storybook (optional, par team badhe to bahut kaam aata hai)

**Deliverable:** component library + live style guide page

---

### Phase 5 — Killer features (3-4 hafte) 🚀

Yahi wo hai jo AdmissionHands ko brochure se **tool** banayega:

| Feature | Kya karega | Data source |
|---|---|---|
| **Rank Predictor** | AIR + category + state daalo → colleges with chance % | `closing_ranks` + `chance()` |
| **Cutoff Explorer** | 2.3 lakh rows, filter + sort + virtual scroll | `closing_ranks` |
| **Cutoff Comparison** | 2024 vs 2025 trend chart | `cutoff_history` |
| **Fee + Cost Calculator** | Fee − stipend + bond = net cost | `fees`, `college_stipend` |
| **Choice Filling Assistant** | Optimal preference list banao | `chance()` + `desirability()` |
| **College Pages** | 2,200 SEO pages, har college ka full data | sab tables |
| **Home State Advantage** | State quota ka faayda dikhao | `state_rules.json` |
| **Seat Matrix Browser** | Round-wise seat availability | `options` |

**SEO ka mauka:** 2,200 college pages × (UG + PG) = **hazaaron indexed pages**. Abhi site pe sirf ~29 pages hain. Ye organic traffic ka pahaad hai.

**Deliverable:** har feature live + mobile pe test

---

### Phase 6 — Mobile app (2-3 hafte)

- [ ] Monorepo banao (Turborepo): `apps/web`, `apps/mobile`, `packages/ui`, `packages/db`
- [ ] Expo + NativeWind + React Native Reusables setup
- [ ] Design tokens share karo web se
- [ ] Core screens: search, predictor, college detail, saved list
- [ ] Push notifications (counselling round alerts — ye retention ka killer feature hai)
- [ ] App Store + Play Store submission

**Deliverable:** dono stores pe app

---

### Phase 7 — Deploy & ops (1 hafta)

- [ ] Docker Compose: `web`, `postgres`, `redis`, `caddy`
- [ ] Caddy config (existing Caddyfile mein **append** karo, chhedo mat — Zyn wale docs mein yahi tareeka likha hai)
- [ ] GitHub Actions: push → build → deploy
- [ ] Zero-downtime deploy (blue-green ya rolling)
- [ ] Monitoring: uptime check, error tracking (Sentry), slow query log
- [ ] Backups: naya DB `pg-backup.sh` mein add (already verified script hai)
- [ ] **Restore test karo** — jo backup restore na hua ho wo backup nahi, file hai

**Deliverable:** production live + rollback plan

---

### Phase 8 — SEO + performance + launch (1 hafta)

- [ ] JSON-LD structured data (abhi bilkul nahi hai)
- [ ] Dynamic `sitemap.xml` (abhi static aur purana hai)
- [ ] Meta tags + OG images har page pe
- [ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1
- [ ] Image optimization (AVIF already use ho raha hai, achha hai)
- [ ] Analytics: GA4 already hai + conversion tracking
- [ ] "UAT TEST" badge hatao 😄
- [ ] Load test — counselling season mein traffic phategi

**Deliverable:** launch

---

## 5. ✅ VPS — MarketScalper hata diya gaya (17 Sep 2026)

**Status: DONE.** Backup lekar, verify karke, safely remove kiya gaya.

**Backup pehle liya gaya** — `/var/backups/marketscalper-removal-20260917/` (788 MB):

| File | Size |
|---|---|
| `marketscalper.dump` | 728 MB — `pg_restore --list` se **verified readable** |
| `opt-marketscalper.tar.gz` | 43 MB — pura app folder |
| `home-deploy-ms.tar.gz` | 18 MB — deploy user ka home |
| `marketscalper.service` | systemd unit |
| `etc-marketscalper/` | env files |
| `Caddyfile.before-removal` | pura Caddy config |

**Jo hataya gaya:**

- `marketscalper.service` — stop, disable, unit file delete
- Caddy block `scalper.aismartscan.in` (lines 14-38) — `caddy validate` pass, phir **reload** (restart nahi, taaki koi connection na toote)
- Postgres DB `marketscalper` (2.6 GB) + role `marketscalper`
- `/opt/marketscalper` (145 MB), `/etc/marketscalper/`
- Users `deploy-ms` + `marketscalper`, dono groups, `/home/deploy-ms`
- Purana backup folder `/var/backups/postgres/marketscalper/`

**Safety verification:**

- `smartscanner.service` mein "marketscalper" ka zikr mila tha — check kiya, wo sirf ek **comment** tha, koi dependency nahi ✅
- Saari 8 doosri sites ka HTTP status **before aur after bilkul same** raha (302/302/404/404/200/200/302/303) ✅
- Koi failed unit nahi ✅
- Baaki 11 services chal rahe hain: tradeos, smartscanner, cryptoway (×4), mining-app (×2), upi-collect, ah-counselor, caddy, postgres ✅
- `scalper.aismartscan.in` ab koi response nahi deta (expected) ✅

**Disk: 90 GB → 84 GB used. ~6 GB free hua** (estimate 2.8 GB tha, WAL + indexes ki wajah se zyada mila). Ab 149 GB available.

> ⚠️ Backup abhi server pe hai. Jab tum 100% sure ho jao ki MarketScalper dobara nahi chahiye, tab
> `rm -rf /var/backups/marketscalper-removal-20260917` chala dena. Ya bolo to main local pe pull kar dunga.
> DNS se `scalper.aismartscan.in` ka A record bhi hata dena (wo tumhare domain panel mein hai).

---

## 5b. Purani salah (record ke liye — decision ho chuka hai)

Tumhara VPS pe **already 8 apps chal rahe hain**: TradeOS, MarketScalper, SmartScanner, CryptoWay, CryptoMinerX, UPI Collect, ah-counselor.

Aur uska track record dekho (`ops/README.md` se):
- Logs 49 GB kha gaye the — logrotate 3 hafte se chup-chaap fail ho raha tha
- TradeOS ka watchdog 3 hafte tak kabhi chala hi nahi (execute bit missing tha)
- `serial-getty` 1,51,737 baar restart hua tha

**Ye box already thoda bhara hua hai.** AdmissionHands ka public traffic + 2.3 lakh rows ki queries usi box pe daalna risky hai — agar counselling season mein traffic aayi to tumhare trading apps bhi affected ho sakte hain.

**Meri recommendation:** AdmissionHands ke liye **alag dedicated VPS** lo. ₹1,500-2,500/mahina (Hetzner CX32 ya DigitalOcean 4GB). Isse:
- Dono cheezein ek doosre ko nahi girayengi
- AdmissionHands ko apna full CPU/RAM milega
- Scale karna aasan (traffic badhe to bas upgrade)
- Security bhi alag (public website + trading apps alag rehne chahiye)

Purane box ka setup (Caddy config, backup scripts, systemd patterns) **copy kar lenge** — wo already achhe se likha hua hai, dobara sochna nahi padega.

---

## 6. Timeline summary

| Phase | Kaam | Time |
|---|---|---|
| 0 | Decisions + setup | 2-3 din |
| 1 | Data foundation | 1-2 hafte |
| 2 | Backend layer | 1 hafta |
| 3 | Auth + storage | 4-5 din |
| 4 | Design system | 1-2 hafte |
| 5 | Killer features | 3-4 hafte |
| 6 | Mobile app | 2-3 hafte |
| 7 | Deploy + ops | 1 hafta |
| 8 | SEO + launch | 1 hafta |

**Web tak (Phase 0-5, 7-8):** ~9-12 hafte
**Mobile app ke saath:** ~12-15 hafte

Agar sirf web pe focus karein aur mobile baad mein karein, to **~10 hafte mein production launch** ho sakta hai.

---

## 7. Repo structure — monorepo (final recommendation)

### Pehle ek confusion door karein

Tumne likha "Web + mWeb + APK". Ye **teen cheezein nahi, do hain**:

- **Web + mWeb = ek hi cheez.** mWeb ka matlab "mobile browser pe website". Same Next.js app, bas responsive. Alag banane ki zarurat **bilkul nahi** — 2010 mein log `m.site.com` banate the, ab koi nahi banata. Ek site jo phone pe bhi sundar chale = mWeb done.
- **Android app = alag cheez.** Ye Expo se banega.

Play Store ke liye chhoti si baat: naye apps ke liye Google **AAB** (Android App Bundle) maangta hai, `.apk` nahi. APK sirf direct WhatsApp/website se baantne ke kaam aata hai. Expo dono bana deta hai.

### Structure

```
admissionhands/                    ← ek hi git repo
├── apps/
│   ├── web/                       ← Next.js 15 (public site + admin + mWeb)
│   └── mobile/                    ← Expo (Android app)
├── packages/
│   ├── ui/                        ← design system — web + mobile dono ke liye
│   ├── db/                        ← Drizzle schema + migrations (single source of truth)
│   ├── core/                      ← business logic: chance(), net_cost(), predictor
│   └── config/                    ← tsconfig, eslint, tailwind preset (shared)
├── scripts/                       ← data import, scrapers
├── docs/
└── turbo.json
```

### Kyun monorepo?

| Problem (do alag repos mein) | Monorepo mein |
|---|---|
| Brand color badla → web + app dono mein alag-alag badlo | `packages/ui` mein ek jagah badlo, dono update |
| DB column add kiya → app ka type purana reh gaya, crash | `packages/db` se dono ko same types |
| `chance()` logic web pe theek, app pe purana | `packages/core` mein ek copy, dono use karte hain |
| "App ka ye version kaunsa backend chahta hai?" confusion | Ek commit = ek complete state |

Tumhare case mein **`packages/core` sabse zyada faayda dega** — wahi predictor logic web aur app dono pe chalega, ek jagah likha hua.

### Kaise shuru karein

Naya repo **mat** banao. Isi repo ko monorepo mein badlo:

```bash
mkdir -p apps/web
git mv src public next.config.mjs tailwind.config.ts postcss.config.js apps/web/
npm install turbo --save-dev
```

Fayda: **git history bachi rahegi**, aur wo saara cleanup jo humne kiya wo bhi. Naya repo banao to sab shuru se karna padega.

---

## 8. Migration — "big bang vs parallel" ka matlab

### Big bang 💥
Ek din decide karo: "aaj raat purani site band, nayi live." Sab ek saath switch.

- ✅ Fast, sasta, ek hi system sambhalna
- ❌ Kuch bhi toota to **poori site down**. Counselling season mein ye business khatam kar sakta hai
- Jaise: purana ghar tod ke usi jagah naya banana — beech mein rehne ki jagah nahi

### Parallel 🔀
Purani site chalti rahe, nayi saath mein bane. Traffic dheere-dheere shift karo (10% → 50% → 100%).

- ✅ Safe. Naya toota to purane pe wapas
- ❌ Do systems chalane padte hain, data dono jagah sync rakhna padta hai — mehnga aur confusing
- Jaise: naya ghar alag jagah banao, phir shift karo, purana baad mein becho

### ✅ FINAL DECISION (17 Sep 2026): Big bang — local pe develop, seedha deploy

User ka faisla: **poora naya site local machine pe banega**, koi beta subdomain nahi. Jab ready ho jaye, ek baar mein VPS pe deploy.

Practically ye neeche wale "parallel build → big bang switch" ka hi simple version hai — farq sirf itna ki naya site beta URL ke bajaye **local pe** banega. Safety wahi hai: jab tak deploy nahi karte, purani site chalti rahegi aur uspe koi asar nahi.

**Do cheezein phir bhi zaroori hain:**
1. **Deploy se pehle purani site ka backup + DNS ka current record note kar lo** — rollback ke liye
2. **Purani Supabase turant band mat karna.** Deploy ke baad 2-4 hafte chalne do. Kuch gadbad hui to wapas ja sakein

---

### Neeche wala reference (original recommendation)

**Parallel build → Big bang switch** ⭐

Beech ka rasta, tumhare liye sabse sahi:

1. **Purani site bilkul chalti rahegi** — `admissionhands.com` pe jaisi hai waisi. Zero risk
2. Naya stack alag jagah banega — `beta.admissionhands.com`, apna Postgres, apna sab
3. Data import karo, features banao, test karo — **jitna time lage lagne do**, purani site pe koi asar nahi
4. Jab naya poori tarah ready + tested ho → **ek din DNS switch**. 5 minute ka kaam
5. Purani site 2-4 hafte chalti rahe (band mat karo) — gadbad hui to DNS wapas ghuma do, **2 minute mein rollback**
6. Sab theek chala → Supabase band, paisa bacha

**Kyun ye best hai:** "parallel" ka poora safety milta hai bina do systems ko sync kiye — kyunki jab tak switch nahi hota, naye system pe real users hote hi nahi. Data sync ka jhanjhat hi khatam.

**Ek hi shart:** switch se pehle purani site ka data **freeze** karna hoga (admin mein changes band) taaki final import ke baad kuch chhoot na jaye. Bas 2-3 ghante ka window.

---

## 9. Agla kadam

Decisions lock ho gaye. Ab main **Phase 0 + Phase 1 ka detailed technical spec** bana sakta hoon:

- Exact Postgres schema (Drizzle mein, UG + PG dono)
- SQLite → Postgres migration script
- Website scrape CSV → Postgres import script
- Index strategy 2.3 lakh+ rows ke liye
- Monorepo conversion ke exact commands

**Ek jawab chahiye:** UG cutoffs ke liye **ZyNerd ka UG package logey?** (Section 1 dekho). Us par depend karta hai ki UG predictor Phase 5 mein aayega ya baad mein.

Jo bhi phase pe kaam ho, uske shuru mein `CLAUDE.md` padhna — usme pura project context hai, tokens bachte hain.
