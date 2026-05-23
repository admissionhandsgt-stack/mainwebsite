import React from "react";
import { Metadata } from "next";
import dynamic from "next/dynamic";
import { mbbsData } from "@/data/mbbs-india";
import { MBBSHero } from "@/components/mbbs-india/MBBSHero";
import { QuickOverview } from "@/components/mbbs-india/QuickOverview";
import { StickyDecisionBar } from "@/components/mbbs-india/StickyDecisionBar";

// Lazy load sections for better performance
const EligibilityInfo = dynamic(() => import("@/components/mbbs-india/EligibilityCutoff").then(mod => mod.MBBSEligibilityInfo));
const AdmissionProcess = dynamic(() => import("@/components/mbbs-india/AdmissionProcess").then(mod => mod.AdmissionProcess));
const CounsellingSystem = dynamic(() => import("@/components/mbbs-india/CounsellingSystem").then(mod => mod.CounsellingSystem));
const SeatDistribution = dynamic(() => import("@/components/mbbs-india/SeatDistribution").then(mod => mod.SeatDistribution));
const FeesStructure = dynamic(() => import("@/components/mbbs-india/FeesStructure").then(mod => mod.FeesStructure));
const CollegeSelectionGuide = dynamic(() => import("@/components/mbbs-india/CollegeSelectionGuide").then(mod => mod.CollegeSelectionGuide));
const MBBSWhyUs = dynamic(() => import("@/components/mbbs-india/MBBSWhyUs").then(mod => mod.MBBSWhyUs));
const GlobalDisclaimer = dynamic(() => import("@/components/mbbs-india/GlobalDisclaimer").then(mod => mod.GlobalDisclaimer));

export const metadata: Metadata = {
  title: "MBBS Admission in India 2026 | Eligibility, Fees & Counselling Guide",
  description: "Complete guide to MBBS admissions in India. Get expert advice on NEET cutoffs, fee structures, and the counseling process for 2026.",
  keywords: ["MBBS India", "NEET UG Counselling", "Medical Admission India", "MBBS Fees", "Medical College Guide"],
};

export default function MBBSIndiaPage() {
  // JSON-LD FAQ Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": mbbsData.faqs.map(faq => ({
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
      <MBBSHero />

      {/* Overview */}
      <QuickOverview />

      {/* Sticky Conversion Element */}
      <StickyDecisionBar />

      {/* Main Content Sections - Optimized Flow */}
      <div className="space-y-0">
        <EligibilityInfo />
        <AdmissionProcess />
        <CounsellingSystem />
        <SeatDistribution />
        <FeesStructure />
        <CollegeSelectionGuide />
        <MBBSWhyUs />
        <GlobalDisclaimer />
      </div>
    </main>
  );
}
