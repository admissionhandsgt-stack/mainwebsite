import { cache } from "react";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import type { HeroImage } from "@/lib/pageCopy";

/**
 * The picture for a PG branch page, from the admin's own branch list
 * (Admin → PG branches, table `pg_branches`, its `icon_url`). The counselling
 * data names 101 courses ("DNB Orthopedics Surgery", "Diploma in
 * Oto-Rhino-Laryngology"); the admin list names 26 specialties. Each course is
 * matched to its specialty by keyword below, so an image the admin adds to a
 * specialty reaches every MD, MS, DNB and diploma course of it at once.
 *
 * The pictures are scenes of a specialty at work, not of any named college, so
 * they carry no claim about where they were taken. Server only.
 */
const SPECIALTY: [RegExp, string][] = [
  [/paediatric surgery|pediatric surgery/i, "__none__"],
  [/general medicine|family medicine|tropical medicine/i, "General Medicine"],
  [/paediatric|pediatric|child health/i, "Pediatrics"],
  [/radio[- ]?diagnosis/i, "Radio-diagnosis"],
  [/dermatology/i, "Dermatology"],
  [/general surgery|traumatology/i, "General Surgery"],
  [/orthop/i, "Orthopedics"],
  [/obstetric/i, "Obstetrics & Gynae"],
  [/psychiatr|psychological/i, "Psychiatry"],
  [/\bENT\b|oto-?rhino/i, "E.N.T."],
  [/pathology|lab medicine/i, "Pathology"],
  [/respiratory|tuberculosis|chest|pulmonary/i, "Pulmonary Medicine"],
  [/anaesthe|anesthe/i, "Anesthesiology"],
  [/radiation oncology|radio ?therapy|radiation medicine/i, "Radiation Oncology"],
  [/emergency/i, "Emergency Medicine"],
  [/nuclear medicine/i, "Nuclear Medicine"],
  [/geriatric/i, "Geriatrics"],
  [/ophthalm/i, "Ophthalmology"],
  [/physical medicine/i, "Physical Med & Rehab"],
  [/microbiology/i, "Microbiology"],
  [/pharmacology/i, "Pharmacology"],
  [/community|preventive|public health/i, "Community Medicine"],
  [/forensic/i, "Forensic Medicine"],
  [/anatomy/i, "Anatomy"],
  [/physiology/i, "Physiology"],
  [/bio-?chemistry/i, "Biochemistry"],
  [/transfusion|haematology|hematology/i, "Transfusion Medicine"],
];

const specialtyImages = cache(async () => {
  try {
    const rows = (await db.execute(sql`
      SELECT branch_name, icon_url FROM pg_branches
       WHERE is_active = true AND icon_url IS NOT NULL AND icon_url <> ''
    `)) as unknown as { branch_name: string; icon_url: string }[];
    return new Map(rows.map((r) => [r.branch_name.toLowerCase(), r.icon_url]));
  } catch {
    return new Map<string, string>();
  }
});

/** The specialty a course belongs to, as the admin's branch list names it. */
export function specialtyOf(course: string): string | null {
  for (const [re, name] of SPECIALTY) if (re.test(course)) return name === "__none__" ? null : name;
  return null;
}

export async function branchImage(course: string): Promise<HeroImage | undefined> {
  const specialty = specialtyOf(course);
  if (!specialty) return undefined;
  const url = (await specialtyImages()).get(specialty.toLowerCase());
  if (!url) return undefined;
  return { url, alt: `${specialty} at work`, subject: null, attribution: null, license: null };
}
