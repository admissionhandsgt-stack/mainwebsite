/**
 * The curated homepage college list.
 *
 * Reads PostgreSQL through `content.ts`. Shape kept as it was so the homepage
 * and TopMedicalInstitutes need no change.
 */

import { getCuratedColleges } from "@/lib/content";

export interface CollegeData {
  college_name: string;
  state: string;
  intake: number;
  image_url: string;
  /** The credit that has to travel with the photograph. */
  image_attribution: string | null;
  image_license: string | null;
  college_type: string;
}

export type GroupedColleges = {
  Govt: CollegeData[];
  Private: CollegeData[];
  Deemed: CollegeData[];
};

export async function getRecommendedColleges(): Promise<GroupedColleges> {
  const grouped: GroupedColleges = { Govt: [], Private: [], Deemed: [] };
  const list = await getCuratedColleges("ugRecommended");

  for (const c of list) {
    const row: CollegeData = {
      college_name: c.collegeName,
      state: c.state ?? "",
      intake: c.intake ?? 0,
      image_url: c.imageUrl ?? "",
      image_attribution: c.imageAttribution,
      image_license: c.imageLicense,
      college_type: c.collegeType ?? "",
    };
    const type = (c.collegeType ?? "").toLowerCase();
    if (type === "government" || type === "govt") grouped.Govt.push(row);
    else if (type === "private") grouped.Private.push(row);
    else if (type === "deemed") grouped.Deemed.push(row);
  }

  return grouped;
}
