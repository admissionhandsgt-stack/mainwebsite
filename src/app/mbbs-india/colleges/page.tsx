import { Metadata } from "next";
import CollegesPageClient from "@/components/mbbs/CollegesPageClient";
import { supabase } from "@/integrations/supabase/client";
import { getMediaAsset } from "@/lib/mediaService";

export const metadata: Metadata = {
  title: "MBBS Colleges in India 2026 | Government & Private Medical Colleges",
  description:
    "Complete list of all NMC-recognized MBBS colleges in India. Browse government and private medical colleges state-wise. NEET-based admissions guide for 2026.",
  keywords: [
    "MBBS colleges India",
    "government medical colleges",
    "private medical colleges",
    "NEET UG colleges",
    "medical college list India",
  ],
};

export const dynamic = "force-dynamic";

export default async function CollegesPage() {
  // Fetch hero images server-side
  const heroKeys = ['college_aiims', 'college_campus_1', 'college_campus_2', 'college_campus_3'];
  const heroImages: string[] = [];
  try {
    for (const key of heroKeys) {
      const asset = await getMediaAsset(key);
      if (asset?.image_url) heroImages.push(asset.image_url);
    }
  } catch (e) {
    console.error("Error fetching colleges hero assets:", e);
  }

  try {
    const { data: statesRaw, error: statesError } = await supabase
      .from('mbbs_states')
      .select('name, slug, is_active')
      .eq('is_active', true)
      .order('name');

    if (statesError) throw statesError;

    const { data: collegesRaw, error: collegesError } = await supabase
      .from('ug_all_colleges')
      .select('name:college_name, city, type:college_type, state, intake, established_year, university_name')
      .eq('is_active', true)
      .not('college_type', 'ilike', '%deemed%');

    if (collegesError) throw collegesError;

    const statesData = statesRaw ? statesRaw.map((s) => {
      const stateColleges = collegesRaw ? collegesRaw.filter(c => c.state === s.name) : [];
      const govtCount = stateColleges.filter(c => c.type === 'Government').length;
      const privCount = stateColleges.filter(c => c.type !== 'Government').length;
      
      return {
        name: s.name,
        slug: s.slug,
        govtColleges: govtCount,
        privateColleges: privCount,
        colleges: stateColleges.map(c => ({
          name: c.name,
          city: c.city || "",
          type: (c.type === 'Government' ? 'govt' : 'private') as "govt" | "private",
          intake: c.intake,
          establishedYear: c.established_year,
          universityName: c.university_name || ""
        })).sort((a, b) => a.name.localeCompare(b.name))
      };
    }).filter(s => s.colleges.length > 0) : [];

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "MBBS Colleges in India",
      description: metadata.description,
      publisher: {
        "@type": "Organization",
        name: "AdmissionHands",
      },
    };

    return (
      <main className="min-h-screen bg-background text-foreground transition-colors duration-200">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {statesData.length === 0 ? (
          <div className="container-custom py-20 text-center text-zinc-500 font-bold">
            No colleges available at the moment. Please check back later.
          </div>
        ) : (
          <CollegesPageClient states={statesData} heroImages={heroImages} />
        )}
      </main>
    );
  } catch (err) {
    console.error("Exception fetching colleges:", err);
    return (
      <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-background">
        <p className="text-xl font-bold">An unexpected error occurred while loading data.</p>
      </div>
    );
  }
}
