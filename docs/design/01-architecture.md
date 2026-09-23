# Architecture & Navigation

Site ka poora nakshaa — kaun sa page, kaun se URL pe, kis se juda hua.

---

## 1. URL strategy — pehle ye samjho

### Do level, ek jaisa structure

Site ke do bade hisse hain aur dono ka structure **bilkul same** rahega. Ek baar seekh liya to dono chalte hain:

```
/mbbs/...        UG  (MBBS)     — 1,687 colleges
/md-ms/...       PG  (MD/MS)    — 2,168 colleges
```

**Kyun mirror karna hai:** Google pe "neet ug college predictor" aur "neet pg college predictor" **alag keywords** hain. Alag URL = dono rank karenge. Ek common `/predictor` banate to sirf ek keyword milta.

### Purane URL ka kya hoga (ye mat bhoolna)

Abhi ki site `/mbbs-india` aur `/md-ms-india` pe hai aur Google mein indexed hai. URL badle to **saari ranking chali jayegi** — jab tak 301 redirect na lagao.

| Purana | Naya | Redirect |
|---|---|---|
| `/mbbs-india` | `/mbbs` | 301 |
| `/mbbs-india/colleges` | `/mbbs/colleges` | 301 |
| `/mbbs-india/deemed-universities` | `/mbbs/colleges?type=deemed` | 301 |
| `/mbbs-india/[state]` | `/mbbs/states/[state]` | 301 |
| `/md-ms-india` | `/md-ms` | 301 |
| `/neet-ug-process` | `/mbbs/counselling` | 301 |
| `/nri-quota` | `/nri-quota` | same |

Ye `next.config.mjs` ke `redirects()` mein jayega. **Launch ke din se pehle.**

---

## 2. Poora sitemap

```
/                                  Home — rank daalo, jawab lo
│
├── AUTH
│   ├── /login                     Phone/email + OTP
│   ├── /signup                    Naya account
│   └── /forgot-password
│
├── ACCOUNT (login chahiye)
│   ├── /account                   Dashboard
│   ├── /account/shortlist         Save kiye colleges
│   ├── /account/predictions       Purani predictions
│   ├── /account/choice-list       Choice filling order
│   └── /account/profile           Rank, category, state, domicile
│
├── MBBS (UG)
│   ├── /mbbs                      Hub page
│   ├── /mbbs/predictor            ⭐ Rank predictor
│   ├── /mbbs/colleges             Listing — 1,687, filters
│   ├── /mbbs/colleges/[slug]      College detail ⭐ SEO
│   ├── /mbbs/states               Saare states
│   ├── /mbbs/states/[state]       State ke colleges + rules
│   ├── /mbbs/cutoffs              Cutoff explorer
│   ├── /mbbs/fees                 Fee explorer
│   ├── /mbbs/compare              2-4 college side by side
│   ├── /mbbs/counselling          Process guide
│   └── /mbbs/counselling/[state]  State-wise rules
│
├── MD/MS (PG)  — upar wala poora structure same
│   ├── /md-ms
│   ├── /md-ms/predictor
│   ├── /md-ms/colleges
│   ├── /md-ms/colleges/[slug]
│   ├── /md-ms/branches            ⭐ PG-only: 101 branches
│   ├── /md-ms/branches/[branch]   Branch page (MD Radiology etc.)
│   ├── /md-ms/states/[state]
│   ├── /md-ms/cutoffs
│   ├── /md-ms/fees
│   ├── /md-ms/compare
│   └── /md-ms/counselling
│
├── COMMON
│   ├── /tools                     Saare tools ki index
│   ├── /nri-quota                 NRI seats
│   ├── /services                  Counselling packages
│   ├── /pricing                   Plans
│   ├── /alerts                    Notifications/updates
│   ├── /blog  /blog/[slug]        Articles (SEO)
│   ├── /about  /contact
│   └── /terms  /privacy  /refund
│
└── ADMIN (admin subdomain)
    └── /admin/*                   Abhi wala CMS + naya data
```

**Total pages:** ~40 static + **3,855 college pages** + ~65 state pages + ~101 branch pages = **~4,000 indexed pages**

Abhi 29 hain. Yehi SEO ka asli khel hai.

---

## 3. Navigation

### Desktop header

```
┌──────────────────────────────────────────────────────────────────────┐
│  [logo]   MBBS ▾   MD/MS ▾   Tools ▾   Counselling Help   Updates    │
│                                          [search]  [Login] [Get help] │
└──────────────────────────────────────────────────────────────────────┘
```

Sirf **5 primary items**. Zyada honge to koi bhi click nahi karta.

### Mega menu (MBBS ▾ pe)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  START HERE              BROWSE                 UNDERSTAND      │
│  ─────────────           ──────────             ──────────      │
│  Rank predictor          All colleges  1,687    How counselling │
│    kya mil sakta hai       filter + compare       works         │
│                                                                 │
│  Cutoff explorer         By state         36    Fee structure   │
│    2 saal ka data          domicile rules         + stipend     │
│                                                                 │
│  Fee calculator          Deemed          59     NRI quota       │
│    net kharcha             management seats                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Abhi chal raha: MCC Round 2 — last date 24 Sep      [dekho]    │
└─────────────────────────────────────────────────────────────────┘
```

Neeche wali **live counselling strip** sabse zyada click hogi — student ko yahi chahiye.

### Mobile

```
┌─────────────────────────┐
│ [≡]   AdmissionHands  🔍│   ← 56px, fixed
├─────────────────────────┤
│                         │
│      (page content)     │
│                         │
├─────────────────────────┤
│  🏠     🎯     📋    👤 │   ← bottom tab bar
│ Home Predict Saved  Me  │
└─────────────────────────┘
```

**Bottom tab bar** — kyunki 70% traffic mobile hai aur ye app jaisa feel deta hai. Wahi 4 tabs Android app mein bhi rahenge, to user ko dobara seekhna nahi padta.

Drawer (≡) mein: dono levels ka poora menu accordion mein, login, contact.

### Footer

4 columns: MBBS · MD/MS · Company · Legal. Plus contact + WhatsApp + app download.

---

## 4. User flows — asli raste

### Flow A: Google se aaya student (sabse zyada traffic) ⭐

```
Google: "aiims delhi mbbs cutoff"
   │
   ▼
/mbbs/colleges/aiims-delhi          ← cutoff table dikh rahi hai
   │
   │  page pe hi ek field: "apna rank daalo"
   ▼
rank daala → "AIR 12,450 pe yahan chance: mushkil (2025 closing: 58)"
   │
   │  saath mein: "tumhare rank pe ye 47 colleges milenge"
   ▼
/mbbs/predictor?rank=12450          ← ab ye asli tool pe aa gaya
   │
   ├─── shortlist banayi → signup maanga → account bana
   │
   └─── "confused ho? counsellor se baat karo" → LEAD 💰
```

**Ye sabse important flow hai.** College page pe rank field na ho to student wapas Google chala jayega.

### Flow B: Direct aane wala student

```
/  (home)
   │  hero mein hi rank field
   ▼
rank + category + state daala
   │
   ▼
/mbbs/predictor — results        ← 3 buckets: Safe / Borderline / Stretch
   │
   ├── filter: state, fees, type
   ├── college pe click → detail
   ├── compare (2-4 colleges)
   └── shortlist save → signup
```

### Flow C: Parent — paisa

```
/mbbs/fees
   │
   ▼
filter: budget ₹10L tak, state = MP
   │
   ▼
list: college + total fee + hostel + stipend + bond
   │
   ▼
/mbbs/compare — 3 colleges ka net cost
   │
   ▼
/services → counsellor se baat → LEAD 💰
```

### Flow D: Wapas aaya user

```
/login → OTP → /account
   │
   ├── "tumhari shortlist mein 12 colleges hain"
   ├── "MCC Round 2 ki last date 3 din baad" ⚠️
   └── choice list ready karo → download PDF
```

### Flow E: Lead capture (business)

Lead maangne ke **4 natural moments** — inhi pe poochna hai, random popup se nahi:

1. Predictor ka result dekhne ke baad — "ye 47 colleges mile, order kaise lagayein? expert se baat karo"
2. Shortlist mein 5+ college add karne pe
3. Choice list download karte waqt
4. Fee comparison ke baad — "loan aur bond samajhna hai?"

> **Popup ka niyam:** page khulte hi popup **nahi**. Student ne kuch value le li ho, tabhi poochna. Warna wo bounce karega aur Google ko signal jayega ki page bekaar hai.

---

## 5. Auth ka design — kab login maangna hai

Ye sabse aam galti hai: pehle hi login maang lena. Isse traffic marta hai.

| Feature | Login chahiye? |
|---|---|
| College browse karna | ❌ nahi |
| College detail dekhna | ❌ nahi |
| Cutoff dekhna | ❌ nahi |
| **Predictor chalana** | ❌ **nahi** — ye hook hai |
| Fee calculator | ❌ nahi |
| Compare karna | ❌ nahi |
| **Shortlist save karna** | ✅ haan |
| Choice list banana | ✅ haan |
| PDF download | ✅ haan |
| Alerts pana | ✅ haan |

**Logic:** value pehle do, account baad mein maango. Student predictor chala chuka hai, result dekh chuka hai, ab "ise save karo" pe signup maangna natural lagta hai.

### Login method

**Phone + OTP primary.** Indian students ke liye password sabse bada friction hai — bhool jaate hain. Competitor bhi OTP hi use karta hai.

Email/password secondary (optional, parents ke liye).

---

## 6. Data se page tak — kaunsa data kahan

| Page | Data source | Rows |
|---|---|---|
| `/mbbs/colleges` | `colleges` where level=UG | 1,687 |
| `/md-ms/colleges` | `colleges` where level=PG | 2,168 |
| `/*/colleges/[slug]` | `colleges` + `fees` + `closing_ranks` + `college_stipend` | per college |
| `/*/predictor` | `closing_ranks` + `chance()` logic | 2,30,484 |
| `/*/cutoffs` | `closing_ranks` | 2,30,484 |
| `/*/fees` | `fees` + `college_fee_matrix` | 62,753 |
| `/md-ms/branches/[branch]` | `branch_stats` + `courses` | 101 |
| `/*/states/[state]` | `state_rules` + colleges | 36 |
| `/*/counselling/[state]` | `state_rules.json` | 36 |
| `/alerts` | `live_alerts` | live |

⚠️ **UG cutoffs ka gap yaad rakhna** — abhi sirf 572 rows hain (181 colleges). UG predictor tab tak adhoora rahega jab tak ZyNerd ka UG package na aaye. Plan: UG predictor ka UI bana ke rakho, data aate hi live kar denge.

---

## 7. Rendering strategy (speed ke liye)

| Page type | Kaise render hoga | Kyun |
|---|---|---|
| Home, hub, services | **Static (SSG)** | Kabhi kabhi badalta hai, sabse fast |
| College detail × 3,855 | **SSG + ISR** (24 ghante) | SEO chahiye + itne pages har request pe nahi bante |
| State / branch pages | SSG + ISR | Same |
| Predictor results | **Client-side** (API call) | Har user ka alag |
| Cutoff explorer | Client-side + server pagination | 2.3 lakh rows, ek saath nahi bhej sakte |
| Dashboard | **SSR** (private) | Login-specific |
| Blog | SSG | SEO |
| Admin | Client (SPA jaisa) | Public nahi |

**Sabse bada risk:** 3,855 pages ka build slow ho jayega. Isliye build pe sirf **top 500 colleges** generate honge (traffic wale), baaki **on-demand ISR** se — pehla visitor aayega tab banega, phir cache ho jayega.

---

## 8. SEO structure

Har college page pe:

- `<title>`: "AIIMS Delhi MBBS — Cutoff, Fees, Seats 2026"
- JSON-LD: `CollegeOrUniversity` + `FAQPage` + `BreadcrumbList`
- Breadcrumb: Home › MBBS › Colleges › Delhi › AIIMS Delhi
- Internal links: isi state ke colleges, isi rank range ke colleges

**Dynamic sitemap** (abhi static aur purana hai) — `/sitemap.xml` index + `/sitemap-colleges-ug.xml`, `/sitemap-colleges-pg.xml` (har ek mein max 50,000 URL).
