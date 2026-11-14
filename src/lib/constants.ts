export const CONTACT_INFO = {
  address: "Office #915, 9th Floor, Bhutani City Centre, Sector 32, Noida, UP 201301",
  phone: "+919220626002",
  whatsapp: "919220626002",
  email: "info@admissionhands.com",
  /**
   * The public Telegram channel (counselling notices, rounds, cutoffs). Linked
   * straight, never through the AutoLoom /go/ah-tg link: that one is for the
   * channel's own description and lands on our homepage, tagged as Telegram traffic.
   */
  telegram: "https://t.me/AdmissionHandsIndia",
  /**
   * The Google Business Profile (verified 2026-10-17, "Admission Hands — Counselor
   * in Noida"), by its CID so the link survives a rename. The admin's
   * `social.google` setting wins over this.
   */
  google: "https://www.google.com/maps?cid=15474144466729356168",
  /**
   * The profile's own "write a review" link (Google Business Profile → Ask for reviews, read 2026-11-14; it opens the
   * review box on place 0x390ce5c62016fac3:0xd6bf34682e7acb88). The admin's `social.google_review` setting wins.
   * The competitor benchmark of that day found 0 reviews against NEET Advisor's 2,200 — reviews are what the local
   * results reward, so the footer and the leads screen both carry this link.
   */
  googleReview: "https://g.page/r/CYjLei5oNL_WEBM/review",
};

/**
 * The walk-in office, in the parts structured data and a Google Business
 * Profile need. One copy: /contact, the Organization JSON-LD and the GBP
 * listing must say exactly the same thing (NAP consistency).
 */
export const OFFICE = {
  // As the Google Business Profile writes it (2026-10-20), plus the sector it leaves out.
  street: "Office #915, 9th Floor, Office Tower, Bhutani City Centre, Sector 32",
  locality: "Noida",
  region: "Uttar Pradesh",
  postalCode: "201301",
  country: "IN",
  /** Open every day since 2026-10-10 (was Monday–Saturday, 10–7). */
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  opens: "10:00",
  closes: "22:00",
  hoursLabel: "Monday to Sunday, 10:00 AM – 10:00 PM",
  /** For running text: "open every day, 10 AM – 10 PM". */
  hoursShort: "every day, 10 AM – 10 PM",
};
