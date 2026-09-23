# Page Specs — har page, section by section

Layout + content dono. Jo copy yahan likhi hai wo **final copy** hai, placeholder nahi — waise hi use karo.

---

## 1. Home `/`

**Kaam:** 10 second mein student ko uske colleges dikhana. Bas.

```
┌──────────────────────────────────────────────────────────────┐
│  header                                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Apna rank daalo. College list abhi milegi.                 │  h1, 32/38
│   2,30,484 closing ranks · 2024 aur 2025 · 3,855 colleges    │  body-sm, muted
│                                                              │
│   ┌────────────────────────────────────────────────────┐     │
│   │  ( ) MBBS / NEET UG      (•) MD-MS / NEET PG       │     │
│   │  ┌──────────────────────────────────────────────┐  │     │
│   │  │  12,450                                      │  │     │  Expanded 40px
│   │  └──────────────────────────────────────────────┘  │     │
│   │  [ General ▾ ]  [ State ▾ ]                        │     │
│   │  [        Show my colleges        ]                │     │
│   │  47 colleges within reach                          │     │  live
│   └────────────────────────────────────────────────────┘     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ⚠ MCC PG Round 2 — choice filling 24 Sep tak   [dekho]      │  live strip
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Counselling ka pura naksha                                  │  h2
│  ┌──────────┬──────────┬──────────┬──────────┐               │
│  │ Cutoffs  │  Fees    │ Compare  │  States  │               │
│  │ 2 saal   │ + stipend│ 4 tak    │    36    │               │
│  └──────────┴──────────┴──────────┴──────────┘               │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  Akele nahi karna? (services teaser — 1 section, bas)        │
├──────────────────────────────────────────────────────────────┤
│  footer                                                      │
└──────────────────────────────────────────────────────────────┘
```

**Niyam:**
- Hero mein **koi image nahi**. Rank field hi hero hai
- Fold ke upar sirf: headline + rank field + live strip
- Testimonials, "why us", stats — sab **neeche**, ya bilkul nahi. Student ko proof nahi, jawab chahiye
- Rank daalte hi count live badalta hai — yahi dikhata hai ki data asli hai

**Copy:**
- h1: "Apna rank daalo. College list abhi milegi." *(English site: "Enter your rank. See your colleges.")*
- Sub: "2,30,484 closing ranks · 2024 aur 2025 · 3,855 colleges"
- CTA: "Show my colleges" (na ki "Submit", na "Get Started")

---

## 2. Predictor `/mbbs/predictor` · `/md-ms/predictor` ⭐

Product ka dil.

```
┌──────────────────────────────────────────────────────────────┐
│  [rank input — sticky top ke neeche]                         │
│  AIR 12,450 · General · MP     [badlo]                       │
├─────────────┬────────────────────────────────────────────────┤
│  FILTERS    │  47 colleges                     [sort: chance]│
│             │                                                │
│  State      │  ● SAFE — 12 colleges                          │
│  ☑ MP       │  ┌──────────────────────────────────────────┐  │
│  ☐ UP       │  │ ● Gandhi Medical College   58,204  ₹1.2L │  │
│  ☐ Delhi    │  │   Government · Bhopal · 250 seats    [+] │  │
│             │  ├──────────────────────────────────────────┤  │
│  Type       │  │ ● NSCB Medical College     61,890  ₹1.1L │  │
│  ☑ Govt     │  └──────────────────────────────────────────┘  │
│  ☐ Private  │                                                │
│  ☐ Deemed   │  ◐ BORDERLINE — 19 colleges                    │
│             │  ...                                           │
│  Fee        │                                                │
│  ₹0 ──●── 25L│  ○ STRETCH — 16 colleges                      │
│             │  ...                                           │
│  [Reset]    │                                                │
└─────────────┴────────────────────────────────────────────────┘
```

**Teen bucket** — safe / borderline / stretch. Ye hi wo cheez hai jo student ko chahiye: "kya pakka hai, kya risky hai."

**Signature moment:** results aate waqt rows apni bucket mein **sort hoke settle** hoti hain, 400ms stagger. Poore site ka ek hi orchestrated animation.

**Har row pe:** chance shape + college + closing rank + year/round + fee + save button.

**States:**
- Loading → 6 skeleton rows + "2.3 lakh records check kar rahe hain"
- 0 results → "Is rank + category pe seat nahi mil rahi. Dusre state try karo ya counsellor se baat karo."
- Rank galat → inline error, results clear nahi karna

**Mobile:** filters bottom sheet mein (`[Filters (3)]` button se), rows 2-line compact card.

**Lead moment (result ke baad, scroll pe):**
> "47 colleges mile. Ab inka order lagana sabse mushkil kaam hai — ek galat choice se seat nikal jaati hai."
> `[ Counsellor se baat karo ]`

---

## 3. College Listing `/mbbs/colleges`

1,687 (UG) / 2,168 (PG) colleges. **Table, cards nahi.**

```
┌──────────────────────────────────────────────────────────────┐
│  MBBS colleges in India                                      │  h1
│  1,687 colleges · 36 states · NMC approved                   │
│  [🔍 college ya state search karo          ]                 │
├─────────────┬────────────────────────────────────────────────┤
│  FILTERS    │  Name ▾    State   Seats   Fee/yr   Est   Save │
│  State      │ ─────────────────────────────────────────────  │
│  Type       │  AIIMS Delhi        Delhi    125   ₹5,856  1956│
│  Seats      │  AFMC Pune          MH       150   ₹64,000 1948│
│  Fee range  │  ...                                           │
│  NRI quota  │                                                │
│             │  [ 1 2 3 ... 68 ]        50 per page ▾         │
└─────────────┴────────────────────────────────────────────────┘
```

- Sortable columns (fee, seats, name, est)
- Server-side pagination — 1,687 ek saath nahi
- Mobile: first column sticky, baaki horizontal scroll
- URL mein filter (`?state=mp&type=govt`) — share ho sake aur SEO bane

---

## 4. College Detail `/mbbs/colleges/[slug]` ⭐ SEO

**3,855 aise page banenge.** Sabse zyada Google traffic yahin aayega.

```
┌──────────────────────────────────────────────────────────────┐
│  Home › MBBS › Colleges › Madhya Pradesh › Gandhi Medical    │
│                                                              │
│  Gandhi Medical College, Bhopal                              │  h1
│  Government · Bhopal, MP · 1955 se · NMC approved            │
│                                                              │
│  ┌──────────┬──────────┬──────────┬──────────┐               │
│  │   250    │  ₹1.2L   │ 58,204   │  1,050   │               │  Expanded 40px
│  │  seats   │ fee/year │ 2025 cut │   beds   │               │
│  └──────────┴──────────┴──────────┴──────────┘               │
│                                                              │
│  ┌────────────────────────────────────────────────────┐      │
│  │ Yahan chance hai?  [ rank daalo ]  [ Check karo ]  │      │  ⭐ INLINE
│  └────────────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────────────┤
│  [Cutoffs] [Fees] [Seats] [Baare mein] [Aas-paas]            │  tabs
│                                                              │
│  Closing ranks                                               │
│  Quota ▾  Category ▾  Year ▾                                 │
│  ┌────────┬──────┬───────┬────────┬────────┐                 │
│  │ Course │Quota │ Cat   │ 2024   │ 2025   │                 │
│  ├────────┼──────┼───────┼────────┼────────┤                 │
│  │ MBBS   │ AIQ  │ GEN   │ 54,102 │ 58,204 │                 │
│  │ MBBS   │ AIQ  │ OBC   │ 71,220 │ 74,880 │                 │
│  └────────┴──────┴───────┴────────┴────────┘                 │
│  [trend chart: 2 saal, har category ki line]                 │
├──────────────────────────────────────────────────────────────┤
│  Isi state ke colleges  |  Isi rank range ke colleges        │  internal links
└──────────────────────────────────────────────────────────────┘
```

**Sabse zaroori cheez: wo inline rank field.** Google se aaya student yahan landing karega — agar yahan se predictor tak ka rasta nahi hai to wo wapas Google chala jayega.

**SEO:**
- Title: "Gandhi Medical College Bhopal — MBBS Cutoff, Fees, Seats 2026"
- JSON-LD: `CollegeOrUniversity` + `FAQPage` + `BreadcrumbList`
- 8-10 internal links (same state, same type, same rank band)

**Data na ho to:** "2025 ka cutoff abhi publish nahi hua. 2024 ka data neeche hai." — khaali box kabhi nahi.

---

## 5. Cutoff Explorer `/mbbs/cutoffs`

2.3 lakh rows ka asli data browser.

```
│  Quota ▾  State ▾  Course ▾  Category ▾  Year ▾  Round ▾     │
│  ────────────────────────────────────────────────────────    │
│  College          Course  Quota  Cat   Round   Closing  Seats│
│  AIIMS Delhi      MBBS    AIQ    GEN   R1          58      5 │
│  ...                                     ← virtual scroll     │
│                                          [ CSV download ]     │
```

- **TanStack Table + Virtual** — bina virtualization ke browser hang ho jayega
- Filter URL mein jaata hai (shareable)
- Har filter pe row count live update
- CSV export (login chahiye — ye lead capture ka natural moment hai)

---

## 6. Fee Explorer `/mbbs/fees`

Parent ka page. **Net cost** dikhana hai, sirf fee nahi:

```
│  Budget: ₹0 ────●──── ₹25L        State ▾   Type ▾           │
│  ───────────────────────────────────────────────────────     │
│  College        Tuition  Hostel  Stipend  Bond   Net (4 yr)  │
│  Gandhi MC      ₹1.2L    ₹18K    ₹28K/m   2 yr   -₹8.4L      │
│                                                   ↑ kamaayi   │
```

**Insight jo koi nahi dikhata:** stipend wale PG course mein student **paisa kamata** hai. Net cost negative ho sakta hai. Ye number bada dikhega — yahi is page ki jaan hai.

---

## 7. Auth pages

### Signup `/signup`

```
┌────────────────────────────────────────┐
│           AdmissionHands               │
│                                        │
│   Apni list save karo                  │  h1 24px
│   Shortlist, choice order aur alerts   │
│   sab ek jagah.                        │
│                                        │
│   Phone number                         │
│   ┌──────────────────────────────┐     │
│   │ +91  │  98765 43210          │     │
│   └──────────────────────────────┘     │
│   [        OTP bhejo         ]         │
│                                        │
│   Pehle se account hai? Login karo     │
└────────────────────────────────────────┘
```

**Sirf phone.** Naam, email, password — kuch nahi. Wo baad mein profile mein. Har extra field 10% signup kam karta hai.

### OTP `/verify`

```
│   98765 43210 pe code bheja            │
│   ┌───┬───┬───┬───┬───┬───┐            │
│   │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │            │  auto-focus, auto-submit
│   └───┴───┴───┴───┴───┴───┘            │
│   Dobara bhejo (00:24)                 │  countdown
│   Number badlo                         │
```

- Auto-focus pehle box pe, type karte hi next
- Paste karo to sab box bhar jayein
- 6 digit pura hote hi **khud submit** — button dabane ki zarurat nahi
- Galat OTP → box shake nahi, seedha message: "Code galat hai. Dobara check karo."

### Login `/login`
Signup jaisa hi, copy alag: "Wapas aa gaye" + "Phone number".

---

## 8. Dashboard `/account`

```
│  Namaste 👋                                                  │
│  AIR 12,450 · General · MP        [profile badlo]            │
│                                                              │
│  ⚠ MCC Round 2 choice filling — 3 din baaki    [kholo]       │  urgent
│                                                              │
│  ┌──────────────┬──────────────┬──────────────┐              │
│  │      12      │      47      │       3      │              │
│  │  shortlist   │   reachable  │  comparisons │              │
│  └──────────────┴──────────────┴──────────────┘              │
│                                                              │
│  Tumhari shortlist                          [sab dekho]      │
│  ● Gandhi MC · Bhopal · 58,204 · ₹1.2L              [↑][↓]   │
│  ● NSCB MC · Jabalpur · 61,890 · ₹1.1L              [↑][↓]   │
│                                                              │
│  [ Choice list PDF download karo ]                           │
```

Deadline sabse upar, kyunki wahi sabse zaroori hai. Shortlist drag se reorder ho — wahi choice filling ka order ban jata hai.

---

## 9. Services `/services` — yahan paisa banta hai

```
│  Choice filling mein ek galti = ek saal                      │  h1
│                                                              │
│  Kya milta hai:                                              │
│  · Tumhare rank pe personalised college list                 │
│  · Choice order jo humne 2 saal ke data se banaya            │
│  · Round-by-round strategy                                   │
│  · Document aur reporting mein madad                         │
│                                                              │
│  ┌──────────────┬──────────────┬──────────────┐              │
│  │   Basic      │   Complete   │   Premium    │              │
│  │   ₹X         │   ₹Y         │   ₹Z         │              │
│  └──────────────┴──────────────┴──────────────┘              │
│                                                              │
│  [ Free call book karo ]                                     │
```

Pricing **saaf dikhegi**. "Contact for price" trust todta hai — student ko lagta hai mehenga hai.

---

## 10. Counselling Guide `/mbbs/counselling`

Text-heavy SEO page. Accordion mein steps:

```
│  MBBS counselling kaise hoti hai                             │
│  ▸ 1. Registration — MCC portal pe                           │
│  ▸ 2. Choice filling — yahi sabse important hai              │
│  ▸ 3. Seat allotment                                         │
│  ▸ 4. Reporting                                              │
│  ▸ 5. Upgrade rounds                                         │
│                                                              │
│  Apne state ke rules dekho:  [ state chuno ▾ ]               │
```

Line length `68ch`. Har step ke end mein relevant tool ka link.

---

## 11. Admin (abhi wala CMS + naya)

Sections: Colleges (UG/PG) · Cutoffs import · Fees · States · Branches · Leads · Alerts · Videos · Media · Legal · Users

Admin pe design system same, par **density zyada** — table rows compact (32px), kyunki ye roz ghanton use hota hai.

---

## 12. Kis order mein banana hai

| # | Page | Kyun pehle |
|---|---|---|
| 1 | Design system + tokens | Iske bina har page dobara banana padega |
| 2 | Header, footer, nav, bottom tabs | Har page pe chahiye |
| 3 | College listing + detail | 3,855 pages = SEO, sabse zyada ROI |
| 4 | Predictor | Product ka dil |
| 5 | Auth + dashboard | Predictor ke baad hi matlab banta hai |
| 6 | Cutoff + fee explorer | Data already ready hai |
| 7 | Home | Sabse aakhir — kyunki ye baaki sab ko dikhata hai |
| 8 | Services, counselling, blog | Content pages |

> **Home sabse aakhir mein kyun?** Kyunki homepage baaki sab pages ko showcase karta hai. Pehle banao to 3 baar dobara banana padega.
