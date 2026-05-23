import { Metadata } from "next";
import CollegesPageClient from "@/components/mbbs/CollegesPageClient";
import { supabase } from "@/integrations/supabase/client";

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
  try {
    const { data: statesRaw, error: statesError } = await supabase
      .from('mbbs_states')
      .select('name, slug, is_active')
      .eq('is_active', true)
      .order('name');

    if (statesError) throw statesError;

    const { data: collegesRaw, error: collegesError } = await supabase
      .from('ug_colleges')
      .select('name:college_name, city, type:college_type, state')
      .eq('is_active', true);

    if (collegesError) throw collegesError;

    const statesData = statesRaw ? statesRaw.map((s) => {
      const stateColleges = collegesRaw ? collegesRaw.filter(c => c.state === s.name) : [];
      const govtCount = stateColleges.filter(c => c.type === 'Government').length;
      const privCount = stateColleges.filter(c => c.type === 'Private').length;
      
      return {
        name: s.name,
        slug: s.slug,
        govtColleges: govtCount,
        privateColleges: privCount,
        colleges: stateColleges.map(c => ({
          name: c.name,
          city: c.city,
          type: (c.type === 'Government' ? 'govt' : 'private') as "govt" | "private"
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
      <main className="min-h-screen bg-slate-50 pt-[72px]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-500/10 blur-[100px] pointer-events-none" />
          <div className="container-custom px-4 py-12 md:py-16 relative z-10 text-center max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
              MBBS Colleges in <span className="text-blue-400">India</span>
            </h1>
            <p className="text-sm md:text-lg text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
              Explore NMC-recognized government and private medical colleges state-wise. Plan your NEET counselling strategy with accurate seat data.
            </p>
          </div>
        </div>

        {statesData.length === 0 ? (
          <div className="container-custom py-20 text-center text-slate-500 font-bold">
            No colleges available at the moment. Please check back later.
          </div>
        ) : (
          <CollegesPageClient states={statesData} />
        )}
      </main>
    );
  } catch (err) {
    console.error("Exception fetching colleges:", err);
    return (
      <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <p className="text-xl font-bold">An unexpected error occurred while loading data.</p>
      </div>
    );
  }
}
