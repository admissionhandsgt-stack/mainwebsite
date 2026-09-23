import type { Metadata } from "next";
import { resolveMetadata, getMediaAsset } from "@/lib/content";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { getPredictorFacets } from "@/lib/predictorFacets";
import PredictorClient from "@/components/predictor/PredictorClient";
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";

export const dynamic = "force-dynamic";

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/mbbs-india/predictor", {
    title: "NEET UG College Predictor | AdmissionHands",
    description:
      "Enter your NEET UG rank and see every MBBS seat it reaches, split into safe, likely, possible and stretch — each backed by the published closing rank it came from.",
  });
}

export default async function UgPredictorPage() {
  // The hero came through a hardcoded path that no file sat at, so the page
  // shipped with a 400 where its image should be. It is a CMS asset like
  // every other hero — resolve it, and the admin can change it too.
  const [facets, heroImage] = await Promise.all([
    getPredictorFacets("ug"),
    getMediaAsset("mbbs_hero_campus"),
  ]);


  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          webPage({
            name: "NEET UG College Predictor",
            description:
              "Enter your NEET UG rank and see every MBBS seat it reaches, backed by published closing ranks.",
            path: "/mbbs-india/predictor",
          }),
          breadcrumb([{ name: "Home", path: "/" }, { name: "MBBS India", path: "/mbbs-india" }, { name: "SeatPredict", path: "/mbbs-india/predictor" }]),
        ]}
      />

      <PredictorClient
        level="ug"
        states={facets.states}
        categories={facets.categories}
        branches={facets.branches}
        ownerships={facets.ownerships}
      />
    </main>
  );
}
