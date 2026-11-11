/**
 * The NEET PG 2026 documents lists as shipped (2026-11-12) — the fallback for the admin's `pg_documents_official` collection
 * (Admin → Content → Sections & lists), where the team updates them each cycle. One entry per counselling authority.
 *
 * Every item was read in the authority's own 2026 document (MCC's information bulletin and user guide; each state's
 * brochure or prospectus), linked in `url` — nothing added from memory, no coaching site as a source. Items are in the
 * authority's order, in plain English close to its words. A line starting "[E] " is one MCC marks "Essential document".
 * Karnataka is the procedure only: KEA's 2026 bulletin, which holds its list, was not posted where it could be read.
 * No imports: the seed script (scripts/seed_pg_documents.mjs) reads this file too.
 */

export interface PgDocumentList {
  /** The authority, as the page names it. */
  title: string;
  /** The document it comes from, with its date. */
  subtitle: string;
  /** The list, one item per line; "[E] " marks an essential document; "## " starts a sub-heading. */
  body: string;
  url: string;
  /** Points that sit beside the list, one per line. */
  notes: string;
  /** When the list was read against the source. */
  checked: string;
}

const CHECKED = "12 Nov 2026";

export const PG_DOCUMENTS: PgDocumentList[] = [
  {
    title: "MCC — All India Quota, deemed universities, central institutes, DNB",
    subtitle: "NEET-PG Counselling 2026 Information Bulletin, Chapter 12.2 and FAQ 6 (posted 8 Oct 2026)",
    url: "https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/10/202610082121348550.pdf",
    body: [
      "[E] Allotment letter issued by MCC",
      "[E] Admit card of NEET PG 2026, issued by NBEMS",
      "[E] Result / rank letter of NEET PG 2026, issued by NBEMS",
      "[E] Mark sheets of the MBBS 1st, 2nd and 3rd professional examinations",
      "[E] MBBS degree certificate or provisional certificate",
      "Internship completion certificate — or a certificate from the head of the institution that the internship will be complete by 30 September 2026",
      "[E] Permanent or provisional registration certificate from a State Medical Council (provisional only if the internship ends by 30 September 2026)",
      "[E] Class 10 certificate or birth certificate, as proof of date of birth",
      "Photo ID: driving licence, voter ID, passport or Aadhaar card",
      "## If they apply to you",
      "[E] SC/ST certificate from the competent authority, in the bulletin's format, in English or Hindi, with the sub-caste clearly mentioned",
      "[E] EWS certificate as per Central Government norms, in the bulletin's format — income for the financial year ending 31 March 2026",
      "OBC (non-creamy layer) certificate in the bulletin's format — the sub-caste must be on the Central List of OBC (NCBC), income for the financial year ending 31 March 2026",
      "[E] PwD: the Eligibility Certificate from MCC's designated medical board (made online before choice filling, with your UDID card) — no other disability certificate is accepted",
      "NRI / OCI candidates: the same documents in original as uploaded on MCC's portal",
    ].join("\n"),
    notes: [
      "Originals only: without the original certificates you are not allowed to take admission. Originals deposited with another institute or university do not count.",
      "The allotted college verifies the documents, not MCC — the allotment stays provisional until it does.",
      "A college may ask for more: check its list before you travel to report.",
      "A certificate in another language: carry a certified English copy with the original.",
      "Your name spelt differently on two documents: carry an affidavit or undertaking that both belong to you.",
      "Upload clear scans on MCC's portal within 2–3 days of the final allotment — Freeze and Float alike. Float candidates are verified online by the college.",
      "At registration an Indian candidate uploads only a cancelled cheque. Files are PDF, 20 KB to 500 KB each.",
      "Foreign medical graduates: the FMGE (screening test) pass, registration with NMC or a State Medical Council, and the internship complete by 30 September 2026.",
    ].join("\n"),
    checked: CHECKED,
  },
  {
    title: "Maharashtra — State CET Cell",
    subtitle: "NEET-PG 2026 Information Brochure, clause 12.2 (approved 13 Oct 2026)",
    url: "https://statecetcell.s3.ap-south-1.amazonaws.com/2026/PGM/PGM-26_IB.pdf",
    body: [
      "Application form of State NEET-PG 2026 (downloaded)",
      "NEET-PG 2026 admit card",
      "Photo ID: driving licence, PAN card or passport",
      "NEET-PG 2026 result / mark sheet",
      "Nationality: certificate, valid passport, or SSC/HSC school leaving certificate showing “Indian”",
      "MBBS degree or passing certificate",
      "Internship completion certificate, or the head of institution's certificate of the completion date (Annexure J)",
      "Permanent or provisional registration with the Maharashtra Medical Council, another State Medical Council or NMC",
      "Head of institute's certificate that your MBBS college is recognised by NMC",
      "Medical fitness certificate (Annexure M)",
      "Receipt of the online fee and deposit",
      "## If they apply to you",
      "Caste certificate, and caste validity certificate",
      "Non-creamy layer certificate (VJ/DT-A, NT-B, NT-C, NT-D, OBC, SEBC, SBC) valid up to 31 March 2027 or later",
      "EWS eligibility certificate for the academic year 2026-27",
      "Selection letter for an MBBS taken through an all-India exam (All India Quota, AIIMS, central institutes)",
      "Disability certificate from the issuing authority",
      "NOC from the Directorate of Health Services (in-service candidates)",
      "Orphan certificate",
      "NRI documents as per Annexure O",
    ].join("\n"),
    notes: [
      "Report in person with the originals for physical verification — no proxy.",
      "A reserved-category candidate without the caste validity certificate at registration is considered in the open category (relaxations issued on 2 Jul and 4 Sep 2026 allow later submission).",
    ].join("\n"),
    checked: CHECKED,
  },
  {
    title: "Uttar Pradesh — DGME UP",
    subtitle: "NEET PG-2026 Counselling Brochure, chapter 6 (Admission process)",
    url: "https://dgme.up.gov.in/assets/admin/news/PG%202026%20BROCHURE.pdf",
    body: [
      "Allotment letter",
      "NEET PG 2026 admit card",
      "NEET PG 2026 score card / rank letter",
      "High school mark sheet or certificate, as proof of date of birth",
      "Mark sheets of all MBBS professional examinations",
      "MBBS passing certificate or degree",
      "Compulsory rotatory internship completion certificate",
      "Permanent or provisional registration certificate (State Medical Council / NMC)",
      "Reservation certificate (SC/ST/OBC/EWS/PwD), if you claim one",
    ].join("\n"),
    notes: [
      "Originals plus one set of self-attested photocopies are deposited at admission.",
      "Failing to produce an original, or any concealment, costs the candidature.",
      "The security money is refunded only after every round of counselling is over.",
    ].join("\n"),
    checked: CHECKED,
  },
  {
    title: "Rajasthan — NEET PG Admission/Counselling Board 2026",
    subtitle: "Rajasthan NEET PG Counselling 2026 Information Bulletin, section 15",
    url: "https://pg.neetrajasthan.com/notifications/1792302615499.pdf",
    body: [
      "Allotment letter",
      "NEET PG 2026 score sheet / card",
      "Printed application form of State PG Seats Allotment 2026",
      "Accepted resignation from your present institution, or from a college allotted in another counselling (including All India)",
      "Class 10 certificate or mark sheet, as proof of date of birth",
      "MBBS mark sheets and degree / provisional certificate",
      "Internship completion certificate",
      "Registration certificate (NMC or State Medical Council)",
      "Attempt certificate of the MBBS examinations",
      "Photo ID (driving licence, PAN, voter ID, government or PSU card, Aadhaar or passport)",
      "Six passport-size photographs, the same as on the application",
      "Domicile certificate (if applicable)",
      "Surety and service bonds, in the bulletin's proforma",
      "## If they apply to you",
      "Caste and sub-category certificate valid for 2026-27",
      "PwD Eligibility Certificate from an MCC-notified centre",
      "EWS certificate valid for 2026-27",
      "NOC from your present employer",
    ].join("\n"),
    notes: [
      "The internship must be complete on 30 September 2026; no condonation is accepted.",
      "Registered with a council other than Rajasthan's: submit the Rajasthan Medical Council certificate within a month of joining.",
    ].join("\n"),
    checked: CHECKED,
  },
  {
    title: "Tamil Nadu — Selection Committee, DME&R",
    subtitle: "Prospectus for PG Degree / Diploma 2026-27 (Government quota), clause 22",
    url: "https://tnmedicalselection.net/news/08102026235127.pdf",
    body: [
      "NEET PG 2026 admit card and score card",
      "Aadhaar card, and passport / voter ID / driving licence",
      "MBBS degree certificate (and diploma certificate, if any) or provisional pass certificate",
      "CRRI / CRMI (internship) completion certificate",
      "Permanent or provisional registration certificate (NMC / State Medical Council)",
      "Nativity certificate (clause 5(c))",
      "## If they apply to you",
      "Community certificate (BC, BCM, MBC, DNC, SC, SCA) from the competent authority",
      "ST community certificate from the Revenue Divisional Officer",
      "Service candidates: TNPSC / MRB selection and posting orders",
      "Regional Medical Board certificate for persons with benchmark disability",
      "Eligibility certificate from the Tamil Nadu Dr. M.G.R. Medical University (MBBS from another university)",
    ].join("\n"),
    notes: "Originals are produced at joining, with scanned copies; the photograph must be the one uploaded for NEET PG 2026.",
    checked: CHECKED,
  },
  {
    title: "Kerala — CEE Kerala",
    subtitle: "Prospectus for Medical PG Degree Courses 2026-27, clause 10.1.22",
    url: "https://cee.kerala.gov.in/pgm2026/pdf/Prospectus.pdf",
    body: [
      "NEET PG admit card (NBEMS)",
      "Allotment memo issued by the Commissioner for Entrance Examinations",
      "Proof of date of birth",
      "MBBS degree / pass certificate",
      "Permanent registration certificate from the Kerala State Medical Council (or the erstwhile T.C. Medical Council)",
      "CRRI (internship) certificate",
      "Eligibility / equivalency certificate from KUHS (MBBS from a university outside Kerala)",
      "The required bonds, filled in and signed by you and your sureties",
      "Original transfer certificate from the institution you last studied at",
      "Relieving order (service candidates)",
      "Any other document named in the allotment notification",
    ].join("\n"),
    notes: "Two bonds on stamp paper are signed at joining: not to discontinue the course, and (general merit and AIQ candidates) to serve at least a year as senior resident.",
    checked: CHECKED,
  },
  {
    title: "Gujarat — ACPPGMEC",
    subtitle: "Instructions for submission of original documents after allotment, Round 1 MD/MS/Diploma 2026",
    url: "https://medadmgujarat.ncode.in/web/PG2026/MDMS/R1/INSTRUCTIONS%20FOR%20SUBMISSION%20OF%20ORIGINAL%20DOCUMENTS%20AFTER%20ALLOTMENT%20OF%20ADMISSION_ROUND%201%20MD,%20MS,%20Diploma.pdf",
    body: [
      "Allotment letter of ACPPGMEC",
      "Tuition fee receipt (self-financed colleges: one term; government colleges: fees and deposit as notified)",
      "All MBBS mark sheets",
      "12-month internship completion certificate — complete on or before 30 September 2026",
      "NEET-PG 2026 mark sheet",
      "Place and date of birth and Indian citizenship: school leaving / transfer certificate (and birth certificate or passport if the birthplace is not on it)",
      "Provisional or permanent registration (State Medical Council or NMC)",
      "## If they apply to you",
      "SEBC, ST or SC caste certificate issued in Gujarat",
      "SEBC non-creamy layer certificate (dated as the instructions require, valid for 2026-27)",
      "EWS certificate issued in Gujarat",
      "Passport, for dual / foreign citizenship or NRI",
      "Class 12 mark sheet (MBBS from outside Gujarat)",
      "Gujarat domicile certificate (MBBS and birthplace both outside Gujarat)",
      "Disability certificate (PwD)",
      "NOC from the competent authority (in-service candidates)",
    ].join("\n"),
    notes: "Without every original document the allotted student has no right of admission.",
    checked: CHECKED,
  },
  {
    title: "Karnataka — KEA",
    subtitle: "Original Document Verification for PG NEET 2026, Annexure-19 (5 Oct 2026) — the procedure",
    url: "https://cetonline.karnataka.gov.in/keawebentry456/pgetmed2026/ANN20261006172206english.pdf",
    body: [
      "Register and apply online, and pay the fee",
      "Book a verification slot on KEA's website",
      "Appear on the booked date with every original and two sets of photocopies, as claimed in your application",
    ].join("\n"),
    notes: [
      "Do not bring laminated mark cards or certificates — KEA will not verify them.",
      "Candidates who claimed Clause 'a' or 'y' need not appear, unless they claimed NRI ward or religious minority reservation.",
      "KEA's information bulletin holds the full list of documents; read it before your slot.",
    ].join("\n"),
    checked: CHECKED,
  },
];
