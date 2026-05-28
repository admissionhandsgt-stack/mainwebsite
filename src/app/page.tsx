import React from "react";
export const revalidate = 0;

import dynamic from "next/dynamic";
import Hero from "@/components/Hero";
import SEO from "@/components/SEO";
import { getRecommendedColleges } from "@/lib/colleges";
import { getMediaAsset } from "@/lib/mediaService";

const ServicesList = dynamic(() => import('@/components/ServicesList'), { loading: () => <SectionLoader /> });
const HowItWorks = dynamic(() => import('@/components/home/HowItWorks'), { loading: () => <SectionLoader /> });
const DataInsights = dynamic(() => import('@/components/home/DataInsights'), { loading: () => <SectionLoader /> });
const WhyAdmissionHands = dynamic(() => import('@/components/home/WhyAdmissionHands'), { loading: () => <SectionLoader /> });
const TopMedicalInstitutes = dynamic(() => import('@/components/home/TopMedicalInstitutes'), { loading: () => <SectionLoader /> });
const Testimonials = dynamic(() => import('@/components/home/Testimonials'), { loading: () => <SectionLoader /> });
const FeaturedVideos = dynamic(() => import('@/components/home/FeaturedVideos'), { ssr: false, loading: () => null });

// Loading placeholder
const SectionLoader = () => (
  <div className="py-10 w-full" aria-label="Loading content">
    <div className="container-custom">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-6 bg-gray-200 rounded-lg w-1/3 animate-pulse" />
        <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const Index = async () => {
  const initialColleges = await getRecommendedColleges();
  const campusHero = await getMediaAsset('homepage_hero_campus');
  const doctorsHero = await getMediaAsset('homepage_hero_doctors');

  // Organization structured data for SEO
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "AdmissionHands",
    "url": "https://www.admissionhands.com",
    "logo": "https://lovable.dev/opengraph-image-p98pqg.png",
    "description": "Expert guidance for medical college admissions in India. Get personalized counseling for MBBS, PG (MD/MS), and SS programs.",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+919310301949",
      "contactType": "customer service"
    },
    "sameAs": [
      "https://www.facebook.com/admissionhands",
      "https://www.linkedin.com/company/admissionhands"
    ]
  };

  return (
    <div className="relative">
      <SEO
        title="AdmissionHands - MBBS & MD/MS Admission Experts | NEET Counselling Guidance"
        description="Expert guidance for MBBS, MD/MS admissions in top medical colleges. AIQ, State & Deemed counselling with real seat, fee & cutoff insights."
        keywords="medical admissions, MBBS admission, MD MS admission, NEET counselling, medical college counseling, NRI quota, AIQ counselling, MCC counselling"
        structuredData={organizationSchema}
      />

      {/* 1. Hero */}
      <Hero
        backgroundImageUrl={campusHero?.image_url}
        doctorsImageUrl={doctorsHero?.image_url}
      />

      {/* 2. How Admission Works */}
      <HowItWorks />

      {/* 3. Services */}
      <ServicesList />

      {/* 4. Data Insights */}
      <DataInsights />

      {/* 5b. Top Tier Medical Institutes */}
      <TopMedicalInstitutes initialColleges={initialColleges} />

      {/* 6. Why Admission Hands */}
      <div className="content-visibility-auto">
        <WhyAdmissionHands />
      </div>

      {/* 7. Testimonials */}
      <div className="content-visibility-auto">
        <Testimonials />
      </div>

      {/* 8. Featured Videos */}
      <div className="content-visibility-auto">
        <FeaturedVideos />
      </div>
    </div>
  );
};

export default Index;
