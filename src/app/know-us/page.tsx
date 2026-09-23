import React from 'react';
import KnowUsClient from './KnowUsClient';
import { getMediaAsset, resolveMetadata } from '@/lib/content';
import { Metadata } from 'next';
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";

export const revalidate = 0;

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata('/know-us', {
    title: 'About Us & Expert Medical Counselling Team | AdmissionHands',
    description: 'AdmissionHands is an independent medical admission advisory. Meet the team, read how we work from published counselling data, and how to reach us.',
    keywords: 'about admission hands, medical admission expert, NEET counselling advisory, independent medical consultancy, noda medical admissions office',
  });
}

export default async function KnowUsPage() {
  const knowUsHero = await getMediaAsset('knowus_hero');
  return (
    <>
      <StructuredData
        data={[
          webPage({ name: "About AdmissionHands", description: "Who we are and how we work through NEET counselling.", path: "/know-us" }),
          breadcrumb([{ name: "Home", path: "/" }, { name: "Know us", path: "/know-us" }]),
        ]}
      />
      <KnowUsClient backgroundImageUrl={knowUsHero?.image_url} />
    </>
  );
}
