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

  // Carry the credit with the file. These are Wikimedia photographs under
  // CC BY-SA, which requires the photographer to be named wherever the picture
  // appears — a credit sitting only in `media_assets` is not a credit.
  const byKey = new Map(mediaList.map((m) => [m.media_key, m]));
  const heroImages = heroKeys
    .map((k) => byKey.get(k))
    .filter((m) => m?.image_url && m.image_url !== 'none')
    .map((m) => ({
      src: m!.image_url!,
      subject: m!.subject,
      credit: m!.attribution,
      license: m!.license,
    }));

  const phoneNumber = contact?.phoneNumber ?? "+919873133846";

  return (
    <DeemedUniversitiesClient 
      heroImages={heroImages}
      phoneNumber={phoneNumber}
    />
  );
}
