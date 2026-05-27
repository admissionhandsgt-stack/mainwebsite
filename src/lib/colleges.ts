import { supabase } from "@/integrations/supabase/client";

export interface CollegeData {
  college_name: string;
  state: string;
  intake: number;
  image_url: string;
  college_type: string;
}

export type GroupedColleges = {
  Govt: CollegeData[];
  Private: CollegeData[];
  Deemed: CollegeData[];
};

export async function getRecommendedColleges(): Promise<GroupedColleges> {
  try {
    const { data, error } = await supabase
      .from("ug_recommended_colleges")
      .select("college_name, state, intake, image_url, college_type")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching recommended colleges:", error);
      return { Govt: [], Private: [], Deemed: [] };
    }

    const grouped: GroupedColleges = { Govt: [], Private: [], Deemed: [] };

    data?.forEach((college) => {
      const type = college.college_type?.toLowerCase() || '';
      if (type === "government" || type === "govt") {
        grouped.Govt.push(college as CollegeData);
      } else if (type === "private") {
        grouped.Private.push(college as CollegeData);
      } else if (type === "deemed") {
        grouped.Deemed.push(college as CollegeData);
      }
    });

    return grouped;
  } catch (error) {
    console.error("Unexpected error fetching recommended colleges:", error);
    return { Govt: [], Private: [], Deemed: [] };
  }
}
