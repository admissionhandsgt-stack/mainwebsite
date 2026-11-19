/**
 * The NRI-quota document checklist as shipped — the fallback for the admin's `nri_documents` collection
 * (Admin → Content → Sections & lists), which is where the team updates it each cycle.
 *
 * Read on 19 Nov 2026 in MCC's own 2026 documents: the NEET UG Counselling 2026 Information Bulletin (1 Aug 2026,
 * chapter 3), the NEET UG 2026 Candidate User Guide (section 8) and the NEET PG Counselling 2026 Information Bulletin
 * (chapter 4). The earlier list (2026-10-18) came from news reports of MCC's 2025 notices: it called the candidate's
 * passport optional and listed a self-attested declaration that the 2026 lists do not have. No imports: the seed script
 * reads this file too.
 */

export interface NriDocument {
  /** The document, as MCC names it. */
  title: string;
  /** The group it sits in on the page. */
  group: string;
  /** What it has to show, or who issues it. */
  body: string;
}

export const NRI_DOCUMENT_GROUPS = ["Every NRI-quota candidate", "If you, a parent or a real brother or sister is the NRI", "If an NRI guardian sponsors you", "OCI candidates", "Foreign nationals"];

export const NRI_DOCUMENTS: NriDocument[] = [
  {
    title: "Date of birth certificate",
    group: "Every NRI-quota candidate",
    body: "Listed first by MCC in every category.",
  },
  {
    title: "Class 10 mark sheet and pass certificate",
    group: "Every NRI-quota candidate",
    body: "From a foreign board: the Association of Indian Universities' (AIU) equivalence certificate — for MD/MS, a certified transcript also counts.",
  },
  {
    title: "Class 12 mark sheet and pass certificate",
    group: "Every NRI-quota candidate",
    body: "The same rule for a foreign board.",
  },
  {
    title: "NEET score card",
    group: "Every NRI-quota candidate",
    body: "NEET UG's from NTA for MBBS and BDS; NEET PG's from NBEMS for MD/MS.",
  },
  {
    title: "Your valid passport",
    group: "Every NRI-quota candidate",
    body: "Required in every category in 2026 — a foreign national's foreign passport.",
  },
  {
    title: "MBBS mark sheets (MD/MS only)",
    group: "Every NRI-quota candidate",
    body: "1st, 2nd and 3rd professional examinations — and the FMGE score card if you studied MBBS abroad.",
  },
  {
    title: "NRI certificate from the Indian embassy or consulate",
    group: "If you, a parent or a real brother or sister is the NRI",
    body: "Issued by the competent authority in the country where the NRI lives.",
  },
  {
    title: "Notarised sponsorship affidavit",
    group: "If you, a parent or a real brother or sister is the NRI",
    body: "By the NRI parent, brother or sister: they will pay the whole course fee and your living costs during the course. For MD/MS, on ₹100 stamp paper.",
  },
  {
    title: "NRE bank account passbook of the sponsor",
    group: "If you, a parent or a real brother or sister is the NRI",
    body: "The proof behind the affidavit. For MD/MS an NRO passbook is also accepted.",
  },
  {
    title: "Relationship verified by a revenue officer",
    group: "If you, a parent or a real brother or sister is the NRI",
    body: "A Tehsildar or another government officer of the revenue department (for MD/MS, a Patwari too) confirms how the NRI is related to you.",
  },
  {
    title: "NRI certificate and passport of the guardian",
    group: "If an NRI guardian sponsors you",
    body: "The guardian's NRI certificate from the Indian embassy or consulate; for MBBS and BDS, the guardian's valid passport too.",
  },
  {
    title: "Proof of guardianship",
    group: "If an NRI guardian sponsors you",
    body: "The guardian must be your nearest NRI relation — a real uncle or aunt on either side, a grandparent or a first cousin — who has looked after you. MBBS/BDS: legal proof that they are your guardian under the Guardian and Wards Act 1890.",
  },
  {
    title: "Guardian's affidavit with evidence (MD/MS)",
    group: "If an NRI guardian sponsors you",
    body: "As candidates are adults, no court order is needed: a notarised affidavit on ₹100 stamp paper that they have cared for and supported you, with evidence such as fee receipts they paid, educational records and bank records.",
  },
  {
    title: "Guardian's sponsorship affidavit and NRE passbook",
    group: "If an NRI guardian sponsors you",
    body: "They will pay the whole course fee and your living costs during the course.",
  },
  {
    title: "OCI card",
    group: "OCI candidates",
    body: "For MBBS and BDS a PIO card is also accepted.",
  },
  {
    title: "Visa, residence permit or work permit",
    group: "Foreign nationals",
    body: "For MBBS and BDS. For MD/MS MCC asks for a citizenship certificate instead.",
  },
];
