import React from 'react';
import NeetUgProcessClient from './NeetUgProcessClient';
import TelegramJoin from "@/components/engage/TelegramJoin";
import { getMediaAsset } from '@/lib/content';
import { pageCopy } from '@/lib/pageCopy';
import { getUgPhases } from '@/lib/ugProcessContent';
import { creditOf } from '@/components/ui/PhotoCredit';
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";

export const revalidate = 0;


export default async function NeetUgProcessPage() {
  // Parallel: three sequential awaits meant three round trips through the tunnel.
  // Words from Admin → Content ("Page: NEET UG process"); the steps from the
  // ug_process_steps collection (Sections & lists).
  const [heroAsset, examAsset, collegeAsset, copy, phases] = await Promise.all([
    getMediaAsset('neet_hero'),
    getMediaAsset('neet_exam'),
    getMediaAsset('neet_medical_college'),
    pageCopy('page.neet_ug_process'),
    getUgPhases(),
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
      heroCredit={creditOf(heroAsset)}
      examCredit={creditOf(examAsset)}
      collegeCredit={creditOf(collegeAsset)}
      copy={copy}
      phases={phases}
    />
    <TelegramJoin placement="neet_ug_process" />
    </>
  );
}
