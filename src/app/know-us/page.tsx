import React from 'react';
import KnowUsClient from './KnowUsClient';
import { getMediaAsset } from '@/lib/mediaService';
import { Metadata } from 'next';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'About Us & Expert Medical Counselling Team | AdmissionHands',
  description: 'Learn about AdmissionHands - India\'s leading independent medical admission advisory. Read about our analytics-driven counselling services, our core values of integrity and transparency, and how to reach our team.',
  keywords: 'about admission hands, medical admission expert, NEET counselling advisory, independent medical consultancy, noda medical admissions office',
};

export default async function KnowUsPage() {
  const knowUsHero = await getMediaAsset('knowus_hero');
  return <KnowUsClient backgroundImageUrl={knowUsHero?.image_url} />;
}
