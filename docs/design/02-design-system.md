# Design System — "The Seat Matrix"

Har color, font aur spacing ka ek kaaran hai. Ye file hi source of truth hai.

---

## 1. Typography — width hi information hai

### Ek family, teen chaudai

**Archivo** (Google Fonts, variable). Isme teen widths aati hain aur **har width ka apna kaam** hai:

| Width | Kahan | Kyun |
|---|---|---|
| **Archivo Expanded** | Bade numbers — rank, fees, seats, chance % | Chaudi numerals dur se padhne mein aati hain. Ye page ka hero hai |
| **Archivo** (normal) | Body, UI, buttons, headings | Neutral, saaf, screen pe achhi |
| **Archivo Narrow** | Dense tables ke columns | Patli hai to ek row mein zyada columns aa jaate hain |

**Kyun Archivo:** Ek hi superfamily se teen kaam nikal jaate hain — isliye page bikhra hua nahi lagta. Aur ye "civic/government document" lineage se hai, jo humare subject (counselling bulletins, seat matrix) se exactly milta hai.

**Kyun Inter nahi:** abhi site pe Inter hai. Wo har SaaS site pe hai. Turant "template" lagta hai.

### Type scale

| Token | Size / line-height | Font | Kahan |
|---|---|---|---|
| `display-xl` | 72 / 68 | Expanded 700 | Homepage ka rank number |
| `display-l` | 56 / 56 | Expanded 700 | Page ka hero number |
| `display-m` | 40 / 44 | Expanded 600 | Section ka bada number |
| `h1` | 32 / 38 | Archivo 700 | Page title |
| `h2` | 24 / 30 | Archivo 600 | Section |
| `h3` | 19 / 26 | Archivo 600 | Sub-section |
| `body` | 16 / 26 | Archivo 400 | Paragraph |
| `body-sm` | 14 / 22 | Archivo 400 | Secondary |
| `label` | 13 / 18 | Archivo 500 | Form label, meta |
| `table` | 14 / 20 | **Narrow** 400 | Table cell |
| `table-num` | 14 / 20 | **Narrow** 500, tabular | Table ke numbers |

### Numerals ka niyam — ye important hai

```css
/* Har number jo compare hone wala hai */
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum" 1;
```

Bina iske table ke numbers hil-hilke dikhte hain aur aankh compare nahi kar paati. **Har fee, rank, seat count pe lagana hai.**

### Line length

Body text **65-75 character** se zyada nahi (`max-width: 68ch`). Isse zyada lamba hua to aankh agli line dhoondhne mein thak jaati hai.

---

## 2. Color

### Base — "document" palette

| Token | Light | Dark | Kahan |
|---|---|---|---|
| `--paper` | `#F7F8F7` | `#0E1614` | Page background |
| `--surface` | `#FFFFFF` | `#16211F` | Card, table, panel |
| `--surface-sunken` | `#EEF0EF` | `#0A100F` | Input, table header |
| `--ink` | `#111A18` | `#EEF2F0` | Primary text |
| `--ink-muted` | `#5A6663` | `#9AA8A4` | Secondary text |
| `--rule` | `#DDE2E0` | `#27332F` | Border, divider |

Paper thoda sa green-grey hai (pure white nahi) — lambi screen padhne mein aankh ko aaram. Aur ye AI-default cream `#F4F1EA` se alag hai.

### Brand — teal, par precise

Logo already teal hai, wo brand identity hai, use nahi phenkna:

| Token | Value | Kahan |
|---|---|---|
| `--brand` | `#0B7C6B` | Primary button, active nav, link |
| `--brand-hover` | `#096355` | Hover |
| `--brand-soft` | `#E3F2EE` | Selected row ka background, badge |
| `--brand-ink` | `#053F36` | Brand ke upar text |

### Signal — ye sirf chance ke liye hai ⚠️

**Ye teen color kahin aur use nahi honge.** Na decoration, na random badge. Sirf "seat milegi ya nahi":

| Token | Value | Matlab | Rule |
|---|---|---|---|
| `--safe` | `#1D7A4C` | Closing rank tumse kaafi peeche — mil jayegi | ≥90% chance |
| `--borderline` | `#A8690B` | Bilkul aas-paas — round pe depend | 40-90% |
| `--stretch` | `#B03A52` | Kaafi door — mushkil | <40% |

**Color-blind safety:** sirf color pe bharosa nahi karenge. Har chance ke saath **shape + text** bhi:

```
●  Safe          ◐  Borderline        ○  Stretch
```

Aur lightness bhi alag rakhi hai, to greyscale mein bhi teeno alag dikhte hain.

### Kya NAHI karna

- ❌ Gradient background — data ke peeche gradient padhna mushkil karta hai
- ❌ Signal colors ko button ya heading mein use karna — matlab kharab ho jayega
- ❌ Har card pe `rgba(0,0,0,.1)` wali same shadow — ye AI-generated ka sabse bada tell hai

---

## 3. Spacing & layout

4px base grid. Sirf ye values:

```
4  8  12  16  24  32  48  64  96
```

| Container | Width |
|---|---|
| Text content | `68ch` (~640px) |
| Standard page | `1200px` |
| Data table / explorer | `1440px` |
| Full bleed | 100% |

**Mobile gutter 16px, desktop 24px.** Bas.

### Radius — hierarchy batata hai

Sab pe ek jaisa radius mat lagao, wo flat lagta hai:

| Token | Value | Kahan |
|---|---|---|
| `--r-sharp` | `0` | Table cell, dense row |
| `--r-sm` | `4px` | Input, badge, small button |
| `--r-md` | `8px` | Card, panel |
| `--r-lg` | `14px` | Modal, bottom sheet |

### Elevation — 3 hi levels

| Level | Use | Shadow |
|---|---|---|
| 0 | Table, list (flat, sirf border) | none + `1px solid var(--rule)` |
| 1 | Card jo uthana ho | `0 1px 2px rgba(17,26,24,.06), 0 2px 8px rgba(17,26,24,.04)` |
| 2 | Dropdown, modal, sheet | `0 8px 24px rgba(17,26,24,.12)` |

---

## 4. Motion

**Ek page pe ek hi orchestrated moment.** Baaki sab sirf user ke action ka jawab.

| Kya | Duration | Easing |
|---|---|---|
| Hover, focus | 120ms | `ease-out` |
| Dropdown, accordion | 180ms | `cubic-bezier(.2,0,0,1)` |
| Modal, bottom sheet | 240ms | `cubic-bezier(.2,0,0,1)` |
| **Predictor ka result aana** | 400ms stagger | Ye hi ek signature moment hai |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

**Signature moment:** predictor mein rank daalne ke baad colleges list mein **sort hoke settle** hote hain (safe upar, stretch neeche). Ye ek baar hota hai, aur wahi page ki jaan hai. Har section pe fade-up **nahi** — wo generic lagta hai.

---

## 5. Components + saare states

Har component ke **5 states** likhe hain. Ye hi wo cheez hai jo aadhe projects mein chhoot jaati hai.

### 5.1 Rank Input — sabse important component

Ye poore product ka hero hai. Homepage, college page, predictor — sab jagah.

```
┌────────────────────────────────────────────────┐
│  Your NEET PG rank                             │
│  ┌──────────────────────────────────────────┐  │
│  │  12,450                                  │  │  ← Expanded, 40px
│  └──────────────────────────────────────────┘  │
│  [ General ▾ ]  [ Madhya Pradesh ▾ ]           │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │          Show my colleges                │  │
│  └──────────────────────────────────────────┘  │
│  47 colleges within reach                      │  ← live update
└────────────────────────────────────────────────┘
```

| State | Kya dikhega |
|---|---|
| Empty | Placeholder `e.g. 12450`, button disabled |
| Typing | Live count update: "47 colleges within reach" |
| Invalid | Border `--stretch`, neeche: "Rank 1 se 12,00,000 ke beech hona chahiye" |
| Loading | Button mein spinner + "Checking 2.3 lakh records" |
| Done | Results dikhein, input upar sticky ho jaye |

### 5.2 College Row (table) — listing ka default

Card **nahi**, row. Kyunki compare karna hai:

```
┌─────┬──────────────────────────┬────────┬─────────┬──────────┬────────┐
│  ●  │ Gandhi Medical College   │ Bhopal │  58,204 │  ₹1.2L   │  [+]   │
│safe │ Government · 250 seats   │   MP   │ 2025 R2 │  /year   │  save  │
└─────┴──────────────────────────┴────────┴─────────┴──────────┴────────┘
```

| State | Kya |
|---|---|
| Default | Flat, sirf bottom border |
| Hover | `--surface-sunken` background, 120ms |
| Selected | `--brand-soft` background + left border 3px brand |
| Saved | `[+]` → `[✓]` filled |
| Loading | Skeleton row (neeche dekho) |

**Mobile pe** ye row ek compact card ban jayegi (2 line), kyunki 6 column phone pe nahi aate.

### 5.3 Chance Badge

```
●  Safe          ◐  Borderline        ○  Stretch
   92%              64%                  18%
```

Color + shape + number — teeno. Sirf color kabhi nahi.

### 5.4 Loading — skeleton, spinner nahi

**Niyam:** jo aane wala hai uski shape dikhao. Spinner sirf button ke andar.

```
Table skeleton:
┌─────┬────────────────────┬──────┬──────┬──────┐
│ ▨▨  │ ▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨  │ ▨▨▨  │ ▨▨▨▨ │ ▨▨   │
│ ▨▨  │ ▨▨▨▨▨▨▨▨▨▨▨       │ ▨▨▨  │ ▨▨▨▨ │ ▨▨   │
└─────┴────────────────────┴──────┴──────┴──────┘
   ← shimmer left→right, 1.4s loop
```

| Kahan | Kya |
|---|---|
| Table/list | 6 skeleton rows |
| College detail | Header block + 3 section block |
| Chart | Grey box with axis lines |
| Button (action chal raha) | Inline spinner + text badalna: "Save" → "Saving" |
| Page change | Top pe 2px progress bar (brand color) |

**Timing:** 200ms se pehle kuch mat dikhao (warna flicker), 10s ke baad "Thoda time lag raha hai" message.

### 5.5 Empty state — hamesha agla kadam batao

Kabhi sirf "No results" mat likho. Har empty state mein: **kya hua + ab kya karein**.

```
┌──────────────────────────────────────────┐
│                                          │
│            [simple line icon]            │
│                                          │
│    In filters pe koi college nahi mila   │
│                                          │
│    Fee limit ₹5L se ₹15L karo, ya        │
│    state filter hata do                  │
│                                          │
│    [ Fee limit badhao ]  [ Filter saaf ] │
│                                          │
└──────────────────────────────────────────┘
```

| Kahan | Message | Action |
|---|---|---|
| Predictor mein 0 result | "Is rank + category pe seat nahi mil rahi" | "Dusre state dekho" / "Counsellor se baat karo" |
| Filter se 0 result | "In filters pe kuch nahi mila" | Exact suggestion: kaunsa filter dheela karo |
| Khaali shortlist | "Abhi koi college save nahi kiya" | "Predictor chalao" |
| Search mein kuch nahi | "'xyz' naam ka college nahi mila" | "Spelling check karo ya list browse karo" |

### 5.6 Error state

Errors **maafi nahi maangte**, aur kabhi vague nahi hote.

| Kya hua | Message | Action |
|---|---|---|
| Network fail | "Data load nahi ho paya. Internet check karo." | [Dobara try karo] |
| Server 500 | "Humari taraf se dikkat hai. Team ko pata chal gaya hai." | [Dobara try karo] [Home] |
| 404 | "Ye page nahi mila." | [Colleges dekho] [Home] |
| Session khatam | "Suraksha ke liye logout kar diya gaya." | [Wapas login karo] |
| Rate limit | "Bahut requests. 1 minute ruko." | Countdown timer |

❌ "Oops! Something went wrong 😅" — ye kabhi nahi. Ye user ko kuch nahi batata.

### 5.7 Baaki components

| Component | States |
|---|---|
| Button | default / hover / active / focus-visible / disabled / loading |
| Input | empty / filled / focus / error / disabled / with-hint |
| Select | closed / open / selected / searching / empty |
| Filter chip | off / on / disabled + count badge |
| Modal | Desktop: center. **Mobile: bottom sheet** (thumb ke paas) |
| Toast | success / error / info — 4s, upar right (desktop), upar (mobile) |
| Tab | active / inactive / disabled — mobile pe scrollable |
| Pagination | Desktop: numbers. Mobile: "Aur dikhao" button |
| Table | sortable header / sorted asc / desc / sticky first column (mobile) |
| Accordion | collapsed / expanded — counselling FAQ ke liye |

---

## 6. Iconography

**Lucide** (already installed). Rules:

- Stroke 1.5px, size 16/20/24 — teen hi
- Icon akela kabhi nahi, hamesha text ke saath (accessibility)
- ❌ Button text ke end mein `→` mat lagao — ye AI-generated ka classic tell hai
- Chance ke liye icon nahi, **shape** (●◐○) — kyunki wo data hai

---

## 7. Tailwind mein kaise utrega

`tailwind.config.ts`:

```ts
extend: {
  fontFamily: {
    display: ['var(--font-archivo-expanded)', 'system-ui', 'sans-serif'],
    sans:    ['var(--font-archivo)', 'system-ui', 'sans-serif'],
    narrow:  ['var(--font-archivo-narrow)', 'system-ui', 'sans-serif'],
  },
  colors: {
    paper:   'hsl(var(--paper))',
    surface: 'hsl(var(--surface))',
    ink:     { DEFAULT: 'hsl(var(--ink))', muted: 'hsl(var(--ink-muted))' },
    rule:    'hsl(var(--rule))',
    brand:   { DEFAULT: 'hsl(var(--brand))', soft: 'hsl(var(--brand-soft))' },
    signal:  {
      safe:       'hsl(var(--safe))',
      borderline: 'hsl(var(--borderline))',
      stretch:    'hsl(var(--stretch))',
    },
  },
  borderRadius: { sharp: '0', sm: '4px', md: '8px', lg: '14px' },
}
```

Saare colors CSS variables se aayenge taaki dark mode ek hi jagah se switch ho — aur mobile app bhi wahi tokens use kare.

---

## 8. Accessibility checklist

Har PR merge hone se pehle:

- [ ] Text contrast ≥ 4.5:1, bade text ≥ 3:1 (dono themes mein)
- [ ] Focus ring har interactive element pe dikhe (2px brand, 2px offset)
- [ ] Tab order page ke logical flow jaisa
- [ ] Table pe proper `<th scope>` — screen reader ke liye
- [ ] Form label `<input>` se juda ho (placeholder label nahi hota)
- [ ] Error `aria-describedby` se input se juda ho
- [ ] Modal mein focus trap + Esc se band
- [ ] Touch target ≥ 44×44px
- [ ] Chance sirf color se na pata chale (shape + text bhi ho)
