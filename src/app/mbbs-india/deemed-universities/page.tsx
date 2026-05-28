import React from 'react';
import DeemedUniversitiesClient from './DeemedUniversitiesClient';
import { getMediaAsset } from '@/lib/mediaService';
import { supabase } from '@/integrations/supabase/client';
import { Metadata } from 'next';

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Deemed Universities for MBBS in India 2026 | Admission Guide",
  description: "Complete list of deemed medical universities in India for MBBS admission. Get expert counseling, cutoffs, and fees guide for 2026.",
  keywords: ["deemed medical universities", "MBBS deemed universities", "deemed university fees", "deemed university cutoffs"],
};

export default async function DeemedUniversitiesPage() {
  // Fetch hero images server-side
  const heroKeys = ['deemed_campus_1', 'college_campus_2', 'college_campus_3', 'college_campus_4'];
  const heroImages: string[] = [];
  try {
    for (const key of heroKeys) {
      const asset = await getMediaAsset(key);
      if (asset?.image_url) heroImages.push(asset.image_url);
    }
  } catch (e) {
    console.error("Error fetching deemed universities hero assets:", e);
  }

  // Fetch contact info server-side
  let phoneNumber = "+919873133846";
  try {
    const { data } = await supabase.from('contact_info').select('phone_number').single();
    if (data?.phone_number) {
      phoneNumber = data.phone_number;
    }
  } catch (e) {
    console.error("Error fetching contact info server-side:", e);
  }

  return (
    <DeemedUniversitiesClient 
      heroImages={heroImages}
      phoneNumber={phoneNumber}
    />
  );
}
