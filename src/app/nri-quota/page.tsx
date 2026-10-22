import React from 'react';
export const revalidate = 0;
import NRIHero from '@/components/nri/NRIHero';
import NRIEligibility from '@/components/nri/NRIEligibility';
import NRIFees from '@/components/nri/NRIFees';
import NRIProcess from '@/components/nri/NRIProcess';
import NRIFAQ from '@/components/nri/NRIFAQ';
import NRICTA from '@/components/nri/NRICTA';
import { getMediaAsset, getBlocks, getSettings, setting, getSections, resolveMetadata } from '@/lib/content';
import { creditOf } from '@/components/ui/PhotoCredit';
import { getNriContent } from '@/lib/nriContent';
import type { Metadata } from 'next';
import StructuredData, { breadcrumb, faqPage } from "@/components/seo/StructuredData";
import TelegramJoin from '@/components/engage/TelegramJoin';

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata('/nri-quota', {
    title: 'NRI Quota Medical Admissions - AdmissionHands',
    description:
      'Expert guidance for NRI quota MBBS admissions in India. Learn about eligibility, fees, required documents and admission process for NRI students.',
    keywords:
      'NRI quota, medical admissions, MBBS for NRI, NRI sponsored candidates, foreign students medical admission',
  });
}

const NRIQuotaPage = async () => {
  const [nriHeroAsset, faqBlocks, s, sections, nri] = await Promise.all([
    getMediaAsset('nri_hero'),
    getBlocks('faq_nri'),
    getSettings(),
    getSections('nri'),
    getNriContent(),
  ]);
  const faqItems = faqBlocks.map((b) => ({ q: b.title ?? '', a: b.body ?? '' }));
  // FAQ markup from the questions the page shows — it carried two hand-written ones that were
  // not on the page, which structured-data guidelines do not allow (2026-10-18).
  const faqSchema = faqPage(faqItems.filter((f) => f.q && f.a).map((f) => ({ question: f.q, answer: f.a })));

  return (
    <div className="flex flex-col flex-grow">
      <StructuredData data={[breadcrumb([{ name: "Home", path: "/" }, { name: "NRI quota", path: "/nri-quota" }]), ...(faqItems.length ? [faqSchema] : [])]} />
      
      <div className="flex-grow">
        {/* Order and visibility come from the admin (Page Content -> Page layout). */}
        {sections
          .sort([
            { key: 'hero', node: <NRIHero backgroundImageUrl={nriHeroAsset?.image_url} credit={creditOf(nriHeroAsset)} /> },
            { key: 'eligibility', node: <NRIEligibility /> },
            { key: 'process', node: <NRIProcess steps={nri.steps} /> },
            { key: 'telegram', node: <TelegramJoin placement="nri_overview" /> },
            { key: 'fees', node: <NRIFees /> },
            {
              key: 'faq',
              node: (
                <NRIFAQ
                  items={faqItems}
                  copy={{
                    title: setting(s, 'nri.faq.title'),
                    subtitle: setting(s, 'nri.faq.subtitle'),
                  }}
                />
              ),
            },
            { key: 'cta', node: <NRICTA benefits={nri.benefits} /> },
          ])
          .filter((section) => sections.shows(section.key))
          .map((section) => (
            <React.Fragment key={section.key}>{section.node}</React.Fragment>
          ))}
      </div>
    </div>
  );
};

export default NRIQuotaPage;
