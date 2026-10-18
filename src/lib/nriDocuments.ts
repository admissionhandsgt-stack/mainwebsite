/**
 * The NRI-quota document checklist as shipped (2026-10-18) — the fallback for
 * the admin's `nri_documents` collection (Admin → Content → Sections & lists),
 * which is where the team updates it each cycle.
 *
 * From MCC's 2025 notices: the NEET UG round notices of July and September 2025
 * and the NEET PG 2025 information bulletin (as reported by Careers360 on 25 July,
 * 2 September and 17 October 2025). Each item says what MCC listed — nothing is
 * added from memory. No imports: the seed script reads this file too.
 */

export interface NriDocument {
  /** The document, as MCC names it. */
  title: string;
  /** The group it sits in on the page. */
  group: string;
  /** What it has to show, or who issues it. */
  body: string;
}

export const NRI_DOCUMENT_GROUPS = ["Proof of NRI status", "If a relative sponsors you", "Exam, school and identity"];

export const NRI_DOCUMENTS: NriDocument[] = [
  {
    title: "NRI certificate from the Indian embassy or consulate",
    group: "Proof of NRI status",
    body: "Issued by the Indian mission in the country where the NRI parent or relative lives. MCC sends NRI proofs to the mission for verification.",
  },
  {
    title: "Passport of the NRI parent or relative, with visa or residence permit",
    group: "Proof of NRI status",
    body: "A valid passport and the visa, residence permit or work permit for the country of residence.",
  },
  {
    title: "OCI or PIO card",
    group: "Proof of NRI status",
    body: "Only if you are an Overseas Citizen of India or a Person of Indian Origin.",
  },
  {
    title: "Self-attested declaration in MCC's format",
    group: "Proof of NRI status",
    body: "That you are an NRI, OCI or PIO, or the child of NRI parents. The format is published on mcc.nic.in.",
  },
  {
    title: "Relationship certificate with a family tree",
    group: "If a relative sponsors you",
    body: "Issued by the competent revenue authority, showing exactly how the NRI relative is related to you.",
  },
  {
    title: "Notarised sponsorship affidavit",
    group: "If a relative sponsors you",
    body: "The NRI relative undertakes to pay your whole course fee and living expenses.",
  },
  {
    title: "NRE bank account passbook of the sponsor",
    group: "If a relative sponsors you",
    body: "The proof behind the affidavit: the sponsor's NRE account.",
  },
  {
    title: "NEET admit card and scorecard",
    group: "Exam, school and identity",
    body: "Of the exam you are counselling for — NEET UG for MBBS and BDS, NEET PG for MD/MS.",
  },
  {
    title: "Class 10 and Class 12 marksheets and certificates",
    group: "Exam, school and identity",
    body: "As issued by your board.",
  },
  {
    title: "Birth certificate",
    group: "Exam, school and identity",
    body: "Listed by MCC for every NRI-quota candidate.",
  },
  {
    title: "Your passport or your sponsor's (optional)",
    group: "Exam, school and identity",
    body: "MCC lists it as optional.",
  },
];
