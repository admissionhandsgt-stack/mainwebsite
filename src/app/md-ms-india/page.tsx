import React from 'react';
export const revalidate = 0;
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getMediaAsset, getBlocks, getSettings, setting, getSections, resolveMetadata } from '@/lib/content';
import { getPgContent } from '@/lib/pgContent';
import { getDataStats } from '@/lib/dataStats';
import { InlineLeadForm } from '@/components/lead/InlineLeadForm';
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";

// Fetch the hero image server-side
const PGHeroWrapper = async () => {
  const pgHeroAsset = await getMediaAsset('pg_hero_bg');
  const PGHeroComponent = (await import('@/components/md-ms/PGHero')).PGHero;
  // Numbers that describe the data come from the data — see src/lib/dataStats.ts.
  const stats = await getDataStats();
  return (
    <PGHeroComponent
      backgroundImageUrl={pgHeroAsset?.image_url}
      stats={{ pgColleges: stats.pgColleges, pgRanks: stats.pgRanks, pgBranches: stats.pgBranches }}
    />
  );
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

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata('/md-ms-india', {
    title: 'MD/MS Admission in India 2026 | NEET PG Counselling & Seat Predictor | Admission Hands',
    description: 'MD/MS admissions in India, checked against 2.3 lakh published NEET PG closing ranks across 2,168 colleges. Seat predictor, round-by-round movement, dual-quota and choice-filling guidance.',
    keywords: 'MD MS admission India, NEET PG counselling, PG medical colleges, Government medical colleges, Deemed university PG, NEET PG cutoff, AIQ State Quota PG, MD MS seat counselling',
  });
}

// The FAQ is edited in the admin under "Page Content", so it reads its own data.
const PGFAQSection = async () => {
  const [blocks, s] = await Promise.all([getBlocks('faq_pg'), getSettings()]);
  return (
    <PGFAQ
      items={blocks.map((b) => ({
        question: b.title ?? '',
        answer: b.body ?? '',
        category: b.subtitle ?? '',
      }))}
      copy={{
        eyebrow: setting(s, 'pg.faq.eyebrow'),
        title: setting(s, 'pg.faq.title'),
        subtitle: setting(s, 'pg.faq.subtitle'),
      }}
    />
  );
};

export default async function PGMDMSPage() {
  const [s, sections, pg] = await Promise.all([
    getSettings(),
    getSections('pg'),
    getPgContent(),
  ]);

  // The closing banner's copy lives in settings; the bullets are four keys so
  // an editor can change them without touching a list format.
  const ctaBullets = [1, 2, 3, 4]
    .map((i) => setting(s, `pg.cta.point_${i}`))
    .filter(Boolean);

  const leadForm = (
    <div id="pg-intake-form" className="container-custom mb-16 mt-4 scroll-mt-24">
      <div className="bg-gradient-to-br from-slate-900 to-cyan-950 dark:from-slate-950 dark:to-cyan-950/80 rounded-xl p-6 md:p-10 text-white shadow-2xl relative overflow-hidden border border-transparent dark:border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
        <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-black mb-3 leading-tight tracking-tight">
              {setting(s, 'pg.cta.title', 'Ready to Secure Your Dream PG Seat?')}
            </h2>
            <p className="text-cyan-100/70 text-sm md:text-base mb-5 leading-relaxed font-bold">
              {setting(
                s,
                'pg.cta.body',
                'Navigate the complex counselling process with data-driven strategies and dedicated 1-on-1 mentorship.',
              )}
            </p>
            <ul className="space-y-2">
              {(ctaBullets.length
                ? ctaBullets
                : [
                    'Every seat checked against published closing ranks',
                    'AIQ + State + Deemed quota management',
                    'Document audit against state-specific norms',
                    'Round-by-round upgrade strategy',
                  ]
              ).map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-bold text-cyan-50 text-sm">{item}</span>
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
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-950 flex flex-col">
      <StructuredData
        data={[
          webPage({
            name: "MD/MS Admission in India",
            description:
              "NEET PG counselling, closing ranks, fees and seat details across 2,168 PG medical colleges.",
            path: "/md-ms-india",
          }),
          breadcrumb([{ name: "Home", path: "/" }, { name: "MD/MS India", path: "/md-ms-india" }]),
        ]}
      />
      <div className="flex-grow relative z-0">
        {/* Order and visibility come from the admin (Page Content -> Page layout). */}
        {sections
          .sort([
            /* @ts-ignore — an async server component in a list */
            { key: 'hero', node: <PGHeroWrapper /> },
            { key: 'why_us', node: <PGWhyUs items={pg.whyUs} /> },
            { key: 'overview', node: <PGOverview items={pg.overview} /> },
            { key: 'process', node: <PGAdmissionProcess items={pg.steps} /> },
            { key: 'specializations', node: <PGSpecializations /> },
            { key: 'quota', node: <PGQuotaSystem items={pg.quotas} /> },
            {
              key: 'colleges',
              node: (
                <div id="colleges" className="scroll-mt-24">
                  <PGCollegesList />
                </div>
              ),
            },
            { key: 'documents', node: <PGDocumentChecklist items={pg.documents} /> },
            { key: 'cutoffs', node: <PGCutoffInsights items={pg.cutoffQuotas} /> },
            /* @ts-ignore — an async server component in a list */
            { key: 'faq', node: <PGFAQSection /> },
            { key: 'lead_form', node: leadForm },
          ])
          .filter((section) => sections.shows(section.key))
          .map((section) => (
            <React.Fragment key={section.key}>{section.node}</React.Fragment>
          ))}
      </div>
      <PGStickyMobileBar />
    </div>
  );
}
