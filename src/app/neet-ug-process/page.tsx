import React from 'react';
import NeetUgProcessClient from './NeetUgProcessClient';
import { getMediaAsset } from '@/lib/content';
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";

export const revalidate = 0;


export default async function NeetUgProcessPage() {
  // Parallel: three sequential awaits meant three round trips through the tunnel.
  const [heroAsset, examAsset, collegeAsset] = await Promise.all([
    getMediaAsset('neet_hero'),
    getMediaAsset('neet_exam'),
    getMediaAsset('neet_medical_college'),
  ]);

  return (
    <>
      <StructuredData
        data={[
          webPage({
            name: "NEET UG Counselling Process",
            description: "The NEET UG counselling process, round by round.",
            path: "/neet-ug-process",
          }),
          breadcrumb([{ name: "Home", path: "/" }, { name: "NEET UG process", path: "/neet-ug-process" }]),
        ]}
      />
    <NeetUgProcessClient 
      heroImageUrl={heroAsset?.image_url}
      examImageUrl={examAsset?.image_url}
      collegeImageUrl={collegeAsset?.image_url}
    />
    </>
  );
}
