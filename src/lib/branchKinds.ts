/**
 * What kind of branch a PG course is, and the short names people type for it (2026-11-11). No imports, so both server
 * pages and client components can use it.
 *
 * The kinds follow NMC's own grouping of MD/MS subjects (first used on /neet-pg-statistics): pre-clinical, para-clinical,
 * and everything else on the MD/MS list clinical. The short names are what students type into a search box ("obg",
 * "ortho", "radio", "psm"), the same list the branch picker uses, read off a course's full name.
 */
export const PRE_CLINICAL = /anatomy|physiology|bio-?\s?chemistry|bio-?\s?physics/i;
export const PARA_CLINICAL =
  /patholog|micro-?\s?biolog|pharmacolog|forensic|community medicine|preventive|social|laborator|lab medicine|hospital administration|community health|public health|epidemiolog/i;

export type BranchKind = "clinical" | "para" | "pre";

export function branchKind(course: string): BranchKind {
  return PRE_CLINICAL.test(course) ? "pre" : PARA_CLINICAL.test(course) ? "para" : "clinical";
}

const SHORT: [RegExp, string][] = [
  [/radio ?-?diagnosis|radiology/i, "radiology radio rd imaging"],
  [/obstetric|gyna?e?colog/i, "obg obgy obgyn gynae gyne obs gynecology"],
  [/oto ?-?rhino|\bent\b/i, "ent"],
  [/orthop/i, "ortho orthopedics"],
  [/paediatric|pediatric/i, "peds paeds pediatrics paediatrics child"],
  [/dermatolog/i, "derma skin dvl"],
  [/an(a)?esthes/i, "anaes anesthesia anesthesiology anaesthesia"],
  [/psychiatr/i, "psych"],
  [/general medicine/i, "gm medicine"],
  [/general surgery/i, "gs surgery"],
  [/respiratory|tuberculosis|pulmonary/i, "chest tb pulmo pulmonary"],
  [/ophthalmolog/i, "eye ophthal opthal"],
  [/physical medicine/i, "pmr rehab"],
  [/community medicine|preventive/i, "psm spm"],
  [/emergency/i, "em casualty"],
  [/radiation oncology|radiotherapy/i, "radiotherapy oncology"],
  [/transfusion|immuno ?-?ha?ematology/i, "ihbt blood bank"],
  [/hospital administration/i, "mha"],
  [/forensic/i, "fmt"],
  [/patholog/i, "patho"],
  [/microbiolog/i, "micro"],
  [/pharmacolog/i, "pharma"],
  [/physiology/i, "physio"],
  [/anatomy/i, "anat"],
];

/** Extra words a search box should match for a course (empty when it has none). */
export function branchAliases(course: string): string {
  return SHORT.filter(([re]) => re.test(course))
    .map(([, words]) => words)
    .join(" ");
}
