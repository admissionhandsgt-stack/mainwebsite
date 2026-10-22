import React from "react";
export const revalidate = 0;
import { Metadata } from "next";
import dynamic from "next/dynamic";
import { mbbsData } from "@/data/mbbs-india";
import { MBBSHero } from "@/components/mbbs-india/MBBSHero";
import { QuickOverview } from "@/components/mbbs-india/QuickOverview";
import { StickyDecisionBar } from "@/components/mbbs-india/StickyDecisionBar";
import { getMediaAsset, getMbbsStates, getSections, resolveMetadata } from '@/lib/content';
import StructuredData, { breadcrumb } from '@/components/seo/StructuredData';
import { StatesIndex } from '@/components/mbbs-india/StatesIndex';
import { creditOf } from '@/components/ui/PhotoCredit';
import { getMbbsContent } from '@/lib/pageContent';
import { pageCopy } from '@/lib/pageCopy';
import { CounsellingAndSeats } from '@/components/mbbs-india/CounsellingAndSeats';
import { CollegeSelectionGuide } from '@/components/mbbs-india/CollegeSelectionGuide';
import TelegramJoin from '@/components/engage/TelegramJoin';

// Lazy load sections for better performance
const EligibilityInfo = dynamic(() => import("@/components/mbbs-india/EligibilityCutoff").then(mod => mod.MBBSEligibilityInfo));
const AdmissionProcess = dynamic(() => import("@/components/mbbs-india/AdmissionProcess").then(mod => mod.AdmissionProcess));
const FeesStructure = dynamic(() => import("@/components/mbbs-india/FeesStructure").then(mod => mod.FeesStructure));
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
  const [mbbsHeroAsset, sections, data, states, counsellingCopy, whyCopy] = await Promise.all([
    getMediaAsset('mbbs_hero_campus'),
    getSections('mbbs'),
    // The CMS layered over the shipped copy — see src/lib/pageContent.ts.
    getMbbsContent(),
    getMbbsStates(),
    pageCopy('page.mbbs.counselling'),
    pageCopy('page.mbbs.why'),
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
      <StructuredData data={breadcrumb([{ name: "Home", path: "/" }, { name: "MBBS in India", path: "/mbbs-india" }])} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero (Critical Path) */}
      {sections.shows('hero') && <MBBSHero backgroundImageUrl={mbbsHeroAsset?.image_url} credit={creditOf(mbbsHeroAsset)} data={data} />}

      {/* Sticky Conversion Element */}
      <StickyDecisionBar />

      {/* Order and visibility come from the admin (Page Content -> Page layout). */}
      <div className="space-y-0">
        {sections
          .sort([
            { key: 'overview', node: <QuickOverview data={data} /> },
            { key: 'eligibility', node: <EligibilityInfo data={data} /> },
            { key: 'process', node: <AdmissionProcess data={data} /> },
            // One section for the counselling categories and the seat matrix (2026-10-21); each half
            // still follows its own row, and stands alone when the other is switched off.
            {
              key: 'counselling',
              node: <CounsellingAndSeats data={data} copy={counsellingCopy} seats={sections.shows('seats')} />,
            },
            {
              key: 'seats',
              node: sections.shows('counselling') ? null : <CounsellingAndSeats data={data} copy={counsellingCopy} counselling={false} />,
            },
            { key: 'fees', node: <FeesStructure data={data} /> },
            // "Why students trust us" sits under the four phases when both rows are on.
            {
              key: 'selection_guide',
              node: <CollegeSelectionGuide data={data} why={sections.shows('why_us') ? whyCopy : null} />,
            },
            { key: 'states', node: <StatesIndex states={states} /> },
            { key: 'telegram', node: <TelegramJoin placement="mbbs_overview" /> },
            {
              key: 'why_us',
              node: sections.shows('selection_guide') ? null : <CollegeSelectionGuide data={data} why={whyCopy} phases={false} />,
            },
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
