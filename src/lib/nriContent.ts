/**
 * Content resolvers for the NRI quota page.
 *
 * Same shape as the MD/MS resolvers: a collection with rows takes over, an
 * empty one leaves the component rendering what it shipped with.
 */

import { getBlocks } from "@/lib/content";

const str = (v: unknown) => String(v ?? "").trim();

export interface NriStep {
  title: string;
  date: string;
  desc: string;
}

export interface NriBenefit {
  title: string;
  desc: string;
}

export async function getNriContent() {
  const [stepBlocks, benefitBlocks] = await Promise.all([
    getBlocks("nri_steps"),
    getBlocks("nri_benefits"),
  ]);

  return {
    steps: stepBlocks.length
      ? stepBlocks.map<NriStep>((b) => ({
          title: str(b.title),
          date: str(b.subtitle),
          desc: str(b.body),
        }))
      : null,
    benefits: benefitBlocks.length
      ? benefitBlocks.map<NriBenefit>((b) => ({
          title: str(b.title),
          desc: str(b.body),
        }))
      : null,
  };
}
