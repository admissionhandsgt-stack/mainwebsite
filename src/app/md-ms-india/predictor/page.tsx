import type { Metadata } from "next";
import { resolveMetadata } from '@/lib/content';
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
  return resolveMetadata('/md-ms-india/predictor', {
    title: "NEET PG College Predictor | AdmissionHands",
    description: "Enter your NEET PG rank and see every MD/MS seat it reaches, split into safe, likely, possible and stretch — each backed by the published closing rank it came from.",
  });
}

export default async function PredictorPage() {
  const facets = await getPredictorFacets("pg");

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          webPage({
            name: "NEET PG College Predictor",
            description:
              "Enter your NEET PG rank and see every MD/MS seat it reaches, backed by published closing ranks.",
            path: "/md-ms-india/predictor",
          }),
          breadcrumb([{ name: "Home", path: "/" }, { name: "MD/MS India", path: "/md-ms-india" }, { name: "SeatPredict", path: "/md-ms-india/predictor" }]),
        ]}
      />

      <PredictorClient
        level="pg"
        states={facets.states}
        categories={facets.categories}
        branches={facets.branches}
        ownerships={facets.ownerships}
      />
    </main>
  );
}
