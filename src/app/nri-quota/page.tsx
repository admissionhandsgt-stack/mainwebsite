import React from 'react';
export const revalidate = 0;
import NRIHero from '@/components/nri/NRIHero';
import NRIEligibility from '@/components/nri/NRIEligibility';
import NRIFees from '@/components/nri/NRIFees';
import NRIProcess from '@/components/nri/NRIProcess';
import NRIFAQ from '@/components/nri/NRIFAQ';
import NRICTA from '@/components/nri/NRICTA';
import SEO from '@/components/SEO';
import { getMediaAsset, getBlocks, getSettings, setting, getSections, resolveMetadata } from '@/lib/content';
import { creditOf } from '@/components/ui/PhotoCredit';
import { getNriContent } from '@/lib/nriContent';
import type { Metadata } from 'next';
import StructuredData, { breadcrumb } from "@/components/seo/StructuredData";

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
  // FAQ structured data for better SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is NRI Quota in medical admissions?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "NRI Quota is a special reservation in medical colleges for Non-Resident Indians, Persons of Indian Origin (PIOs), Overseas Citizens of India (OCIs), and their dependents. It typically offers 15% of seats across private and deemed universities."
        }
      },
      {
        "@type": "Question",
        "name": "Who is eligible for NRI Quota?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "NRIs, OCIs, PIOs, and candidates sponsored by NRIs (typically close relatives) are eligible. The candidate must have completed 10+2 with Physics, Chemistry, and Biology, and must have qualified NEET-UG."
        }
      }
    ]
  };

  const [nriHeroAsset, faqBlocks, s, sections, nri] = await Promise.all([
    getMediaAsset('nri_hero'),
    getBlocks('faq_nri'),
    getSettings(),
    getSections('nri'),
    getNriContent(),
  ]);
  const faqItems = faqBlocks.map((b) => ({ q: b.title ?? '', a: b.body ?? '' }));

  return (
    <div className="flex flex-col flex-grow">
<SEO structuredData={faqSchema} />
      <StructuredData data={breadcrumb([{ name: "Home", path: "/" }, { name: "NRI quota", path: "/nri-quota" }])} />
      
      <div className="flex-grow">
        {/* Order and visibility come from the admin (Page Content -> Page layout). */}
        {sections
          .sort([
            { key: 'hero', node: <NRIHero backgroundImageUrl={nriHeroAsset?.image_url} credit={creditOf(nriHeroAsset)} /> },
            { key: 'eligibility', node: <NRIEligibility /> },
            { key: 'process', node: <NRIProcess steps={nri.steps} /> },
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
