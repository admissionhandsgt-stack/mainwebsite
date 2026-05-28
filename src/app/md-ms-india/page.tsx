import React from 'react';
export const revalidate = 0;
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getMediaAsset } from '@/lib/mediaService';
import { InlineLeadForm } from '@/components/lead/InlineLeadForm';

// Fetch the hero image server-side
const PGHeroWrapper = async () => {
  const pgHeroAsset = await getMediaAsset('pg_hero_bg');
  const PGHeroComponent = (await import('@/components/md-ms/PGHero')).PGHero;
  return <PGHeroComponent backgroundImageUrl={pgHeroAsset?.image_url} />;
};

// Dynamic imports for code splitting
const PGWhyUs = dynamic(() => import('@/components/md-ms/PGWhyUs').then(m => m.PGWhyUs));
const PGOverview = dynamic(() => import('@/components/md-ms/PGOverview').then(m => m.PGOverview));
const PGAdmissionProcess = dynamic(() => import('@/components/md-ms/PGAdmissionProcess').then(m => m.PGAdmissionProcess));
const PGSpecializations = dynamic(() => import('@/components/md-ms/PGSpecializations').then(m => m.PGSpecializations));
const PGQuotaSystem = dynamic(() => import('@/components/md-ms/PGQuotaSystem').then(m => m.PGQuotaSystem));
const PGCollegesList = dynamic(() => import('@/components/md-ms/PGCollegesList').then(m => m.PGCollegesList), {
  loading: () => <div className="animate-pulse h-[500px] bg-slate-100 dark:bg-slate-900 rounded-xl container-custom my-12" />,
  ssr: false,
});
const PGDocumentChecklist = dynamic(() => import('@/components/md-ms/PGDocumentChecklist').then(m => m.PGDocumentChecklist));
const PGCutoffInsights = dynamic(() => import('@/components/md-ms/PGCutoffInsights').then(m => m.PGCutoffInsights));
const PGFAQ = dynamic(() => import('@/components/md-ms/PGFAQ').then(m => m.PGFAQ));
const PGStickyMobileBar = dynamic(() => import('@/components/md-ms/PGStickyMobileBar').then(m => m.PGStickyMobileBar), { ssr: false });

export const metadata: Metadata = {
  title: 'MD/MS Admission in India 2026 | NEET PG Counselling – 250+ Colleges | Admission Hands',
  description: 'Complete platform for MD/MS admissions in India. Expert NEET PG counselling with 5-year cutoff intelligence, dual-quota management, strategic choice filling across 250+ PG medical colleges.',
  keywords: 'MD MS admission India, NEET PG counselling, PG medical colleges, Government medical colleges, Deemed university PG, NEET PG cutoff, AIQ State Quota PG, MD MS seat counselling',
};

export default function PGMDMSPage() {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="flex-grow relative z-0">
        {/* 1. Cinematic Hero */}
        {/* @ts-ignore */}
        <PGHeroWrapper />

        {/* 2. Why Admission Hands — Differentiators */}
        <PGWhyUs />

        {/* 3. PG Admission Overview */}
        <PGOverview />

        {/* 4. Interactive Admission Journey */}
        <PGAdmissionProcess />

        {/* 5. Branch Explorer */}
        <PGSpecializations />

        {/* 6. Quota System — Dark Section */}
        <PGQuotaSystem />

        {/* 7. College Showcase */}
        <div id="colleges" className="scroll-mt-24">
          <PGCollegesList />
        </div>

        {/* 8. Document Readiness Checklist */}
        <PGDocumentChecklist />

        {/* 9. Cutoff Intelligence */}
        <PGCutoffInsights />

        {/* 10. FAQ */}
        <PGFAQ />

        {/* 11. Final CTA Banner */}
        <div id="pg-intake-form" className="container-custom mb-16 mt-4 scroll-mt-24">
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 dark:from-slate-950 dark:to-blue-950/80 rounded-xl p-6 md:p-10 text-white shadow-2xl relative overflow-hidden border border-transparent dark:border-slate-800">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-black mb-3 leading-tight tracking-tight">
                  Ready to Secure Your Dream PG Seat?
                </h2>
                <p className="text-blue-100/70 text-sm md:text-base mb-5 leading-relaxed font-bold">
                  Navigate the complex counselling process with data-driven strategies and dedicated 1-on-1 mentorship.
                </p>
                <ul className="space-y-2">
                  {['5-year cutoff intelligence engine', 'AIQ + State + Deemed quota management', 'Zero document rejection guarantee', 'Round-by-round upgrade strategy'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="font-bold text-blue-50 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="w-full max-w-md mx-auto relative z-10">
                <InlineLeadForm source="PG MD/MS Bottom CTA" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <PGStickyMobileBar />
    </div>
  );
}
