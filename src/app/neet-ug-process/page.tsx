import React from 'react';
import NeetUgProcessClient from './NeetUgProcessClient';
import { getMediaAsset } from '@/lib/mediaService';
import { Metadata } from 'next';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'NEET UG MBBS Admission Process 2026 | Step-by-Step Counselling Guide',
  description: 'Understand the complete NEET UG admission lifecycle for MBBS in India. Step-by-step guidance from exam, registration, choice filling to physical reporting.',
  keywords: 'NEET UG process, MBBS admission guide, medical counselling steps, MCC registration, state quota choice filling',
};

export default async function NeetUgProcessPage() {
  const heroAsset = await getMediaAsset('neet_hero');
  const examAsset = await getMediaAsset('neet_exam');
  const collegeAsset = await getMediaAsset('neet_medical_college');

  return (
    <NeetUgProcessClient 
      heroImageUrl={heroAsset?.image_url}
      examImageUrl={examAsset?.image_url}
      collegeImageUrl={collegeAsset?.image_url}
    />
  );
}
