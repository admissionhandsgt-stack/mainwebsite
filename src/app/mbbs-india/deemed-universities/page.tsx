import React from 'react';
import DeemedUniversitiesClient from './DeemedUniversitiesClient';
import { resolveMetadata, getMediaAssets } from '@/lib/content';
import { getContactInfo } from '@/lib/content';
import { Metadata } from 'next';

export const revalidate = 0;

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata('/mbbs-india/deemed-universities', {
    title: "Deemed Universities for MBBS in India 2026 | Admission Guide",
    description: "Complete list of deemed medical universities in India for MBBS admission. Get expert counseling, cutoffs, and fees guide for 2026.",
    keywords: (["deemed medical universities", "MBBS deemed universities", "deemed university fees", "deemed university cutoffs"]).join(', '),
  });
}

export default async function DeemedUniversitiesPage() {
  const heroKeys = ['deemed_campus_1', 'college_campus_2', 'college_campus_3', 'college_campus_4'];

  // One round trip for every image plus one for the contact row, in parallel.
  // The loop this replaces made four sequential trips through the tunnel on
  // every request, which was most of the page's 3.7s response time.
  const [mediaList, contact] = await Promise.all([
    getMediaAssets(),
    getContactInfo(),
  ]);

  const byKey = new Map(mediaList.map((m) => [m.media_key, m.image_url]));
  const heroImages = heroKeys
    .map((k) => byKey.get(k))
    .filter((u): u is string => Boolean(u) && u !== 'none');

  const phoneNumber = contact?.phoneNumber ?? "+919873133846";

  return (
    <DeemedUniversitiesClient 
      heroImages={heroImages}
      phoneNumber={phoneNumber}
    />
  );
}
