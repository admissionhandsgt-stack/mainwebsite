import type { Metadata } from "next";
import { resolveMetadata } from "@/lib/content";
import { getAllFacets, STREAMS } from "@/lib/predictorFacets";
import PredictorClient from "@/components/predictor/PredictorClient";
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";

export const dynamic = "force-dynamic";

/**
 * One tool for every NEET stream.
 *
 * MBBS, BDS and MD/MS were three separate pages asking the identical question
 * — "what does my rank reach" — with three separate URLs splitting the search
 * traffic for the one phrase people actually type. The course is a filter, not
 * a different product.
 *
 * The URL is the search term. "NEET College Predictor" is what candidates
 * search; a path that matches it is worth more than a tidier taxonomy.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/neet-college-predictor", {
    // Kept under ~60 and ~155 characters: past that Google truncates, and a
    // truncated title loses the phrase it was written to rank for.
    title: "NEET College Predictor 2026 — MBBS, BDS & MD/MS by Rank",
    description:
      "Enter your NEET rank and see the colleges it reaches — MBBS, BDS and MD/MS, each placed against the round it actually closed in.",
    keywords: [
      "NEET college predictor",
      "NEET UG college predictor",
      "NEET PG college predictor",
      "MBBS college predictor",
      "BDS college predictor",
      "MD MS seat predictor",
      "NEET rank wise college",
      "medical college predictor India",
    ].join(", "),
  });
}

export default async function NeetCollegePredictorPage() {
  const facets = await getAllFacets();

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          webPage({
            name: "NEET College Predictor",
            description:
              "Enter your NEET rank and see the MBBS, BDS or MD/MS seats it reaches, each backed by the published closing rank it came from.",
            path: "/neet-college-predictor",
          }),
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NEET College Predictor", path: "/neet-college-predictor" },
          ]),
          // No WebApplication: Google reads it as a software listing, which
          // requires a rating or reviews we do not have (and must not invent) —
          // Semrush's Site Audit counted it invalid. WebPage says what this is.
        ]}
      />

      <PredictorClient streams={STREAMS} facets={facets} />
    </main>
  );
}
