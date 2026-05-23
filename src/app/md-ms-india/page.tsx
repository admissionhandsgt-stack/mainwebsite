import React from 'react';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { InlineLeadForm } from '@/components/lead/InlineLeadForm';

// Dynamically import heavy sections
const PGHero = dynamic(() => import('@/components/md-ms/PGHero').then(m => m.PGHero), { ssr: true });
const PGOverview = dynamic(() => import('@/components/md-ms/PGOverview').then(m => m.PGOverview));
const PGQuotaSystem = dynamic(() => import('@/components/md-ms/PGQuotaSystem').then(m => m.PGQuotaSystem));
const PGAdmissionProcess = dynamic(() => import('@/components/md-ms/PGAdmissionProcess').then(m => m.PGAdmissionProcess));
const PGSpecializations = dynamic(() => import('@/components/md-ms/PGSpecializations').then(m => m.PGSpecializations));
const PGCollegesList = dynamic(() => import('@/components/md-ms/PGCollegesList').then(m => m.PGCollegesList), {
  loading: () => <div className="animate-pulse h-[600px] bg-slate-100 rounded-3xl container-custom my-12" />,
  ssr: false,
});
const PGFAQ = dynamic(() => import('@/components/md-ms/PGFAQ').then(m => m.PGFAQ));

export const metadata: Metadata = {
  title: 'MD/MS Admission in India 2026 | NEET PG Counseling – 250+ Colleges',
  description: 'Complete platform for MD/MS admissions in India. Browse 250+ PG medical colleges across 29 states. Filter by state, college type. Get expert NEET PG counseling guidance.',
  keywords: 'MD MS admission India, NEET PG counseling, PG medical colleges, Government medical colleges, Deemed university PG, Management quota MD MS',
};

export default function PGMDMSPage() {
  return (
    <div className="bg-slate-50 flex flex-col">
      <div className="flex-grow relative z-0">
        {/* Hero */}
        <PGHero />

        {/* Info Sections */}
        <PGOverview />
        <PGQuotaSystem />
        <PGAdmissionProcess />
        <PGSpecializations />

        {/* College List — Main Feature */}
        <div id="colleges" className="scroll-mt-24">
          <PGCollegesList />
        </div>

        {/* Bottom CTA */}
        <div className="container-custom mb-20 mt-4">
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight tracking-tight">
                  Need Expert Help Securing Your PG Seat?
                </h2>
                <p className="text-blue-100/60 text-lg mb-8 leading-relaxed">
                  Navigate the complex counseling process with data-driven strategies and personalized support.
                </p>
                <ul className="space-y-3">
                  {['Choice filling strategy', 'Documentation support', 'Seat upgrade guidance'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="font-semibold text-blue-50 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <InlineLeadForm source="PG Bottom Form" />
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <PGFAQ />
      </div>


    </div>
  );
}
