import React from 'react';
import ServicesClient from './ServicesClient';
import { getMediaAsset, resolveMetadata } from '@/lib/content';
import { Metadata } from 'next';
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";

export const revalidate = 0;

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata('/services', {
    title: 'NEET Counselling Services & Medical Admission Solutions | AdmissionHands',
    description: 'Comprehensive, data-driven counselling services for MBBS & MD/MS admissions. Strategic choice filling, documentation verification, seat upgrade guidance.',
    keywords: 'NEET counseling services, medical admission guidance, choice filling strategy, documentation check, seat upgrade',
  });
}

export default async function ServicesPage() {
  // Parallel: two sequential awaits meant two round trips through the tunnel.
  const [serviceHero, aboutHero] = await Promise.all([
    getMediaAsset('services_hero'),
    getMediaAsset('about_hero'),
  ]);
  
  const heroImages: string[] = [];
  if (serviceHero?.image_url) heroImages.push(serviceHero.image_url);
  if (aboutHero?.image_url) heroImages.push(aboutHero.image_url);
  
  return (
    <>
      <StructuredData
        data={[
          webPage({ name: "NEET Counselling Services", description: "Counselling services for MBBS and MD/MS admissions, built on published closing ranks.", path: "/services" }),
          breadcrumb([{ name: "Home", path: "/" }, { name: "Services", path: "/services" }]),
        ]}
      />
      <ServicesClient heroImages={heroImages} />
    </>
  );
}
