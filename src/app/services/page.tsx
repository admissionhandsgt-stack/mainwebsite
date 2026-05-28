import React from 'react';
import ServicesClient from './ServicesClient';
import { getMediaAsset } from '@/lib/mediaService';
import { Metadata } from 'next';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'NEET Counselling Services & Medical Admission Solutions | AdmissionHands',
  description: 'Comprehensive, data-driven counselling services for MBBS & MD/MS admissions. Strategic choice filling, documentation verification, seat upgrade guidance.',
  keywords: 'NEET counseling services, medical admission guidance, choice filling strategy, documentation check, seat upgrade',
};

export default async function ServicesPage() {
  const serviceHero = await getMediaAsset('services_hero');
  const aboutHero = await getMediaAsset('about_hero');
  
  const heroImages: string[] = [];
  if (serviceHero?.image_url) heroImages.push(serviceHero.image_url);
  if (aboutHero?.image_url) heroImages.push(aboutHero.image_url);
  
  return <ServicesClient heroImages={heroImages} />;
}
