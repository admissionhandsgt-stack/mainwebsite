import React from "react";
export const revalidate = 0;
import { Metadata } from "next";
import dynamic from "next/dynamic";
import { mbbsData } from "@/data/mbbs-india";
import { MBBSHero } from "@/components/mbbs-india/MBBSHero";
import { QuickOverview } from "@/components/mbbs-india/QuickOverview";
import { StickyDecisionBar } from "@/components/mbbs-india/StickyDecisionBar";
import { getMediaAsset, getSections, resolveMetadata } from '@/lib/content';
import { getMbbsContent } from '@/lib/pageContent';

// Lazy load sections for better performance
const EligibilityInfo = dynamic(() => import("@/components/mbbs-india/EligibilityCutoff").then(mod => mod.MBBSEligibilityInfo));
const AdmissionProcess = dynamic(() => import("@/components/mbbs-india/AdmissionProcess").then(mod => mod.AdmissionProcess));
const CounsellingSystem = dynamic(() => import("@/components/mbbs-india/CounsellingSystem").then(mod => mod.CounsellingSystem));
const SeatDistribution = dynamic(() => import("@/components/mbbs-india/SeatDistribution").then(mod => mod.SeatDistribution));
const FeesStructure = dynamic(() => import("@/components/mbbs-india/FeesStructure").then(mod => mod.FeesStructure));
const CollegeSelectionGuide = dynamic(() => import("@/components/mbbs-india/CollegeSelectionGuide").then(mod => mod.CollegeSelectionGuide));
const MBBSWhyUs = dynamic(() => import("@/components/mbbs-india/MBBSWhyUs").then(mod => mod.MBBSWhyUs));
const GlobalDisclaimer = dynamic(() => import("@/components/mbbs-india/GlobalDisclaimer").then(mod => mod.GlobalDisclaimer));

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata('/mbbs-india', {
    title: "MBBS Admission in India 2026 | Eligibility, Fees & Counselling Guide",
    description: "Complete guide to MBBS admissions in India. Get expert advice on NEET cutoffs, fee structures, and the counseling process for 2026.",
    keywords: (["MBBS India", "NEET UG Counselling", "Medical Admission India", "MBBS Fees", "Medical College Guide"]).join(', '),
  });
}

export default async function MBBSIndiaPage() {
  const [mbbsHeroAsset, sections, data] = await Promise.all([
    getMediaAsset('mbbs_hero_campus'),
    getSections('mbbs'),
    // The CMS layered over the shipped copy — see src/lib/pageContent.ts.
    getMbbsContent(),
  ]);
  // JSON-LD FAQ Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": data.faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <main className="min-h-screen bg-white">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero (Critical Path) */}
      {sections.shows('hero') && <MBBSHero backgroundImageUrl={mbbsHeroAsset?.image_url} data={data} />}

      {/* Sticky Conversion Element */}
      <StickyDecisionBar />

      {/* Order and visibility come from the admin (Page Content -> Page layout). */}
      <div className="space-y-0">
        {sections
          .sort([
            { key: 'overview', node: <QuickOverview data={data} /> },
            { key: 'eligibility', node: <EligibilityInfo data={data} /> },
            { key: 'process', node: <AdmissionProcess data={data} /> },
            { key: 'counselling', node: <CounsellingSystem data={data} /> },
            { key: 'seats', node: <SeatDistribution data={data} /> },
            { key: 'fees', node: <FeesStructure data={data} /> },
            { key: 'selection_guide', node: <CollegeSelectionGuide data={data} /> },
            { key: 'why_us', node: <MBBSWhyUs data={data} /> },
            { key: 'disclaimer', node: <GlobalDisclaimer data={data} /> },
          ])
          .filter((section) => sections.shows(section.key))
          .map((section) => (
            <React.Fragment key={section.key}>{section.node}</React.Fragment>
          ))}
      </div>
    </main>
  );
}
