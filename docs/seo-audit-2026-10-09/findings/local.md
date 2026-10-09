# Local SEO Audit: admissionhands.com (audited 2026-10-09)

## Score: 23 / 100 (local-pack readiness; organic national strength is assessed elsewhere)

| Dimension | Weight | Score | Notes |
|---|---|---|---|
| GBP Signals | 25 | 2 | No GBP yet (owner to-do). No Maps embed, no directions link, no "write a review" link, no GBP reference on site |
| Reviews & Reputation | 20 | 3 | No Google rating/count anywhere. Three named testimonials on home page only, no Review/aggregateRating schema (correct: self-serving reviews must not be marked up) |
| Local On-Page SEO | 20 | 7 | Real address + hours + phone in SSR HTML, but no /contact page (404), city absent from title/H1/home body, no Noida/NCR landing page |
| NAP Consistency & Citations | 15 | 6 | Site NAP is internally consistent; citations only partly verifiable (see limits). Facebook/Instagram/YouTube exist |
| Local Schema | 10 | 3 | Only Organization (no address, geo, hours, local subtype). WebSite/WebPage/Breadcrumb/FAQ elsewhere |
| Local Links & Authority | 10 | 2 | 3 sameAs profiles; no evidence of local/directory links; backlinks known weak (Semrush off-page 0% per project notes) |

## Business type: hybrid (online-first national service with one real walk-in office)
- Footer (all pages) and /know-us show: **915, Bhutani City Center, Sector 32, Noida, UP 201301**, phone **+919310301949**, email info@admissionhands.com.
- /know-us has a "Visit Our Office - Our doors are always open. Walk in for a face-to-face strategy discussion" block with **Office Hours Mon-Sat 10:00 AM - 7:00 PM**, Call Now and WhatsApp buttons.
- The service is delivered online across India (JSON-LD areaServed = Country India; NRI/Indian families nationwide). The physical office is real and publicly invited (GBP-eligible as a storefront-style listing), but demand is national. No Maps embed anywhere.
- /contact and /contact-us both return 404. Contact details live only in the footer and /know-us. /privacy is also 404 (privacy sits inside /terms).

## Industry vertical: education / admission consulting (not one of the standard six verticals; closest is professional service). YMYL-adjacent (medical-college admissions, large fee decisions).

## NAP consistency audit
| Source | Name | Address | Phone | Email |
|---|---|---|---|---|
| Footer (every page, SSR) | AdmissionHands | 915, Bhutani City Center, Sector 32, Noida, UP 201301 | +919310301949 (tel: link) | info@admissionhands.com |
| /know-us contact block | Admission Hands (heading) | same | +919310301949 | same |
| src/lib/constants.ts (CONTACT_INFO) | - | same | +919310301949 / WhatsApp 919310301949 | same |
| JSON-LD Organization (home) | AdmissionHands / alt "Admission Hands" | **MISSING (no PostalAddress)** | +919310301949 (contactPoint only) | same |
| /terms JSON-LD | AdmissionHands | none | none | none |
| Facebook page (public meta) | "Admission Hands, Noida" | street not exposed in public HTML | not exposed | - |
| Instagram | Admission Hands - NEET UG & PG CONSULTANT | n/a | n/a | - |

Findings:
1. No text/number conflicts between footer, /know-us and constants. Name varies only in spacing ("AdmissionHands" vs "Admission Hands"); pick one trading form for GBP and citations and keep the other as alternateName.
2. Schema gap: address and hours are visible but absent from every JSON-LD node.
3. Phone is shown unspaced ("+919310301949"); a readable "+91 93103 01949" is better for humans and citation matching (keep E.164 in tel: and schema).
4. Facebook page About still reads "provide admission in MBBS, MBA, B.Tech, BBA, BCA, etc... in India and Abroad" (376 followers). That conflicts with the current NEET UG/PG positioning; align before building citations.
5. Same mobile number is both phone and WhatsApp (fine; declare it as primary phone in GBP).
6. Registered entity name is unknown: no Pvt Ltd/LLP, GST or CIN on the site. GBP and citations should match the registered/trading name exactly.

## GBP optimisation (nothing exists; checklist for creation)
Detected on site: address, phone, hours (Mon-Sat 10-7), email, social links. Missing: Maps embed, directions link, review link/widget, GBP link in sameAs, office photos, team photos, signage evidence.

Create the profile as a **storefront-type listing with visible address** (office is staffed, walk-ins invited, hours posted). Do not hide the address.
- **Primary category: "Educational consultant"** (closest fit to NEET counselling; the highest-weight ranking factor, so choose carefully and do not change it casually).
- Secondary (add 2-3; verify exact names in the GBP category picker since Google's list changes): "Career guidance service"; "Study abroad consultant" only if MBBS-abroad is actually offered (site is India-only today, so otherwise skip). Avoid "College", "School", "Coaching center" (coaching is not what is sold) and anything medical (Doctor/Clinic).
- **Service areas (optional with a visible address; does not drive ranking):** Noida, Greater Noida, Ghaziabad, Delhi, Gurugram, Faridabad, plus other cities only if genuinely served in person. GBP cannot express "all India"; online reach is communicated on-site.
- Hours: Mon-Sat 10:00-19:00, Sunday closed (match /know-us exactly). Add special hours for counselling windows.
- URL: point to a new /contact page (carrying NAP + schema). Appointment link: WhatsApp or /neet-college-predictor.
- Description (max 750 chars): lead with "NEET UG and PG medical admission counselling in Noida and across India", MBBS/BDS/MD-MS/NRI; avoid guarantees and "95%" style claims (project already removed them).
- Photos: exterior with signage, interior, counsellors at work, logo, cover. Videos: reuse YouTube explainers.
- Services list: MBBS counselling, MD/MS (PG) counselling, NRI quota counselling, document verification, choice-filling (mirrors /services).
- Posts: weekly during counselling rounds (the site's live-alerts feed is raw material).
- Verification risk: Bhutani City Center is a multi-tenant commercial complex. Expect a video showing the building exterior, suite 915, signage and staff/equipment. Put up signage first; a missing sign is a common suspension cause in office complexes. Never present a shared/virtual desk as a staffed office.
- Reviews: strongest lever for a zero-review profile. Use the GBP short review link, send by WhatsApp to students who completed counselling, 2-3 per week for steady velocity, reply to every review. No gating or incentives, and do not copy the on-page testimonials into GBP.

## Review health snapshot
- Google rating / count / response rate: **none (no GBP)**.
- On site: three testimonials (Ananya Sharma, Rahul Verma, Priya Nair) with no dates, photos or third-party attribution; no aggregateRating (appropriately absent). "2,100+ students" is a claim only.
- Once GBP has 10+ reviews, show a Google-sourced rating strip linking to the profile; do not add self-written Review/aggregateRating schema.

## Citation presence (Tier 1 and India-specific)
Verified by direct fetch:
- Facebook page exists: "Admission Hands | Noida", about 376 followers, stale description (see NAP point 4).
- Instagram @admissionhandss (347 followers, 65 posts) and YouTube @admissionhands exist. All three are in Organization sameAs.

Could not verify (WebSearch disabled in this session; DuckDuckGo returned a CAPTCHA; Bing returned unrelated results; Sulekha returns 403 to bots; Justdial returned only a generic search page): Justdial, Sulekha, IndiaMART, Google Maps/GBP, Bing Places, Apple Business Connect, Shiksha/Careers360 consultant listings, LinkedIn page. Treat as unknown, probably absent. Check manually: search "Admission Hands" Noida in Google Maps and Justdial; search "9310301949" in quotes on Google for stray or duplicate listings.

Recommended citation set, in order (character-identical NAP):
1. Google Business Profile, Bing Places, Apple Business Connect.
2. Justdial, Sulekha, IndiaMART (educational consultant category), yellowpages.in, Grotal, Cybo, Foursquare.
3. Education vertical: Shiksha, Careers360, Collegedunia consultant profiles where genuine; LinkedIn company page and X profile (both missing from sameAs).
4. Local: Noida business associations / chamber listings, Sector 32 building directory. BBB and Yelp have negligible India relevance; skip.

## Local schema validation
Present (home): Organization with @id, name, alternateName, url, logo, image, description, areaServed (Country India), sameAs x3, contactPoint (telephone, email, areaServed IN, languages en/hi).
Missing: address (required for local), subtype ProfessionalService/LocalBusiness, geo (5 decimals), openingHoursSpecification, top-level telephone, hasMap, GBP URL in sameAs, city-level areaServed, knowsAbout.
Do not add a second LocalBusiness entity with a different @id; upgrade the existing Organization node (generated by organization() in StructuredData.tsx) because the address is real and public. Place it on the home page and the new /contact page.

Recommended JSON-LD (fill geo from the verified GBP pin with 5+ decimals; do not guess coordinates):

```json
{
  "@context": "https://schema.org",
  "@type": ["Organization", "ProfessionalService"],
  "@id": "https://www.admissionhands.com/#organization",
  "name": "AdmissionHands",
  "alternateName": "Admission Hands",
  "url": "https://www.admissionhands.com/",
  "logo": "https://www.admissionhands.com/icon-512.png",
  "image": "https://www.admissionhands.com/assets/images/og/admissionhands-1200x630.jpg",
  "telephone": "+919310301949",
  "email": "info@admissionhands.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "915, Bhutani City Center, Sector 32",
    "addressLocality": "Noida",
    "addressRegion": "Uttar Pradesh",
    "postalCode": "201301",
    "addressCountry": "IN"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": "<GBP pin, 5+ decimals>", "longitude": "<GBP pin, 5+ decimals>" },
  "hasMap": "<GBP share URL once verified>",
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    "opens": "10:00", "closes": "19:00"
  }],
  "areaServed": [
    { "@type": "Country", "name": "India" },
    { "@type": "City", "name": "Noida" },
    { "@type": "City", "name": "Greater Noida" },
    { "@type": "City", "name": "Ghaziabad" },
    { "@type": "City", "name": "Gurugram" },
    { "@type": "AdministrativeArea", "name": "Delhi" }
  ],
  "knowsAbout": ["NEET UG counselling", "NEET PG counselling", "MBBS admission", "MD MS admission", "NRI quota"],
  "contactPoint": { "@type": "ContactPoint", "contactType": "customer service", "telephone": "+919310301949", "email": "info@admissionhands.com", "areaServed": "IN", "availableLanguage": ["en","hi"] },
  "sameAs": ["https://facebook.com/admissionhands", "https://www.instagram.com/admissionhandss", "https://youtube.com/@admissionhands", "<GBP URL>", "<LinkedIn>", "<Justdial>"]
}
```

priceRange is deliberately omitted (fees vary). Omit aggregateRating until Google reviews exist and are shown on the page.

## Local on-page
- Home title: "AdmissionHands - Expert Medical College Admission Guidance". No city in title or H1; fine for national organic, weak for "NEET counselling in Noida".
- "Noida" appears only in the footer and /know-us, never in body copy, title or headings.
- Dedicated service pages exist (/services, /mbbs-india, /md-ms-india, /nri-quota, predictor), which is the top local organic factor, but none is location-qualified. Do not create per-city doorway pages; one honest /contact (or /noida-office) page is enough.
- Add /contact: full NAP block, hours, embedded Google Map of the GBP, "Get directions" link, nearest metro/landmark (confirm), WhatsApp + call + appointment CTA, the JSON-LD above; link from header and footer. The current 404 is a direct loss: it is the page GBP should point to and the one people search for ("admission hands contact number").
- Keep Mon-Sat hours text identical to GBP.

## Multi-location
Single location; not applicable.

## Proximity note
Proximity (about 55% of local ranking variance) is outside our control. Realistic local-pack reach is Noida/Delhi-NCR searches such as "NEET counselling Noida" and "MBBS admission consultant near me". National volume (cutoffs, predictor, fees) is organic-only and unaffected by GBP.

## Top 10 prioritised actions
1. (Critical) Create and verify the GBP as a storefront listing at 915 Bhutani City Center, primary category "Educational consultant", hours Mon-Sat 10-19; have signage and a verification video ready.
2. (Critical) Build a real /contact page (currently 404) with NAP, hours, Maps embed, directions link and schema; use it as the GBP website URL.
3. (High) Upgrade the Organization JSON-LD to ["Organization","ProfessionalService"] with address, geo (5 decimals), openingHoursSpecification, telephone, areaServed; keep the same @id.
4. (High) Start a review programme right after verification: GBP short link via WhatsApp to past students, 2-3 per week, respond to all, no gating or incentives.
5. (High) Claim/create Justdial, Sulekha, IndiaMART, Bing Places, Apple Business Connect with identical NAP; first search the phone number in quotes for unknown or duplicate listings.
6. (High) Align the Facebook page description (stale MBBS/MBA/B.Tech/BBA/BCA/abroad text) with NEET UG/PG positioning and add address/hours/phone there; add LinkedIn, X and the GBP URL to sameAs.
7. (Medium) Fix a single brand string ("AdmissionHands" vs "Admission Hands") and the registered entity name; show legal name/GST/CIN in the footer for trust.
8. (Medium) Put "Noida" and "NEET counselling" in the home meta description and a visible office line; no stuffing and no city doorway pages.
9. (Medium) Add original office/team photos on the site and GBP; post weekly during counselling rounds.
10. (Low) Display phone as "+91 93103 01949" while keeping E.164 in tel: and schema; strip the igsh= tracking parameter from the footer Instagram link.

## Limitations
- WebSearch was unavailable; DuckDuckGo showed a CAPTCHA and Bing returned irrelevant results, so GBP/Maps presence and Justdial/Sulekha/IndiaMART citations could not be confirmed or ruled out. Facebook, Instagram and YouTube were confirmed by direct fetch only.
- No DataForSEO or other paid tools: no local-pack positions, listing counts, review velocity, citation audit or backlink data.
- Geo coordinates, legal entity, signage and building occupancy cannot be verified from the web; the "Visit Our Office" claim is taken at face value from the site.
- The score reflects local-pack readiness. A national, data-led site can rank well organically with a low local score.
