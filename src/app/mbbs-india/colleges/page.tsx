import { Metadata } from "next";
import CollegesPageClient from "@/components/mbbs/CollegesPageClient";
import { getMbbsStates, getUgColleges, getMediaAssets, resolveMetadata } from '@/lib/content';

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata('/mbbs-india/colleges', {
    title: "MBBS Colleges in India 2026 | Government & Private Medical Colleges",
    description: "Complete list of all NMC-recognized MBBS colleges in India. Browse government and private medical colleges state-wise. NEET-based admissions guide for 2026.",
    keywords: ([
    "MBBS colleges India",
    "government medical colleges",
    "private medical colleges",
    "NEET UG colleges",
    "medical college list India",
  ]).join(', '),
  });
}


/**
 * The college list changes when someone runs the import or edits a row in the
 * admin — not between page views. Rebuilding all 1,727 rows on every request
 * cost seconds for data that is identical each time, so the page is cached for
 * ten minutes. Copy that the admin edits often lives on other pages, which
 * stay per-request fresh.
 */
export const revalidate = 600;

export default async function CollegesPage() {
  // Fetch hero images server-side
  const heroKeys = ['college_aiims', 'college_campus_1', 'college_campus_2', 'college_campus_3'];

  try {
    // One round trip for the images and one each for the lists, all in
    // parallel. Fetching the four hero images one at a time in a loop was
    // costing four sequential trips through the tunnel on every request.
    const [mediaList, statesRaw, collegesRaw] = await Promise.all([
      getMediaAssets(),
      getMbbsStates(),
      getUgColleges(),
    ]);

    const byKey = new Map(mediaList.map((m) => [m.media_key, m.image_url]));
    const heroImages = heroKeys
      .map((k) => byKey.get(k))
      .filter((u): u is string => Boolean(u) && u !== 'none');

    // Deemed universities have their own page, so they are excluded here.
    const colleges = collegesRaw.filter(
      (c) => !(c.collegeType ?? '').toLowerCase().includes('deemed'),
    );

    const byState = new Map<string, typeof colleges>();
    for (const c of colleges) {
      if (!c.state) continue;
      const list = byState.get(c.state);
      if (list) list.push(c);
      else byState.set(c.state, [c]);
    }

    // Every state the colleges actually sit in, not only the ones with a CMS
    // page — otherwise a state with colleges but no CMS row disappears.
    const cmsState = new Map((statesRaw ?? []).map((st) => [st.name, st]));
    const stateNames = Array.from(
      new Set([...Array.from(byState.keys()), ...(statesRaw ?? []).map((st) => st.name)]),
    ).sort();

    const isGovernment = (t: string | null) => {
      const v = (t ?? '').toLowerCase();
      return v.includes('govt') || v.includes('government') || v === 'central' || v === 'aiims';
    };

    const statesData = stateNames
      .map((name) => {
        const stateColleges = byState.get(name) ?? [];
        const cms = cmsState.get(name);
        return {
          name,
          slug: cms?.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          govtColleges: stateColleges.filter((c) => isGovernment(c.collegeType)).length,
          // Only colleges we actually know are private. Counting the unknown
          // ones here is how every uncurated government college ended up
          // tallied as private.
          privateColleges: stateColleges.filter(
            (c) => c.collegeType != null && !isGovernment(c.collegeType),
          ).length,
          // Only what the cards render. `imageUrl` is null for all 1,727 —
          // the CMS table has no images — and the order is already applied
          // above, so neither is worth sending 1,727 times.
          colleges: stateColleges.map((c) => ({
            slug: c.slug,
            name: c.name,
            city: c.city ?? '',
            type: (c.collegeType == null
              ? 'unknown'
              : isGovernment(c.collegeType)
                ? 'govt'
                : 'private') as 'govt' | 'private' | 'unknown',
            intake: c.intake,
            establishedYear: c.establishedYear,
            universityName: c.universityName ?? '',
          })),
        };
      })
      .filter((s) => s.colleges.length > 0);

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "MBBS Colleges in India",
      // The JSON-LD describes the page as built, so it uses the shipped copy
      // rather than whatever the admin may have overridden in the meta tag.
      description:
        "Complete list of all NMC-recognized MBBS colleges in India. Browse government and private medical colleges state-wise. NEET-based admissions guide for 2026.",
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
