/**
 * The fourteen documents counselling asks for.
 *
 * Dependency-free on purpose: both the student's checklist and the admin's
 * review screen are client components, and `lib/documents.ts` reads the
 * filesystem. Importing that from a browser bundle is the `Can't resolve 'net'`
 * failure this codebase has hit twice.
 *
 * The list follows the order the team already publishes, so a student holding
 * the printed checklist can work down the screen without hunting.
 */

export interface DocumentType {
  slug: string;
  label: string;
  /** What it actually is, when the label alone is ambiguous. */
  hint?: string;
  /** Not everyone needs it — the checklist says so rather than marking it missing. */
  optional?: boolean;
  group: "Exam & counselling" | "Identity" | "Academic" | "Category & quota";
}

export const DOCUMENT_TYPES: DocumentType[] = [
  {
    slug: "admit-card",
    label: "NEET PG admit card",
    group: "Exam & counselling",
  },
  {
    slug: "result-rank-letter",
    label: "Result / rank letter",
    hint: "The scorecard NBEMS issued, showing your rank.",
    group: "Exam & counselling",
  },
  {
    slug: "registration-slip",
    label: "Counselling registration slip",
    hint: "From MCC or your state portal, after you register.",
    group: "Exam & counselling",
  },
  {
    slug: "allotment-letter",
    label: "Seat allotment letter",
    hint: "Only once a round has allotted you a seat.",
    optional: true,
    group: "Exam & counselling",
  },
  {
    slug: "photo-id",
    label: "Valid photo ID",
    hint: "Aadhaar, passport, PAN, voter ID or driving licence.",
    group: "Identity",
  },
  {
    slug: "photographs",
    label: "Passport-size photographs",
    hint: "The same photograph used on your application.",
    group: "Identity",
  },
  {
    slug: "class-10",
    label: "Class 10 certificate",
    hint: "Proof of date of birth.",
    group: "Identity",
  },
  {
    slug: "mbbs-degree",
    label: "MBBS degree or provisional certificate",
    group: "Academic",
  },
  {
    slug: "mbbs-marksheets",
    label: "MBBS marksheets",
    hint: "All professional years, in one file if you can.",
    group: "Academic",
  },
  {
    slug: "internship-certificate",
    label: "Internship completion certificate",
    group: "Academic",
  },
  {
    slug: "medical-registration",
    label: "NMC / state medical council registration",
    hint: "Permanent or provisional.",
    group: "Academic",
  },
  {
    slug: "category-certificate",
    label: "Category certificate",
    hint: "SC, ST, OBC-NCL or EWS — in the format the authority prescribes.",
    optional: true,
    group: "Category & quota",
  },
  {
    slug: "pwbd-nri",
    label: "PwBD or NRI documents",
    hint: "PwBD certificate from a designated centre, or NRI proof.",
    optional: true,
    group: "Category & quota",
  },
  {
    slug: "domicile",
    label: "Domicile certificate",
    hint: "Needed for state counselling, not for All India Quota.",
    optional: true,
    group: "Category & quota",
  },
];

export const DOCUMENT_GROUPS = [
  "Exam & counselling",
  "Identity",
  "Academic",
  "Category & quota",
] as const;

export function documentType(slug: string): DocumentType | undefined {
  return DOCUMENT_TYPES.find((d) => d.slug === slug);
}

/** How many are expected of everybody, ignoring the conditional ones. */
export const REQUIRED_COUNT = DOCUMENT_TYPES.filter((d) => !d.optional).length;
