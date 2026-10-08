import React from "react";
export const revalidate = 0;

import dynamic from "next/dynamic";
import Hero from "@/components/Hero";
import Reveal from "@/components/ui/Reveal";
import CtaBand from "@/components/ui/CtaBand";
import LeadCapture from "@/components/lead/LeadCapture";
import StructuredData, { organization, website } from "@/components/seo/StructuredData";
import type { Metadata } from "next";
import { resolveMetadata } from "@/lib/content";
import { getRecommendedColleges } from "@/lib/colleges";
import { getMediaAsset, getSettings, setting, getBlocks, getSections, getContactInfo } from "@/lib/content";
import { backdropPlaceholder } from "@/lib/backdrop";

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

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/", {
    title: "AdmissionHands - MBBS & MD/MS Admission Experts | NEET Counselling Guidance",
    description:
      "Expert guidance for MBBS, MD/MS admissions in top medical colleges. AIQ, State & Deemed counselling with real seat, fee & cutoff insights.",
    keywords:
      "medical admissions, MBBS admission, MD MS admission, NEET counselling, medical college counseling, NRI quota, AIQ counselling, MCC counselling",
  });
}

const Index = async () => {
  const [initialColleges, campusHero, doctorsHero, s, serviceBlocks, stepBlocks, whyBlocks,
    testimonialBlocks, sections] =
    await Promise.all([
      getRecommendedColleges(),
      getMediaAsset('homepage_hero_campus'),
      getMediaAsset('homepage_hero_doctors'),
      getSettings(),
      getBlocks('services'),
      getBlocks('steps_ug'),
      getBlocks('why_us'),
      getBlocks('testimonials'),
      getSections('home'),
    ]);

  // The campus backdrop's first frame, inline — see lib/backdrop.ts.
  const campusPlaceholder = campusHero?.image_url ? await backdropPlaceholder(campusHero.image_url) : null;

  // Everything below reads from the CMS with the shipped copy as the fallback,
  // so an empty table renders the site exactly as it did before.
  const heroCopy = {
    badgeLeft: setting(s, 'home.hero.badge_left'),
    badgeRight: setting(s, 'home.hero.badge_right'),
    headline: setting(s, 'home.hero.headline'),
    headlineAccent: setting(s, 'home.hero.headline_accent'),
    subtitle: setting(s, 'home.hero.subtitle'),
    ctaPrimary: setting(s, 'home.hero.cta_primary'),
    ctaSecondary: setting(s, 'home.hero.cta_secondary'),
  };


  const services = serviceBlocks.map((b) => ({
    title: b.title ?? '',
    description: b.body ?? b.subtitle ?? '',
    icon: b.icon,
    href: b.linkUrl,
    cta: b.linkLabel,
  }));

  const steps = stepBlocks.map((b) => ({
    title: b.title ?? '',
    description: b.body ?? '',
    icon: b.icon,
  }));

  const reasons = whyBlocks.map((b) => ({
    title: b.title ?? '',
    description: b.body ?? '',
    icon: b.icon,
  }));

  // Section headings, each falling back to the shipped copy when unset.
  const servicesCopy = {
    eyebrow: setting(s, 'home.services.eyebrow'),
    title: setting(s, 'home.services.title'),
    subtitle: setting(s, 'home.services.subtitle'),
  };

  const stepsCopy = {
    eyebrow: setting(s, 'home.steps.eyebrow'),
    title: setting(s, 'home.steps.title'),
    subtitle: setting(s, 'home.steps.subtitle'),
    button: setting(s, 'home.steps.button'),
  };

  const whyCopy = {
    eyebrow: setting(s, 'home.why.eyebrow'),
    title: setting(s, 'home.why.title'),
    titleAccent: setting(s, 'home.why.title_accent'),
    subtitle: setting(s, 'home.why.subtitle'),
    points: [1, 2, 3, 4].map((i) => setting(s, `home.why.point_${i}`)).filter(Boolean),
  };

  const testimonialsCopy = {
    eyebrow: setting(s, 'home.testimonials.eyebrow'),
    title: setting(s, 'home.testimonials.title'),
    titleAccent: setting(s, 'home.testimonials.title_accent'),
    subtitle: setting(s, 'home.testimonials.subtitle'),
  };

  const testimonials = testimonialBlocks.map((b) => ({
    name: b.title ?? '',
    course: b.subtitle ?? '',
    outcome: String(b.data?.outcome ?? ''),
    text: b.body ?? '',
    rating: Number(b.data?.rating ?? 5),
  }));

  // The site name Google prints above a result, and the brand panel, come
  // from these two — read from the homepage only. See StructuredData.tsx.
  const contact = await getContactInfo();
  const social = ['social.facebook', 'social.instagram', 'social.youtube', 'social.linkedin', 'social.twitter']
    .map((k) => setting(s, k))
    .filter((u) => u.startsWith('https://'))
    // Share-tracking parameters ("?igsh=…") are not part of a profile's address.
    .map((u) => u.split('?')[0]);
  const siteSchema = [
    organization({ phone: contact?.phoneNumber, email: contact?.email }, social),
    website(social),
  ];

  return (
    <div className="relative">
<StructuredData data={siteSchema} />

      {sections.shows('hero') && (
        <Hero
          backgroundImageUrl={campusHero?.image_url}
          backgroundPlaceholder={campusPlaceholder}
          backgroundSubject={campusHero?.subject}
          backgroundCredit={campusHero?.attribution}
          backgroundLicense={campusHero?.license}
          doctorsImageUrl={doctorsHero?.image_url}
          copy={heroCopy}
        />
      )}

      {/* Order and visibility come from the admin (Page Content -> Page layout).
          A section with no row is shown, so adding one in code needs no row. */}
      {sections
        .sort([
          { key: 'how_it_works', node: <Reveal><HowItWorks steps={steps} copy={stepsCopy} /></Reveal> },
          { key: 'services', node: <Reveal><ServicesList services={services} copy={servicesCopy} /></Reveal> },
          { key: 'data_insights', node: <Reveal><DataInsights /></Reveal> },
          {
            key: 'top_institutes',
            node: <Reveal><TopMedicalInstitutes initialColleges={initialColleges} /></Reveal>,
          },
          {
            key: 'cta_band',
            node: (
              <Reveal>
                <CtaBand
                  title={setting(s, 'home.cta.title', 'One wrong choice order costs a year')}
                  body={setting(
                    s,
                    'home.cta.body',
                    'A safe seat placed below a stretch one is how students lose a season. Our counsellors order your preference list against two years of closing ranks, then stay with you through every round.',
                  )}
                  image="/assets/images/hero/medical-admission-counselling-session.avif"
                  primaryLabel={setting(s, 'home.cta.button', 'Book a free call')}
                />
              </Reveal>
            ),
          },
          {
            key: 'why_us',
            node: (
              <div className="content-visibility-auto">
                <Reveal><WhyAdmissionHands reasons={reasons} copy={whyCopy} /></Reveal>
              </div>
            ),
          },
          {
            key: 'testimonials',
            node: (
              <div className="content-visibility-auto">
                <Reveal><Testimonials testimonials={testimonials} copy={testimonialsCopy} /></Reveal>
              </div>
            ),
          },
          {
            key: 'enquiry',
            node: (
              <LeadCapture
                source="Homepage enquiry"
                level="ug"
                title={setting(s, 'home.enquiry.title')}
                body={setting(s, 'home.enquiry.body')}
                points={[1, 2, 3, 4].map((i) => setting(s, `home.enquiry.point_${i}`))}
              />
            ),
          },
          {
            key: 'videos',
            node: (
              <div className="content-visibility-auto">
                <FeaturedVideos />
              </div>
            ),
          },
        ])
        .filter((section) => sections.shows(section.key))
        .map((section) => (
          <React.Fragment key={section.key}>{section.node}</React.Fragment>
        ))}

    </div>
  );
};

export default Index;
