/**
 * MCC's course labels → our course names (2026-10-20). No imports: the import script and
 * pages both use it.
 *
 * MCC writes one course four ways — "M.D. Radio-Diagnosis /Radiology" in the seat
 * matrix, "M.D. (RADIO-DIAGNOSIS)" in the results, "(NBEMS) RADIO DIAGNOSIS" for DNB, and
 * PDF line wraps inside words ("ANAESTHESIOLO GY"). So the label is reduced to its letters,
 * the programme read from its prefix and the subject from keywords, and the pair looked up
 * in the list of our 101 PG course names. A label nothing matches returns null and keeps
 * MCC's own words (Diploma in Bacteriology has no page of ours).
 */

type Programme = "md" | "ms" | "mch" | "diploma" | "dnb" | "nbe-diploma";

const letters = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");

function programmeOf(raw: string, k: string): Programme | null {
  if (k.startsWith("NBEMSDIPLOMA")) return "nbe-diploma";
  if (k.startsWith("NBEMS")) return "dnb";
  if (k.startsWith("MCH")) return "mch";
  if (/^(PG)?DIP/.test(k) || /\(D\.\s*D\.\s*V\.\s*L\.\)/i.test(raw)) return "diploma";
  if (k.startsWith("MPH")) return "md";
  if (k.startsWith("MS")) return "ms";
  // "M.D. (Obst. and Gynae)/MS (Obstetrics and Gynaecology)" is MS by our naming.
  if (k.startsWith("MD")) return /OBST|GYNAE/.test(k) ? "ms" : "md";
  return null;
}

/** Ordered: the first pattern a label contains wins, so the specific ones come first. */
const SUBJECTS: [RegExp, string][] = [
  [/PAEDIATRICSURGERY/, "paedsurgery"],
  [/CARDIO/, "ctvs"],
  [/PLASTIC/, "plastic"],
  [/NEURO/, "neurosurgery"],
  [/COMMUNITYHEALTH/, "cha"],
  [/PREVENTIVE|COMMUNITYMEDICINE/, "psm"],
  [/IMMUNO|TRANSFUSION/, "ihbt"],
  [/CLINICALPATHOLOGY/, "clinpath"],
  [/ANAESTHES/, "anaesthesia"],
  [/ANATOMY/, "anatomy"],
  [/BIOCHEM/, "biochemistry"],
  [/DERM/, "derma"],
  [/EMERGENCY/, "emergency"],
  [/FAMILY/, "family"],
  [/FORENSIC/, "forensic"],
  [/GENERALMEDICINE/, "medicine"],
  [/GENERALSURGERY/, "surgery"],
  [/GERIATRIC/, "geriatrics"],
  [/HOSPITALADMIN|HEALTHADMIN/, "admin"],
  [/MICROBIO/, "microbiology"],
  [/NUCLEAR/, "nuclear"],
  [/OBST|GYNAE/, "obg"],
  [/OPHTHAL/, "ophthalmology"],
  [/ORTHO/, "ortho"],
  [/OTORHINO|LARYNG|ENT$/, "ent"],
  [/PAEDIATRIC|CHILDHEALTH/, "paediatrics"],
  [/PALLIATIVE/, "palliative"],
  [/PATHOLOGY/, "pathology"],
  [/PHARMACOLOGY/, "pharmacology"],
  [/PHYSICALMED|PHYMED|REHAB/, "pmr"],
  [/PHYSIOLOGY/, "physiology"],
  [/PSYCHIATR|PSYCHOLOGICAL/, "psychiatry"],
  [/RADIATIONONCOLOGY|RADIOTHERAPY/, "radiotherapy"],
  [/RADIATIONMEDICINE/, "radiationmedicine"],
  [/RADIODIAGNOSIS|RADIOLOGY/, "radiodiagnosis"],
  [/RESPIRATORY|TUBERCULOSIS|CHEST/, "respiratory"],
  [/SPORT/, "sports"],
  [/TROPICAL/, "tropical"],
  [/AEROSPACE|AVIATION/, "aviation"],
  [/LABORATORY/, "lab"],
  [/EPIDEMIOLOGY/, "mph"],
  [/PUBLICHEALTH/, "publichealth"],
  [/DIABETOLOGY/, "diabetology"],
  [/TRAUMATOLOGY/, "trauma"],
];

/** (programme, subject) → our course name, exactly as `courses.name` spells it. */
const OURS: Record<string, string> = {
  "md anaesthesia": "MD Anaesthesiology",
  "md anatomy": "MD Anatomy",
  "md biochemistry": "MD Bio-Chemistry",
  "md psm": "MD Social & Preventive Medicine",
  "md cha": "MD Community Health Administration",
  "md derma": "MD Dermatology, Venereology & Leprosy",
  "md emergency": "MD Emergency Medicine",
  "md family": "MD Family Medicine",
  "md forensic": "MD Forensic Medicine",
  "md medicine": "MD General Medicine",
  "md geriatrics": "MD Geriatrics",
  "md admin": "MD Hospital Administration",
  "md ihbt": "MD Immuno Haematology & Blood Transfusion",
  "md lab": "MD Lab Medicine",
  "md mph": "Master of Public Health (Epidemiology)",
  "md microbiology": "MD Microbiology",
  "md nuclear": "MD Nuclear Medicine",
  "md paediatrics": "MD Paediatrics",
  "md palliative": "MD Palliative Medicine",
  "md pathology": "MD Pathology",
  "md pharmacology": "MD Pharmacology",
  "md pmr": "MD Physical Medicine & Rehabilitation",
  "md physiology": "MD Physiology",
  "md psychiatry": "MD Psychiatry",
  "md radiotherapy": "MD Radiation Oncology",
  "md radiodiagnosis": "MD Radio Diagnosis",
  "md respiratory": "MD Tuberculosis & Respiratory Diseases",
  "md sports": "MD Sports Medicine",
  "md tropical": "MD Tropical Medicine",
  "md aviation": "MD Aviation Medicine/Aerospace Medicine",
  "ms surgery": "MS General Surgery",
  "ms obg": "MS Obstetrics & Gynaecology",
  "ms ophthalmology": "MS Ophthalmology",
  "ms ortho": "MS Orthopaedics",
  "ms ent": "MS ENT",
  "ms trauma": "MS Traumatology and Surgery",
  // "MD/MS (Anatomy)" reads as MS by its prefix; Anatomy is an MD subject.
  "ms anatomy": "MD Anatomy",
  "mch neurosurgery": "MCh Neurosurgery (6 years)",
  "diploma anaesthesia": "Diploma in Anaesthesia",
  "diploma clinpath": "Diploma in Clinical Pathology",
  "diploma psm": "Diploma in Community Medicine",
  "diploma derma": "Diploma in Dermatology, Venereology and Leprosy",
  "diploma diabetology": "Diploma in Diabetology",
  "diploma emergency": "Diploma in Emergency Medicine-NBE",
  "diploma forensic": "Diploma in Forensic Medicine",
  "diploma admin": "Diploma in Health Administration",
  "diploma ihbt": "Diploma in Immuno-Haematology and Blood Transfusion",
  "diploma obg": "Diploma in Obstetrics & Gynaecology",
  "diploma ophthalmology": "Diploma in Ophthalmology",
  "diploma ortho": "Diploma in Orthopaedics",
  "diploma ent": "Diploma in Oto-Rhino-Laryngology",
  "diploma paediatrics": "Diploma in Child Health",
  "diploma pmr": "Diploma in Physical Medicine & Rehabilitation",
  "diploma psychiatry": "Diploma in Psychological Medicine",
  "diploma publichealth": "Diploma in Public Health",
  "diploma radiationmedicine": "Diploma in Radiation Medicine",
  "diploma radiodiagnosis": "Diploma in Radio-Diagnosis",
  "diploma radiotherapy": "Diploma in Radio Therapy",
  "diploma sports": "Diploma in Sports Medicine",
  "diploma respiratory": "Diploma in Tuberculosis & Chest Diseases",
  "dnb anaesthesia": "DNB Anaesthesiology",
  "dnb anatomy": "DNB Anatomy",
  "dnb biochemistry": "DNB Biochemistry",
  "dnb ctvs": "DNB Cardio Thoracic Surgery (6 years)",
  "dnb psm": "DNB Social & Preventive Medicine",
  "dnb derma": "DNB Dermatology & Venereology",
  "dnb emergency": "DNB Emergency Medicine",
  "dnb family": "DNB Family Medicine",
  "dnb forensic": "DNB Forensic Medicine",
  "dnb medicine": "DNB General Medicine",
  "dnb surgery": "DNB General Surgery",
  "dnb geriatrics": "DNB Geriatric Medicine",
  "dnb admin": "DNB Health Administration including Hospital Administration",
  "dnb ihbt": "DNB Immuno Hematology & Transfusion Medicine",
  "dnb microbiology": "DNB Microbiology",
  "dnb neurosurgery": "DNB Neuro Surgery (6 years)",
  "dnb nuclear": "DNB Nuclear Medicine",
  "dnb obg": "DNB Obstetrics & Gynaecology",
  "dnb ophthalmology": "DNB Ophthalmology",
  "dnb ortho": "DNB Orthopedics Surgery",
  "dnb ent": "DNB ENT",
  "dnb paedsurgery": "DNB Paediatric Surgery (6 years)",
  "dnb paediatrics": "DNB Paediatrics",
  "dnb palliative": "DNB Palliative Medicine",
  "dnb pathology": "DNB Pathology",
  "dnb pharmacology": "DNB Pharmacology",
  "dnb pmr": "DNB Physical Medicine & Rehabilitation",
  "dnb physiology": "DNB Physiology",
  "dnb plastic": "DNB Plastic Surgery (6 years)",
  "dnb psychiatry": "DNB Psychiatry",
  "dnb radiotherapy": "DNB Radio Therapy",
  "dnb radiodiagnosis": "DNB Radio Diagnosis",
  "dnb respiratory": "DNB Respiratory Diseases",
  "nbe-diploma anaesthesia": "Diploma in Anaesthesia-NBE",
  "nbe-diploma emergency": "Diploma in Emergency Medicine-NBE",
  "nbe-diploma ent": "Diploma in Oto-Rhino-Laryngology-NBE",
  "nbe-diploma family": "Diploma in Family Medicine-NBE",
  "nbe-diploma obg": "Diploma in Obstetrics & Gynaecology-NBE",
  "nbe-diploma ophthalmology": "Diploma in Ophthalmology-NBE",
  "nbe-diploma paediatrics": "Diploma in Child Health-NBE",
  "nbe-diploma radiodiagnosis": "Diploma in Radio-Diagnosis-NBE",
  "nbe-diploma respiratory": "Diploma in Tuberculosis & Chest Diseases-NBE",
};

/** Our course name for an MCC label, or null when we have no such course. */
export function ourCourseFor(mccLabel: string): string | null {
  const k = letters(mccLabel);
  const programme = programmeOf(mccLabel, k);
  if (!programme) return null;
  // The subject is read after the programme's own letters, so "DIPLOMA" never matches "DIP…" subjects.
  const body = k.replace(/^(NBEMSDIPLOMA|NBEMS|PGDIPLOMAIN|DIPLOMAIN|DIPIN|DIPLOMA|DIP|MCH|MDMS|MPH|MD|MS)/, "");
  const subject = SUBJECTS.find(([re]) => re.test(body))?.[1];
  if (!subject) return null;
  return OURS[`${programme} ${subject}`] ?? null;
}

/** "MD" | "MS" | "Diploma" | "DNB" | "M.Ch." — for grouping a college's seats on a page. */
export function programmeLabel(courseName: string): string {
  if (/^MCh/.test(courseName)) return "M.Ch.";
  if (/^DNB/.test(courseName)) return "DNB";
  if (/^Diploma/.test(courseName)) return /-NBE$/.test(courseName) ? "DNB Diploma" : "Diploma";
  if (/^MS /.test(courseName)) return "MS";
  return "MD";
}
