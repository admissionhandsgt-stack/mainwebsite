# AdmissionHands 2.0 — Design & Architecture Docs

Ye folder website ka poora blueprint hai. Code likhne se pehle ye padhna hai.

| Doc | Kya hai |
|---|---|
| **00-overview.md** (ye) | Product ka core: kaun use karega, kya problem solve hoga, design ka faisla |
| [01-architecture.md](01-architecture.md) | Sitemap, navigation, saare routes, user flows, URL strategy |
| [02-design-system.md](02-design-system.md) | Colors, typography, spacing, components, saare states (loader/empty/error) |
| [03-page-specs.md](03-page-specs.md) | Har page, section by section — layout + content |

---

## 1. Product ka core — ek line mein

> **Student apna NEET rank daale, aur 10 second mein jaan jaye ki kaunsa college mil sakta hai aur ghar pe kitna kharcha aayega.**

Baaki sab kuch — colleges, fees, counselling guide, services — isi ek kaam ke aas-paas hai.

## 2. Kaun use karega

| User | Kaun hai | Kya chahiye | Emotional state |
|---|---|---|---|
| **Student** (primary) | 17-24 saal, NEET result aa gaya | "Mera rank pe kya milega?" | Ghabraya hua, jaldi mein, phone pe |
| **Parent** (decision maker) | 40-55 saal | "Kitna paisa lagega? Safe hai?" | Paise ki chinta, trust chahiye |
| **Counsellor** (internal) | AdmissionHands team | Lead ka data, student ki list | Kaam ki speed |
| **Admin** (internal) | Content team | Data update, alerts, media | Simple CMS |

**Sabse important baat:** 70%+ traffic **mobile** pe aayega, aur aksar **panic mode** mein — result ke din, counselling round ki last date pe. Design isi ke liye hona chahiye: fast, saaf, bina soche samajh aane wala.

## 3. Asli problem jo hum solve kar rahe hain

NEET counselling India ki sabse confusing bureaucracy hai:

- **MCC (All India)** + **30+ state authorities**, sabke alag rules
- Har state ka apna quota, category code, domicile rule, bond, penalty
- 4-6 rounds, har round ki alag deadline
- Ek galat choice = ek saal barbaad, ya ₹50 lakh extra

Student ke paas jo hai: ek rank number aur bahut saara confusion.
Humare paas jo hai: **2.3 lakh closing ranks, 62,753 fee records, 3,855 colleges.**

**Design ka kaam: is dher ko ek saaf jawab mein badalna.**

## 4. Design ka faisla — "The Seat Matrix"

### Kya reject kiya, aur kyun

| Reject | Kyun |
|---|---|
| Muskurate doctors ki stock photo | Har competitor ke paas hai. Koi information nahi deti. Abhi apni site pe bhi yahi hai |
| Card grid mein sab kuch | Student ko **compare** karna hai. Cards comparison ko mushkil banate hain — aankh ko ek line mein number nahi milte |
| Generic "medical blue" (#2563EB) | Har hospital, har clinic, har health app yahi use karta hai |
| Homepage pe carousel / hero slider | Wo 2015 hai. Aur student ko scroll nahi, **jawab** chahiye |

### Jo choose kiya

Is duniya ki sabse characteristic cheez ek **number** hai. Har baat-cheet wahi se shuru hoti hai — *"kitna rank aaya?"* To design ka hero bhi wahi hoga.

**Homepage pe koi banner nahi. Sirf ek field: apna rank daalo.** Jaise hi type karo, page tumhari personal college list ban jata hai. Product hi hero hai.

Visual language **counselling ke seat-matrix document** se aaya hai — wahi dense, ruled, tabular feel jo MCC ke bulletin mein hota hai, par padhne layak aur sundar banaya hua. Authority document jaisa, marketing brochure jaisa nahi.

### Teen principles

**1. Number sabse bada hota hai.**
Har screen pe ek number hero hai — rank, fees, seats, chance %. Wo sabse badi cheez dikhegi. Label chhota, number bada.

**2. Color ka matlab hota hai, sajawat nahi.**
Green/amber/rose sirf ek cheez batate hain: seat milne ka chance (safe / borderline / mushkil). Inko kahin aur decoration ke liye use nahi karenge. Isse color khud information ban jata hai.

**3. Table > Card.**
Jahan compare karna ho wahan table. Card sirf wahan jahan cheez sach mein alag object ho (ek college). Ye ulta lagta hai par data-heavy product mein yahi kaam karta hai.

## 5. Quality floor — ye negotiable nahi hai

Har screen pe:

- **Mobile pe pehle** kaam kare, phir desktop
- **Keyboard se** poora chale, focus ring dikhe
- **Loading state** ho — skeleton, spinner nahi
- **Empty state** ho jo agla kadam bataye, sirf "No data" na likhe
- **Error state** ho jo bataye kya hua aur ab kya karein
- Dark mode dono mein contrast sahi (WCAG AA)
- `prefers-reduced-motion` respect ho
- 3G pe bhi khule — India ka asli internet yahi hai

## 6. Kya naya hai vs abhi ki site

| | Abhi | 2.0 |
|---|---|---|
| Pages | 29 | ~4,000 (3,855 college pages) |
| Student login | ❌ nahi hai | ✅ signup/login/dashboard |
| Predictor | ❌ | ✅ UG + PG |
| Cutoff data | ❌ | ✅ 2.3 lakh rows |
| Shortlist/save | ❌ | ✅ |
| Mobile app | ❌ | ✅ Android |
| Design | Stock photos + cards | Data-first, number-led |
